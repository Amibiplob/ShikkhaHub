import { test, expect, login } from './fixture';
import { nativeChrome } from './native-chrome';
import { withoutInputs, enterClass } from './classroom-actions';
import { journalRecording, inspectMedia } from './recorded-media';
import { mockOrigin } from './target';

test('device-free recording retains its encoder and elapsed timer after a native hidden tab interval', async ({ backend, headless }, info) => {
  test.setTimeout(90_000);
  const chrome = await nativeChrome(headless, false, false);
  try {
    await backend.install(chrome.context);
    const page = await chrome.context.newPage();
    await withoutInputs(page);
    await page.addInitScript(() => {
      const events: object[] = [];
      const contexts: AudioContext[] = [];
      const NativeAudio = window.AudioContext;
      window.AudioContext = class extends NativeAudio {
        constructor() { super(); contexts.push(this); }
      };
      const NativeRecorder = window.MediaRecorder;
      window.MediaRecorder = class extends NativeRecorder {
        constructor(stream: MediaStream, options?: MediaRecorderOptions) {
          super(stream, options);
          for (const event of ['start', 'stop', 'error']) this.addEventListener(event, () => events.push({ event, time: Date.now() }));
        }
      };
      document.addEventListener('visibilitychange', () => events.push({ event: document.visibilityState, time: Date.now() }));
      Reflect.set(window, 'backgroundEvidence', { events, contexts });
    });
    await login(page, backend, 'teacher');
    await page.goto(`${mockOrigin}/live/test-room`); await enterClass(page);
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'I consent — start recording', exact: true }).click();
    const seconds = async () => {
      const text = await page.getByTestId('recording-notice').textContent();
      const match = text?.match(/(\d+):(\d{2})/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
    };
    await expect.poll(seconds, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    const started = Date.now();
    const other = await chrome.context.newPage();
    await other.goto(`${mockOrigin}/faq`); await other.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden');
    await other.waitForTimeout(5500);
    // Exercise a real suspended graph while hidden; refocus must resume it.
    await page.evaluate(async () => {
      const context = Reflect.get(window, 'backgroundEvidence').contexts[0] as AudioContext;
      await context.suspend();
    });
    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible');
    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'backgroundEvidence').contexts[0].state)).toBe('running');
    const elapsed = Math.floor((Date.now() - started) / 1000) + 2;
    await expect.poll(seconds).toBeGreaterThanOrEqual(elapsed);
    await page.waitForTimeout(1100);
    const file = info.outputPath('device-free-background.webm');
    await journalRecording(page, file);
    const media = inspectMedia(file);
    expect(media.videoFrames).toBeGreaterThan(3);
    expect(media.duration).toBeGreaterThan(6);
    const events = await page.evaluate(() => Reflect.get(window, 'backgroundEvidence').events) as { event: string }[];
    expect(events.filter(e => e.event === 'start')).toHaveLength(1);
    expect(events.filter(e => e.event === 'stop')).toHaveLength(1);
    expect(events.filter(e => e.event === 'error')).toHaveLength(0);
    await info.attach('background-media.json', { body: JSON.stringify({ media, events }, null, 2), contentType: 'application/json' });
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally { await chrome.close(); }
});
