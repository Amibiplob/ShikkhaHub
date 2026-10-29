import { test, expect, login } from './fixture';
import { nativeChrome } from './native-chrome';
import { withoutInputs, enterClass, openMeetingOption } from './classroom-actions';
import { journalRecording, inspectMedia } from './recorded-media';
import { mockOrigin } from './target';
import { patternDevices } from './classroom-media';
import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

async function waitForRecordingTimer(page: Page) {
  // Include the bounded encoder startup plus two seconds of active capture.
  await expect.poll(async () => {
    const text = await page.getByTestId('recording-notice').textContent();
    const match = text?.match(/(\d+):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
}

test('device-free encoder receives frames during startup and advances its timer', async ({ backend, headless }, info) => {
  test.setTimeout(90_000);
  const chrome = await nativeChrome(headless, false, false);
  const page = await chrome.context.newPage();
  try {
    await backend.install(chrome.context);
    await withoutInputs(page);
    await page.addInitScript(() => {
      const events: object[] = [];
      const contexts: AudioContext[] = [];
      const NativeAudio = window.AudioContext;
      window.AudioContext = class extends NativeAudio {
        constructor() { super(); contexts.push(this); }
      };
      const capture = HTMLCanvasElement.prototype.captureStream;
      HTMLCanvasElement.prototype.captureStream = function (fps) {
        events.push({ event: 'capture', time: Date.now() });
        return capture.call(this, fps);
      };
      const fill = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function (...args) {
        if (this.canvas.width === 1280) events.push({ event: 'paint', time: Date.now() });
        return fill.apply(this, args);
      };
      const NativeRecorder = window.MediaRecorder;
      window.MediaRecorder = class extends NativeRecorder {
        constructor(stream: MediaStream, options?: MediaRecorderOptions) {
          super(stream, options);
          for (const event of ['start', 'stop', 'error', 'dataavailable']) {
            this.addEventListener(event, e => events.push({
              event, time: Date.now(), state: this.state,
              bytes: e instanceof BlobEvent ? e.data.size : undefined,
              audio: contexts.map(c => ({ state: c.state, time: c.currentTime })),
              tracks: stream.getTracks().map(t => ({ kind: t.kind, state: t.readyState, muted: t.muted })),
            }));
          }
        }
      };
      Reflect.set(window, 'startupEvidence', { events, contexts });
    });
    await login(page, backend, 'teacher');
    await page.goto(`${mockOrigin}/live/test-room`); await enterClass(page);
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'I consent — start recording', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'startupEvidence').events.some(
      (e: { event: string; state?: string }) => e.event === 'start' && e.state === 'recording',
    )), { timeout: 15_000 }).toBe(true);
    await waitForRecordingTimer(page);
    const file = info.outputPath('device-free.webm');
    await journalRecording(page, file);
    const media = inspectMedia(file);
    expect(media.videoFrames).toBeGreaterThan(1);
    expect(media.duration).toBeGreaterThan(1);
    expect(media.audioRms).toBeLessThan(0.00001);
    expect(media.streams.map((s: { type: string }) => s.type).sort()).toEqual(['audio', 'video']);
    expect(await page.evaluate(() => Reflect.get(window, 'captureRequests'))).toBe(0);
    await info.attach('encoded-media.json', { body: JSON.stringify(media, null, 2), contentType: 'application/json' });
  } finally {
    const evidence = JSON.stringify(await page.evaluate(() => ({
      events: Reflect.get(window, 'startupEvidence')?.events,
      audio: Reflect.get(window, 'startupEvidence')?.contexts.map((c: AudioContext) => ({ state: c.state, time: c.currentTime })),
      status: document.querySelector('[data-testid="recording-status"]')?.textContent,
      error: document.querySelector('[role="alert"]')?.textContent,
    })), null, 2);
    writeFileSync(info.outputPath('startup-evidence.json'), evidence);
    await info.attach('startup-evidence.json', { body: evidence, contentType: 'application/json' });
    await page.screenshot({ path: info.outputPath('startup.png'), fullPage: true });
    await chrome.close();
  }
});

