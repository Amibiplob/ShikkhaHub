import { expect, type Page } from "@playwright/test";

/** User actions, not an application/API bypass: preview each requested input. */
export async function enterClass(page: Page, options: {
  microphone?: boolean; camera?: boolean; consent?: boolean;
} = {}) {
  if (options.consent) await page.getByRole("checkbox", { name: /I consent/ }).check();
  if (options.microphone) {
    await page.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mute", exact: true })).toBeVisible();
  }
  if (options.camera) {
    await page.getByRole("button", { name: "Camera on", exact: true }).click();
    await expect(page.getByRole("button", { name: "Camera off", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Join Class", exact: true }).click();
  await expect(page.getByRole("button", { name: /^(End|Leave)$/, exact: true })).toBeVisible();
}

export async function openMeetingOption(page: Page, name: string) {
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

export async function withoutInputs(page: Page) {
  await page.context().grantPermissions([]);
  await page.addInitScript(() => {
    Reflect.set(window, "nativeCapture", navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices));
    Reflect.set(window, "captureRequests", 0);
    navigator.mediaDevices.enumerateDevices = async () => [];
    navigator.mediaDevices.getUserMedia = async () => {
      Reflect.set(window, "captureRequests", Reflect.get(window, "captureRequests") + 1);
      throw new DOMException("No input devices in fixture", "NotFoundError");
    };
  });
}
