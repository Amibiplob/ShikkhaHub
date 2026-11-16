import { test, expect, login } from './fixture';
import { nativeChrome } from './native-chrome';
import { withoutInputs, enterClass } from './classroom-actions';
import { journalRecording, inspectMedia } from './recorded-media';
import { mockOrigin } from './target';

test('confirmation starts real device-free recording under normal Chrome autoplay rules', async ({ backend, headless }, info) => {
  test.setTimeout(90_000);
  const chrome = await nativeChrome(headless, false);
  try {
    await backend.install(chrome.context);
    const page = await chrome.context.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await withoutInputs(page); await login(page, backend, 'teacher');
    await page.goto(`${mockOrigin}/live/test-room`); await enterClass(page);
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('No camera or microphone is required');
    await dialog.getByRole('button', { name: 'I consent — start recording', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('recording-status')).toContainText('Recording in progress', { timeout: 20_000 });
    await page.waitForTimeout(3200);
    const file = info.outputPath('normal-chrome-no-device.webm');
    await journalRecording(page, file);
    await expect(page.getByTestId('recording-status')).toContainText('saved on this device');
    const media = inspectMedia(file);
    expect(media.duration).toBeGreaterThan(2);
    expect(media.bytes).toBeGreaterThan(1000);
    expect(media.videoFrames).toBeGreaterThan(1);
    expect(media.audioRms).toBeLessThan(0.00001);
    expect(await page.evaluate(() => Reflect.get(window, 'captureRequests'))).toBe(0);
    await info.attach('normal-chrome-media.json', { body: JSON.stringify(media, null, 2), contentType: 'application/json' });
    await page.screenshot({ path: info.outputPath('recording-saved.png'), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await chrome.close(); }
});

for (const mode of ['missing-migration', 'stalled-notice'] as const) {
  test(`confirmation explains ${mode} and leaves start available for retry`, async ({ page, backend }) => {
    test.setTimeout(40_000);
    await withoutInputs(page); await login(page, backend, 'teacher');
    await page.goto('/live/test-room'); await enterClass(page);
    backend.expectedHttp.push({ path: '/rpc/send_live_signal', status: 400 });
    await page.route('**/rest/v1/rpc/send_live_signal', async route => {
      const body = route.request().postDataJSON();
      if (body.signal_event !== 'meeting-state' || !body.signal_payload.recording) return route.fallback();
      if (mode === 'stalled-notice') await new Promise(resolve => setTimeout(resolve, 12_000));
      await route.fulfill({ status: 400, json: { code: 'P0001', message: 'Invalid signal event' } }).catch(() => undefined);
    });
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'I consent — start recording', exact: true }).click();
    if (mode === 'stalled-notice') await expect(page.getByTestId('recording-status')).toContainText('Starting recording');
    await expect(page.getByTestId('recording-status')).toContainText('Recording failed', { timeout: 15_000 });
    await expect(page.getByRole('alert')).toContainText(mode === 'missing-migration' ? '202610280001' : 'connection');
    await expect(page.getByRole('button', { name: 'Start recording', exact: true })).toBeEnabled();
    await expect(page.getByTestId('recording-notice')).toHaveCount(0);
  });
}