test('device-free screen composition survives start, stop and restart across repeated recordings', async ({ backend, headless }, info) => {
  test.setTimeout(90_000);
  const chrome = await nativeChrome(headless, false, false);
  try {
    await backend.install(chrome.context);
    const page = await chrome.context.newPage();
    await patternDevices(page, '#a025d4', 440, { audio: false, video: false });
    await withoutInputs(page);
    await login(page, backend, 'teacher');
    await page.goto(`${mockOrigin}/live/test-room`); await enterClass(page);
    await page.getByRole('button', { name: 'Share screen', exact: true }).click();
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Start recording', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'I consent — start recording', exact: true }).click();
      await waitForRecordingTimer(page);
      await page.getByRole('button', { name: 'Stop sharing', exact: true }).click();
      await page.waitForTimeout(1100);
      await page.getByRole('button', { name: 'Share screen', exact: true }).click();
      await page.waitForTimeout(1200);
      const file = info.outputPath(`presentation-${i}.webm`);
      await journalRecording(page, file);
      const media = inspectMedia(file);
      expect(media.colorPixels.presentation).toBeGreaterThan(1000);
      expect(media.tones.presentation1320).toBeGreaterThan(0.015);
      expect(media.videoFrames).toBeGreaterThan(3);
      await info.attach(`presentation-${i}.json`, { body: JSON.stringify(media, null, 2), contentType: 'application/json' });
      // Discard the first draft so the byte journal inspection covers one file.
      await page.getByRole('button', { name: 'Discard local recording', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Download', exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => Reflect.get(window, 'captureRequests'))).toBe(0);
    expect(await page.evaluate(() => Reflect.get(window, 'classroomFixture').recorders.length)).toBe(2);
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally { await chrome.close(); }
});

test('a real encoder can defer all chunks until stop and fall back to generic WebM', async ({ backend, headless }, info) => {
  test.setTimeout(60_000);
  const chrome = await nativeChrome(headless, false, false);
  try {
    await backend.install(chrome.context);
    const page = await chrome.context.newPage();
    await withoutInputs(page);
    await page.addInitScript(() => {
      const NativeRecorder = window.MediaRecorder;
      Reflect.set(window, 'nonemptyChunks', 0);
      window.MediaRecorder = class extends NativeRecorder {
        static isTypeSupported(mime: string) { return mime === 'video/webm' && NativeRecorder.isTypeSupported(mime); }
        start() {
          this.addEventListener('dataavailable', e => { if (e.data.size) Reflect.set(window, 'nonemptyChunks', Reflect.get(window, 'nonemptyChunks') + 1); });
          super.start(); // Real codec, deliberately no timeslice.
        }
      };
    });
    await login(page, backend, 'teacher');
    await page.goto(`${mockOrigin}/live/test-room`); await enterClass(page);
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'I consent — start recording', exact: true }).click();
    await waitForRecordingTimer(page);
    expect(await page.evaluate(() => Reflect.get(window, 'nonemptyChunks'))).toBe(0);
    const file = info.outputPath('deferred-chunks.webm');
    await journalRecording(page, file);
    expect(inspectMedia(file).videoFrames).toBeGreaterThan(1);
    expect(await page.evaluate(() => Reflect.get(window, 'nonemptyChunks'))).toBeGreaterThan(0);
  } finally { await chrome.close(); }
});

for (const mode of ['suspended-audio', 'unsupported-formats'] as const) {
  test(`${mode} fails startup accurately and a retry produces playable media`, async ({ backend, headless }, info) => {
    test.setTimeout(60_000);
    const chrome = await nativeChrome(headless, false, false);
    try {
      await backend.install(chrome.context);
      const page = await chrome.context.newPage();
      await withoutInputs(page);
      await page.addInitScript(mode => {
        Reflect.set(window, 'forceStartupFailure', true);
        if (mode === 'suspended-audio') {
          const resume = AudioContext.prototype.resume;
          AudioContext.prototype.resume = async function () {
            if (Reflect.get(window, 'forceStartupFailure')) await this.suspend();
            else await resume.call(this);
          };
        } else {
          const supported = MediaRecorder.isTypeSupported.bind(MediaRecorder);
          MediaRecorder.isTypeSupported = mime => !Reflect.get(window, 'forceStartupFailure') && supported(mime);
        }
      }, mode);
      await login(page, backend, 'teacher');
      await page.goto(`${mockOrigin}/live/test-room`); await enterClass(page);
      const begin = async () => {
        await page.getByRole('button', { name: 'Start recording', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'I consent — start recording', exact: true }).click();
      };
      await begin();
      await expect(page.getByRole('alert')).toContainText(mode === 'suspended-audio' ? 'AudioContext is suspended' : 'No supported recording format');
      await expect(page.getByTestId('recording-notice')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Start recording', exact: true })).toBeEnabled();
      await openMeetingOption(page, 'View recordings');
      await expect(page.getByRole('button', { name: 'Save privately', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Discard local recording', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Download', exact: true })).toHaveCount(0);
      await page.evaluate(() => Reflect.set(window, 'forceStartupFailure', false));
      await begin();
      await waitForRecordingTimer(page);
      const file = info.outputPath(`${mode}-retry.webm`);
      await journalRecording(page, file);
      expect(inspectMedia(file).videoFrames).toBeGreaterThan(1);
      expect(await page.evaluate(() => Reflect.get(window, 'captureRequests'))).toBe(0);
    } finally { await chrome.close(); }
  });
}
