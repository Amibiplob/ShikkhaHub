import { test, expect, login, users, C } from "./fixture";
import { mockOrigin } from "./target";
import { nativeChrome } from "./native-chrome";
import { patternDevices } from "./classroom-media";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";

test.use({
  trace: "on",
  launchOptions: {
    channel: process.env.E2E_BROWSER_CHANNEL || "chrome",
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

async function record(page: Page) {
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I consent — start recording", exact: true })
    .click();
  await expect(page.getByTestId("recording-notice")).toBeVisible();
}
async function journalRecording(page: Page, path: string) {
  await page.bringToFront();
  await expect
    .poll(() => page.evaluate(() => document.visibilityState))
    .toBe("visible");
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  // Inspect the actual journal bytes. UI downloads are verified independently.
  const bytes = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("shikkhahub-recordings", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const chunks = await new Promise<{ blob: Blob }[]>((resolve, reject) => {
      const request = database
        .transaction("chunks")
        .objectStore("chunks")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const blob = new Blob(
      chunks.map((chunk) => chunk.blob),
      { type: "video/webm" },
    );
    Reflect.set(window, "recordingPlaybackURL", URL.createObjectURL(blob));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  // Preserve a real encoded artifact even when browser playback fails.
  writeFileSync(path, Buffer.from(bytes));
  await page.evaluate(async () => {
    const url = Reflect.get(window, "recordingPlaybackURL") as string;
    const playback = document.createElement("video");
    playback.muted = true;
    playback.controls = true;
    playback.style.cssText =
      "position:fixed;top:100px;left:20px;width:320px;height:180px;z-index:2147483647;background:black";
    playback.src = url;
    document.body.append(playback);
    try {
      await new Promise<void>((resolve, reject) => {
        playback.onloadeddata = () => resolve();
        playback.onerror = () =>
          reject(new Error("Recorded file cannot be played"));
      });
      await playback.play();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Recorded playback produced no advancing decoded frame",
              ),
            ),
          10_000,
        );
        const frame: VideoFrameRequestCallback = (_now, metadata) => {
          if (metadata.mediaTime > 0.05) {
            clearTimeout(timeout);
            resolve();
          } else playback.requestVideoFrameCallback(frame);
        };
        playback.requestVideoFrameCallback(frame);
      });
    } finally {
      playback.pause();
      playback.remove();
      URL.revokeObjectURL(url);
      Reflect.deleteProperty(window, "recordingPlaybackURL");
    }
  });
}

function inspectMedia(file: string) {
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
      { encoding: "utf8" },
    ),
  );
  const pcm = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "8000",
      "-af",
      "aresample=async=1:first_pts=0",
      "-f",
      "f32le",
      "-",
    ],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  const samples = new Float32Array(
    pcm.buffer,
    pcm.byteOffset,
    pcm.byteLength / 4,
  );
  const packets = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "a", "-show_packets",
    "-show_entries", "packet=pts_time", "-of", "json", file,
  ], { encoding: "utf8" })).packets as { pts_time: string }[];
  const audioPacketMaxGap = packets.slice(1).reduce((gap, packet, i) =>
    Math.max(gap, Number(packet.pts_time) - Number(packets[i].pts_time)), 0);
  let peakAmplitude = 0,
    clippedSamples = 0;
  for (const sample of samples) {
    peakAmplitude = Math.max(peakAmplitude, Math.abs(sample));
    if (Math.abs(sample) >= 0.99) clippedSamples++;
  }
  const tone = (hz: number, from = 0, until = samples.length) => {
    let best = 0;
    for (let offset = from; offset + 4000 <= until; offset += 4000) {
      let real = 0,
        imag = 0;
      for (let i = 0; i < 4000; i++) {
        real += samples[offset + i] * Math.cos((2 * Math.PI * hz * i) / 8000);
        imag += samples[offset + i] * Math.sin((2 * Math.PI * hz * i) / 8000);
      }
      best = Math.max(best, (Math.hypot(real, imag) * 2) / 4000);
    }
    return best;
  };
  const frames = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vf",
      "fps=1,scale=160:90",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  const colors = { teacher: 0, student: 0, presentation: 0 };
  for (let i = 0; i < frames.length; i += 3) {
    const [r, g, b] = [frames[i], frames[i + 1], frames[i + 2]];
    if (r > 90 && b > 120 && g < 90) colors.teacher++;
    if (g > 110 && r < 90 && b < 110) colors.student++;
    if (r > 170 && g > 70 && g < 180 && b < 85) colors.presentation++;
  }
  const audioWindows = Array.from(
    { length: Math.floor(samples.length / 4000) },
    (_, index) => ({
      start: index / 2,
      teacher440: tone(440, index * 4000, (index + 1) * 4000),
      student880: tone(880, index * 4000, (index + 1) * 4000),
    }),
  );
  return {
    audioWindows,
    peakAmplitude,
    audioPacketMaxGap,
    clippedSamples,
    streams: probe.streams.map((s: Record<string, unknown>) => ({
      codec: s.codec_name,
      type: s.codec_type,
      width: s.width,
      height: s.height,
    })),
    duration: samples.length / 8000,
    tones: {
      teacher440: tone(440),
      student880: tone(880),
      presentation1320: tone(1320),
    },
    colorPixels: colors,
    bytes: readFileSync(file).length,
  };
}

