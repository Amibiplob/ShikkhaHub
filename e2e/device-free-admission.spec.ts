import { test, expect, login } from "./fixture";
import { withoutInputs } from "./classroom-actions";

test.use({ trace: "on", launchOptions: {
  channel: process.env.E2E_BROWSER_CHANNEL || "chrome",
  args: ["--use-fake-device-for-media-stream=device-count=0", "--autoplay-policy=no-user-gesture-required"],
} });

test("teacher enters the classroom with no camera or microphone", async ({ page, backend }) => {
  await withoutInputs(page);
  await login(page, backend, "teacher");
  await page.goto("/live/test-room");
  await page.getByRole("button", { name: /^(Join Class|Camera \+ Audio)$/ }).click();
  await expect(page.getByRole("button", { name: "End", exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "captureRequests"))).toBe(0);
});
