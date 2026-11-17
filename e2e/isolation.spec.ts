import { stat, utimes } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test, expect } from './fixture';

test('source timestamp changes preserve the browser document and login draft', async ({ page }) => {
  const source = new URL('../docs/RELIABILITY_REVIEW.md', import.meta.url);
  const original = await stat(source);
  const marker = randomUUID();
  try {
    await page.goto('/auth');
    await page.getByLabel('Email', { exact: true }).fill('draft@example.test');
    await page.evaluate(value => Reflect.set(window, 'isolationDocumentMarker', value), marker);
    await utimes(source, original.atime, new Date());
    // Observe the interval in which the old development server refreshed the
    // page. A navigation destroys this evaluation context and fails the test.
    await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 3_000)));
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue('draft@example.test');
    expect(await page.evaluate(() => Reflect.get(window, 'isolationDocumentMarker'))).toBe(marker);
  } finally {
    await utimes(source, original.atime, original.mtime);
  }
});
