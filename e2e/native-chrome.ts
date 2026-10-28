import { chromium, type BrowserContext } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Playwright normally forces visibility. A CDP default context without those
 * overrides is required to prove actual native hidden/visible transitions. */
export async function nativeChrome(
  headless: boolean,
  fakeDevices = true,
): Promise<{ context: BrowserContext; close: () => Promise<void> }> {
  const directory = await mkdtemp(join(tmpdir(), "shikkha-native-chrome-"));
  const child = spawn(
    process.env.CHROME_EXECUTABLE || "/usr/bin/google-chrome",
    [
      `--user-data-dir=${directory}`,
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      ...(fakeDevices
        ? [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
          ]
        : []),
      ...(headless ? ["--headless=new"] : []),
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  try {
    const endpoint = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Native Chrome did not start")),
        15_000,
      );
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.stderr.on("data", (data) => {
        const match = String(data).match(
          /DevTools listening on (ws:\/\/[^\s]+)/,
        );
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Native Chrome exited before attachment"));
      });
    });
    const browser = await chromium.connectOverCDP(endpoint, {
      noDefaults: true,
    });
    const downloads = await browser.newBrowserCDPSession();
    await downloads.send("Browser.setDownloadBehavior", {
      behavior: "allowAndName",
      downloadPath: directory,
      eventsEnabled: true,
    });
    return {
      context: browser.contexts()[0],
      close: async () => {
        await browser.close();
        if (child.exitCode === null)
          await new Promise<void>((resolve) => {
            child.once("exit", () => resolve());
            child.kill();
          });
        await rm(directory, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 200,
        });
      },
    };
  } catch (error) {
    child.kill();
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
    throw error;
  }
}