test("complete meeting recording contains participant media and presentation across tab and device transitions", async ({
  backend,
  browser,
  headless,
}, info) => {
  test.setTimeout(150_000);
  const native = await nativeChrome(headless);
  try {
    await backend.install(native.context);
    const page = await native.context.newPage();
    page.setDefaultTimeout(15_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const renderer = await page.context().newCDPSession(page);
    await renderer.send("Performance.enable");
    const hostErrors: string[] = [];
    page.on("pageerror", (error) => hostErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") hostErrors.push(message.text());
    });
    backend.rows.enrollments.push({
      id: "enrollment",
      user_id: users.student.id,
      course_id: C,
    });
    await page.context().grantPermissions(["camera", "microphone"]);
    await patternDevices(page, "#a025d4", 440);
    await login(page, backend, "teacher");
    await page.goto(`${mockOrigin}/live/test-room`);
    await page
      .getByRole("button", { name: "Camera + Audio", exact: true })
      .click();
    const context = await browser.newContext({
      permissions: ["camera", "microphone"],
      viewport: { width: 1024, height: 900 },
    });
    await backend.install(context);
    const student = await context.newPage();
    const studentErrors: string[] = [];
    student.on("pageerror", (e) => studentErrors.push(e.message));
    try {
      await patternDevices(student, "#20be49", 880);
      await login(student, backend, "student");
      await student.goto("/live/test-room");
      await student.getByRole("checkbox", { name: /I consent/ }).check();
      await student
        .getByRole("button", { name: "Join Stream", exact: true })
        .click();
      await page.bringToFront();
      const studentVideo = page.locator(
        `video[data-participant="${users.student.id}"]`,
      );
      await page.bringToFront();
      await expect
        .poll(
          () => studentVideo.evaluate((v: HTMLVideoElement) => v.readyState),
          { timeout: 20_000 },
        )
        .toBeGreaterThanOrEqual(2);
      await expect
        .poll(() =>
          student
            .locator(`video[data-participant="${users.teacher.id}"]`)
            .evaluate((v: HTMLVideoElement) => v.readyState),
        )
        .toBeGreaterThanOrEqual(2);
      await page.bringToFront();
      await record(page);
      await expect.poll(() => page.evaluate(() =>
        Reflect.get(window, "classroomFixture").events.some((e: { event: string }) => e.event === "start"),
      )).toBe(true);
      const startedAt = await page.evaluate(() =>
        Reflect.get(window, "classroomFixture").events.find((e: { event: string }) => e.event === "start").time as number,
      );
      const metricsBefore = await renderer.send("Performance.getMetrics");
      await expect(student.getByTestId("recording-notice")).toBeVisible();
      await page.waitForTimeout(2500);
      const other = await page.context().newPage();
      await other.goto(`${mockOrigin}/faq`, { waitUntil: "domcontentloaded" });
      await other.bringToFront();
      await expect
        .poll(() => page.evaluate(() => document.visibilityState))
        .toBe("hidden");
      await other.waitForTimeout(5000);
      await page.bringToFront();
      await expect
        .poll(() => page.evaluate(() => document.visibilityState))
        .toBe("visible");
      await expect(
        page.getByRole("button", { name: "End", exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("recording-notice")).toBeVisible();
      for (let i = 0; i < 4; i++) {
        await other.bringToFront();
        await other.waitForTimeout(150);
        await page.bringToFront();
      }
      await other.close();
      await page.getByRole("button", { name: "Mute", exact: true }).click();
      const mutedAt = (Date.now() - startedAt) / 1000;
      expect(
        await page.evaluate(() =>
          Reflect.get(window, "classroomFixture")
            .tracks.filter((t: MediaStreamTrack) => t.kind === "audio")
            .every((t: MediaStreamTrack) => !t.enabled),
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Camera off", exact: true })
        .click();
      await page.waitForTimeout(1200);
      await page
        .getByRole("button", { name: "Camera on", exact: true })
        .click();
      const unmutedAt = (Date.now() - startedAt) / 1000;
      await page.getByRole("button", { name: "Unmute", exact: true }).click();
      await page
        .getByRole("button", { name: "Share screen", exact: true })
        .click();
      await expect(student.getByTestId("tile-presentation")).toBeVisible();
      await expect
        .poll(() =>
          student
            .locator('video[data-participant="presentation"]')
            .evaluate((v: HTMLVideoElement) => v.readyState),
        )
        .toBeGreaterThanOrEqual(2);
      await page.waitForTimeout(2600);
      await page.evaluate(() =>
        Reflect.get(window, "classroomFixture").stopScreen(),
      );
      await expect(
        page.getByRole("button", { name: "Share screen", exact: true }),
      ).toBeVisible();
      await expect(student.getByTestId("tile-presentation")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Share screen", exact: true })
        .click();
      await page.waitForTimeout(1300);
      await page
        .getByRole("button", { name: "Stop sharing", exact: true })
        .click();
      await student.getByRole("button", { name: "Leave", exact: true }).click();
      await page.waitForTimeout(800);
      await student
        .getByRole("button", { name: "Join Stream", exact: true })
        .click();
      await page.bringToFront();
      await expect
        .poll(
          () => studentVideo.evaluate((v: HTMLVideoElement) => v.readyState),
          { timeout: 20_000 },
        )
        .toBeGreaterThanOrEqual(2);
      await page.waitForTimeout(1500);
      const expectedDuration = (Date.now() - startedAt) / 1000;
      const metricsAfter = await renderer.send("Performance.getMetrics");
      await info.attach("renderer-metrics.json", {
        body: JSON.stringify(
          {
            before: metricsBefore,
            after: metricsAfter,
            scope:
              "Short automated recording journey; renderer task time and heap only, not whole-system CPU or a long-duration leak proof.",
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      const file = info.outputPath("complete-meeting.webm");
      await journalRecording(page, file);
      const evidence = inspectMedia(file);
      await info.attach("decoded-media.json", {
        body: JSON.stringify(evidence, null, 2),
        contentType: "application/json",
      });
      expect(
        evidence.streams.map((s: { type: string }) => s.type).sort(),
      ).toEqual(["audio", "video"]);
      const lifecycle = (await page.evaluate(
        () => Reflect.get(window, "classroomFixture").events,
      )) as {
        event: string;
        state: string;
        time: number;
        tracks?: { id: string }[];
      }[];
      await info.attach("media-lifecycle.json", {
        body: JSON.stringify(lifecycle, null, 2), contentType: "application/json",
      });
      expect(Math.abs(evidence.duration - expectedDuration)).toBeLessThan(3);
      const recordingStarted = lifecycle.find((e) => e.event === "start")!;
      const hidden = lifecycle.find(
        (e) =>
          e.event === "visibility" &&
          e.state === "hidden" &&
          e.time >= recordingStarted.time,
      )!;
      const visible = lifecycle.find(
        (e) =>
          e.event === "visibility" &&
          e.state === "visible" &&
          e.time > hidden.time,
      )!;
      expect(visible.time - hidden.time).toBeGreaterThan(4900);
      const midpoint =
        ((hidden.time + visible.time) / 2 - recordingStarted.time) / 1000;
      const backgroundAudio = evidence.audioWindows.find(
        (w) => w.start <= midpoint && w.start + 0.5 > midpoint,
      )!;
      expect(backgroundAudio.teacher440).toBeGreaterThan(0.015);
      expect(backgroundAudio.student880).toBeGreaterThan(0.015);
      expect(lifecycle.filter((e) => e.event === "start")).toHaveLength(1);
      expect(lifecycle.filter((e) => e.event === "stop")).toHaveLength(1);
      const outputTracks = new Set(
        lifecycle.flatMap((e) => (e.tracks || []).map((t) => t.id)),
      );
      expect(outputTracks.size).toBe(2);
      expect(
        backend.sockets.filter((s) => s.topics.has("realtime:live-test-room"))
          .length,
      ).toBe(2);
      expect(evidence.duration).toBeGreaterThan(12);
      expect(evidence.bytes).toBeGreaterThan(10_000);
      expect(evidence.clippedSamples).toBe(0);
      expect(evidence.audioPacketMaxGap).toBeLessThan(1);
      expect(evidence.audioWindows.some((window) =>
        window.start > mutedAt + 0.2 && window.start + 0.5 < unmutedAt &&
        window.teacher440 < 0.005 && window.student880 > 0.015,
      )).toBe(true);
      expect(evidence.tones.teacher440).toBeGreaterThan(0.015);
      expect(evidence.tones.student880).toBeGreaterThan(0.015);
      expect(evidence.tones.presentation1320).toBeGreaterThan(0.015);
      expect(evidence.colorPixels.teacher).toBeGreaterThan(1000);
      expect(evidence.colorPixels.student).toBeGreaterThan(1000);
      expect(evidence.colorPixels.presentation).toBeGreaterThan(1000);
      await page
        .getByRole("button", { name: "Save privately", exact: true })
        .click();
      await expect(
        page.getByText("Recording saved privately.", { exact: true }),
      ).toBeVisible();
      expect(backend.rows.class_recordings).toHaveLength(1);
      expect(String(backend.rows.class_recordings[0].file_url)).toMatch(
        /\.webm$/,
      );
      await page.screenshot({
        path: info.outputPath("teacher-classroom.png"),
        fullPage: true,
      });
      await student.screenshot({
        path: info.outputPath("student-classroom.png"),
        fullPage: true,
      });
      expect(studentErrors).toEqual([]);
      expect(hostErrors).toEqual([]);
      await page.getByRole("button", { name: "End", exact: true }).click();
      await expect(
        student.getByRole("heading", { name: "Class has ended" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  } finally {
    await native.close();
  }
});

for (const width of [375, 768, 1024, 1440])
  test(`classroom controls, panels and recording fit ${width}px`, async ({
    page,
    backend,
  }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.context().grantPermissions(["camera", "microphone"]);
    await patternDevices(page, "#a025d4", 440);
    await login(page, backend, "teacher");
    await page.goto(`${mockOrigin}/live/test-room`);
    await page
      .getByRole("button", { name: "Camera + Audio", exact: true })
      .click();
    await record(page);
    for (const name of [
      "Mute",
      "Camera off",
      "End",
      "Participants",
      "Toggle chat",
    ])
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeInViewport();
    for (const panel of ["Participants", "Toggle chat", "Device settings"]) {
      await page.getByRole("button", { name: panel, exact: true }).click();
      await expect(
        page.getByRole("complementary", { name: "Meeting panel" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Close panel", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Share screen", exact: true })
      .click();
    await expect(page.getByTestId("tile-presentation")).toBeVisible();
    await expect(page.getByTestId(`tile-${users.teacher.id}`)).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Mute", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Unmute", exact: true }),
    ).toBeFocused();
    await page.screenshot({
      path: info.outputPath(`classroom-${width}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Stop sharing", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stop recording", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Download", exact: true }),
    ).toBeVisible();
  });

test("screen permission denial and camera recovery preserve an audio-only meeting", async ({
  page,
  backend,
}) => {
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page.getByRole("button", { name: "Audio Only", exact: true }).click();
  await page.getByRole("button", { name: "Camera on", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Camera off", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    Reflect.get(window, "classroomFixture").denyScreen(),
  );
  await page.getByRole("button", { name: "Share screen", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Permission denied");
  await expect(
    page.getByRole("button", { name: "End", exact: true }),
  ).toBeVisible();
});

test("recording draft survives reload and failed private upload, then saves exactly once", async ({
  page,
  backend,
}, info) => {
  test.setTimeout(60_000);
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page
    .getByRole("button", { name: "Camera + Audio", exact: true })
    .click();
  await record(page);
  await page.waitForTimeout(1800);
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const file = info.outputPath("recovered-download.webm");
  await (await download).saveAs(file);
  expect(inspectMedia(file).duration).toBeGreaterThan(1);
  let fail = true;
  await page
    .context()
    .route("**/storage/v1/object/class-recordings/**", async (route) => {
      if (fail) {
        fail = false;
        backend.expectedHttp.push({
          path: new URL(route.request().url()).pathname,
          status: 403,
        });
        await route.fulfill({
          status: 403,
          json: {
            error: "Permission denied for test upload",
            statusCode: "403",
          },
        });
      } else await route.fallback();
    });
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    page.getByText(
      "Upload failed. Your local recording is retained. Retry or download it.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  expect(backend.rows.class_recordings).toHaveLength(0);
  await page
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(
    page.getByText("Recording saved privately.", { exact: true }),
  ).toBeVisible();
  expect(backend.rows.class_recordings).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toHaveCount(0);
});

test("recording refuses to start when its private participant notice is denied", async ({
  page,
  backend,
}) => {
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page.getByRole("button", { name: "Audio Only", exact: true }).click();
  await page.context().route("**/rpc/send_live_signal", async (route) => {
    const body = route.request().postDataJSON();
    if (
      body.signal_event === "meeting-state" &&
      body.signal_payload.recording === true
    ) {
      backend.expectedHttp.push({
        path: "/rest/v1/rpc/send_live_signal",
        status: 403,
      });
      await route.fulfill({ status: 403, json: { message: "Notice denied" } });
    } else await route.fallback();
  });
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I consent — start recording", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "participant notice could not be sent",
  );
  await expect(page.getByTestId("recording-notice")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, "classroomFixture").events.filter(
          (e: { event: string }) => e.event === "start",
        ).length,
    ),
  ).toBe(0);
});

test("native screen capture does not supply media without approval", async ({
  backend,
  headless,
}) => {
  const native = await nativeChrome(headless, false);
  try {
    await backend.install(native.context);
    const page = await native.context.newPage();
    await page.goto(`${mockOrigin}/faq`, { waitUntil: "domcontentloaded" });
    const cdp = await page.context().newCDPSession(page);
    // No fake UI/device flags, JavaScript API replacement or user gesture.
    await cdp.send("Runtime.evaluate", {
      expression:
        "window.capturePermissionResult='pending'; void navigator.mediaDevices.getDisplayMedia({video:true}).then(s=>{s.getTracks().forEach(t=>t.stop());window.capturePermissionResult='unexpected-success'},e=>window.capturePermissionResult=e.name)",
      userGesture: false,
    });
    await page.waitForTimeout(600);
    const result = await cdp.send("Runtime.evaluate", {
      expression: "window.capturePermissionResult",
      userGesture: false,
      returnByValue: true,
    });
    expect(["InvalidStateError", "NotAllowedError", "pending"]).toContain(
      result.result.value,
    );
  } finally {
    await native.close();
  }
});

test("device-unavailable errors preserve the lobby and can be retried", async ({
  page,
  backend,
}) => {
  await login(page, backend, "teacher");
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Device missing", "NotFoundError"));
  });
  await page.goto(`${mockOrigin}/live/test-room`);
  await page.getByRole("button", { name: "Audio Only", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Device unavailable");
  await expect(
    page.getByRole("button", { name: "Audio Only", exact: true }),
  ).toBeEnabled();
  expect(backend.rows.live_classes[0].status).toBe("scheduled");
});

test("three participants receive relayed video and a reused slot after rejoin while presenting", async ({
  page,
  backend,
  browser,
}) => {
  test.setTimeout(90_000);
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page
    .getByRole("button", { name: "Camera + Audio", exact: true })
    .click();
  await expect.poll(() => backend.rows.live_classes[0].status).toBe("live");
  await page.getByRole("button", { name: "Share screen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop sharing", exact: true }),
  ).toBeVisible();
  const contexts = [];
  try {
    for (const [role, color, tone] of [
      ["student", "#20be49", 880],
      ["other", "#2040e9", 660],
    ] as const) {
      backend.rows.enrollments.push({
        id: `live-${role}`,
        user_id: users[role].id,
        course_id: C,
      });
      const context = await browser.newContext({
        permissions: ["camera", "microphone"],
        viewport: { width: 1024, height: 900 },
      });
      contexts.push(context);
      await backend.install(context);
      const participant = await context.newPage();
      await patternDevices(participant, color, tone);
      await login(participant, backend, role);
      await participant.goto("/live/test-room");
      await participant.getByRole("checkbox", { name: /I consent/ }).check();
      if (role === "other") {
        await participant
          .getByRole("checkbox", { name: "Start with camera off", exact: true })
          .check();
        await participant
          .getByRole("checkbox", {
            name: "Start with microphone muted",
            exact: true,
          })
          .check();
      }
      await participant
        .getByRole("button", { name: "Join Stream", exact: true })
        .click();
      await expect(participant.getByTestId("tile-presentation")).toBeVisible();
    }
    const student = contexts[0].pages()[0],
      other = contexts[1].pages()[0];
    await expect(
      other.getByRole("button", { name: "Camera on", exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("button", { name: "Unmute", exact: true }),
    ).toBeVisible();
    await other.evaluate(() =>
      Reflect.get(window, "classroomFixture").delayCamera(),
    );
    await other.getByRole("button", { name: "Camera on", exact: true }).click();
    await other.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "Mute", exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("button", { name: "Camera off", exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Device settings", exact: true })
      .click();
    for (const input of ["Microphone input", "Camera input"]) {
      const before = await other.evaluate(() =>
        Reflect.get(window, "classroomFixture")
          .tracks.filter((t: MediaStreamTrack) => t.readyState === "live")
          .map((t: MediaStreamTrack) => t.id),
      );
      await other.getByLabel(input, { exact: true }).selectOption({ index: 1 });
      await expect
        .poll(() =>
          other.evaluate(() =>
            Reflect.get(window, "classroomFixture")
              .tracks.filter((t: MediaStreamTrack) => t.readyState === "live")
              .map((t: MediaStreamTrack) => t.id),
          ),
        )
        .not.toEqual(before);
    }
    await other
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
    const blue = () =>
      student
        .locator(`video[data-participant="${users.other.id}"]`)
        .evaluate((video: HTMLVideoElement) => {
          if (video.readyState < 2) return false;
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(video, 0, 0, 1, 1);
          const [r, , b] = ctx.getImageData(0, 0, 1, 1).data;
          return r < 80 && b > 150;
        });
    await expect.poll(blue).toBe(true);
    await other.getByRole("button", { name: "Leave", exact: true }).click();
    await expect(student.getByTestId(`tile-${users.other.id}`)).toHaveCount(0);
    await other
      .getByRole("button", { name: "Join Stream", exact: true })
      .click();
    await other.getByRole("button", { name: "Camera on", exact: true }).click();
    await expect.poll(blue).toBe(true);
    await other.reload();
    await other.getByRole("checkbox", { name: /I consent/ }).check();
    await other
      .getByRole("button", { name: "Join Stream", exact: true })
      .click();
    await expect(
      other.getByRole("button", { name: "Leave", exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        () =>
          backend.sockets.filter((s) => s.topics.has("realtime:live-test-room"))
            .length,
      )
      .toBe(3);
    await student
      .locator(`video[data-participant="${users.other.id}"]`)
      .evaluate(
        (video: HTMLVideoElement) =>
          new Promise<void>((resolve) =>
            video.requestVideoFrameCallback(() => resolve()),
          ),
      );
    await expect.poll(blue, { timeout: 20_000 }).toBe(true);
    expect(
      backend.sockets.filter((s) => s.topics.has("realtime:live-test-room"))
        .length,
    ).toBe(3);
    await page.getByRole("button", { name: "End", exact: true }).click();
    await expect(
      student.getByRole("heading", { name: "Class has ended" }),
    ).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("encoder failure retains a recovery draft and allows another recording", async ({
  page,
  backend,
}) => {
  test.setTimeout(60_000);
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page
    .getByRole("button", { name: "Camera + Audio", exact: true })
    .click();
  await record(page);
  await page.waitForTimeout(1800);
  await page.evaluate(() =>
    Reflect.get(window, "classroomFixture").recorders[0].dispatchEvent(
      new Event("error"),
    ),
  );
  await expect(page.getByRole("alert")).toContainText(
    "browser interrupted recording",
  );
  await expect(page.getByTestId("recording-notice")).toHaveCount(0);
  await page
    .getByRole("button", { name: "View recordings", exact: true })
    .click();
  await expect(
    page.getByText(/Interrupted — playback may be incomplete/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  await record(page);
  await page.waitForTimeout(1000);
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save privately", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "End", exact: true }),
  ).toBeVisible();
});

test("Bangla classroom controls and chat remain usable at 375px", async ({
  page,
  backend,
}, info) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.evaluate(() => localStorage.setItem("shikkhahub-lang", "bn"));
  await page.goto(`${mockOrigin}/live/test-room`);
  await page.getByRole("button", { name: "শুধু অডিও", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "মাইক বন্ধ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "চ্যাট", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "লাইভ চ্যাট", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("লাইভ চ্যাট বার্তা", { exact: true })
    .fill("ক্লাসের একটি প্রশ্ন");
  await page.getByRole("button", { name: "বার্তা পাঠান", exact: true }).click();
  await expect(
    page.getByText("ক্লাসের একটি প্রশ্ন", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("classroom-bangla-375.png"),
    fullPage: true,
  });
});

test("ending during a delayed recording notice cancels pending capture", async ({ page, backend }) => {
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page.getByRole("button", { name: "Audio Only", exact: true }).click();
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.context().route("**/rpc/send_live_signal", async (route) => {
    const body = route.request().postDataJSON();
    if (body.signal_event === "meeting-state" && body.signal_payload.recording === true) await held;
    await route.fallback();
  });
  await record(page);
  try {
    await page.getByRole("button", { name: "End", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Class has ended" })).toBeVisible();
  } finally { release(); }
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => Reflect.get(window, "classroomFixture").recorders.length)).toBe(0);
  await expect(page.getByTestId("recording-notice")).toHaveCount(0);
});

test("switching a muted microphone never sends an enabled replacement track", async ({ page, backend }) => {
  await page.context().grantPermissions(["camera", "microphone"]);
  await patternDevices(page, "#a025d4", 440);
  await page.addInitScript(() => {
    const states: boolean[] = [];
    const replace = RTCRtpSender.prototype.replaceTrack;
    RTCRtpSender.prototype.replaceTrack = function(track) {
      if (track?.kind === "audio") states.push(track.enabled);
      return replace.call(this, track);
    };
    Reflect.set(window, "replacementAudioStates", states);
  });
  await login(page, backend, "teacher");
  await page.goto(`${mockOrigin}/live/test-room`);
  await page.getByRole("checkbox", { name: "Start with microphone muted", exact: true }).check();
  await page.getByRole("button", { name: "Audio Only", exact: true }).click();
  await expect(page.getByRole("button", { name: "End", exact: true })).toBeVisible();
  // A receiving peer is necessary to prove the actual outgoing sender state.
  for (const socket of backend.sockets) if (socket.topics.has("realtime:live-test-room")) {
    socket.send(JSON.stringify([null, null, "realtime:live-test-room", "broadcast", {
      event: "join-request", type: "broadcast", payload: { fromId: users.student.id, consent: false },
    }]));
  }
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "replacementAudioStates").length)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Device settings", exact: true }).click();
  const count = await page.evaluate(() => Reflect.get(window, "replacementAudioStates").length);
  await page.getByLabel("Microphone input", { exact: true }).selectOption({ index: 1 });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "replacementAudioStates").length)).toBeGreaterThan(count);
  expect(await page.evaluate(() => Reflect.get(window, "replacementAudioStates"))).not.toContain(true);
});
