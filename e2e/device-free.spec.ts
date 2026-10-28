import { test, expect, login, users, C, type Backend } from "./fixture";
import type { Browser, Page } from "@playwright/test";
import { enterClass, withoutInputs } from "./classroom-actions";
import { patternDevices } from "./classroom-media";
import { nativeChrome } from "./native-chrome";
import { mockOrigin } from "./target";
import { record, journalRecording, inspectMedia } from "./recorded-media";

async function senderStates(page: Page) {
  return page.evaluate(() => (Reflect.get(window, "classroomFixture").peers as RTCPeerConnection[])
    .filter(pc => pc.connectionState !== "closed")
    .flatMap(pc => pc.getSenders().filter(s => s.track).map(s => ({ kind: s.track!.kind, enabled: s.track!.enabled, state: s.track!.readyState }))));
}

async function pair(browser: Browser, backend: Backend, role: "teacher" | "student", inputs = { audio: true, video: true }) {
  backend.rows.enrollments.push({ id: "device-enrollment", user_id: users.student.id, course_id: C });
  const teacherContext = await browser.newContext({ permissions: ["camera", "microphone"] });
  const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
  try {
    await backend.install(teacherContext); await backend.install(studentContext);
    const teacher = await teacherContext.newPage(), student = await studentContext.newPage();
    await patternDevices(teacher, "#a025d4", 440, role === "teacher" ? inputs : { audio: true, video: true });
    await patternDevices(student, "#20be49", 880, role === "student" ? inputs : { audio: true, video: true });
    await login(teacher, backend, "teacher"); await teacher.goto("/live/test-room"); await enterClass(teacher);
    await login(student, backend, "student"); await student.goto("/live/test-room"); await enterClass(student);
    const actor = role === "teacher" ? teacher : student;
    await expect.poll(() => actor.evaluate(() =>
      Reflect.get(window, "classroomFixture").peers.some((pc: RTCPeerConnection) => pc.connectionState === "connected"),
    )).toBe(true);
    return { teacher, student, actor, close: () => Promise.all([teacherContext.close(), studentContext.close()]) };
  } catch (error) { await Promise.all([teacherContext.close(), studentContext.close()]); throw error; }
}

async function enable(page: Page, kind: "audio" | "video") {
  await page.getByRole("button", { name: kind === "audio" ? "Unmute" : "Camera on", exact: true }).click();
  const consent = page.getByRole("button", { name: "I consent — enable device", exact: true });
  if (await consent.isVisible()) await consent.click();
}

test.use({
  trace: "on",
  launchOptions: {
    channel: process.env.E2E_BROWSER_CHANNEL || "chrome",
    args: ["--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
  },
});

test.describe("optional local media", () => {

  test("failed private admission resets preview controls and permits a device-free retry", async ({ page, backend }) => {
    await page.context().grantPermissions(["camera", "microphone"]);
    await patternDevices(page, "#a025d4", 440);
    let rejectFirstJoin = true;
    await page.context().routeWebSocket("**/realtime/v1/**", socket => {
      socket.onMessage(message => {
        if (typeof message !== "string") return;
        const decoded = JSON.parse(message);
        const [join, ref, topic, event, payload] = Array.isArray(decoded) ? decoded
          : [decoded.join_ref, decoded.ref, decoded.topic, decoded.event, decoded.payload];
        if (!["phx_join", "phx_leave", "heartbeat"].includes(event)) return;
        const denied = rejectFirstJoin && event === "phx_join" && topic === "realtime:live-test-room";
        if (denied) rejectFirstJoin = false;
        socket.send(JSON.stringify([join, ref, topic, "phx_reply", {
          status: denied ? "error" : "ok",
          response: denied ? { reason: "Isolated admission failure" } : {
            postgres_changes: (payload?.config?.postgres_changes || []).map((change: object, id: number) => ({ ...change, id })),
          },
        }]));
      });
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await login(page, backend, "teacher"); await page.goto("/live/test-room");
    for (const name of ["Unmute", "Camera on"]) await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("button", { name: "Camera off", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Join Class", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Private class connection failed");
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "classroomFixture").tracks.map((track: MediaStreamTrack) => track.readyState))).toEqual(["ended", "ended"]);
    for (const name of ["Unmute", "Camera on"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    await enterClass(page);
    expect(await page.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(2);
    for (const name of ["Unmute", "Camera on"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("joining cancels a pending camera preview without waiting for its permission result", async ({ page, backend }) => {
    await page.context().grantPermissions(["camera", "microphone"]);
    await patternDevices(page, "#a025d4", 440);
    await login(page, backend, "teacher"); await page.goto("/live/test-room");
    await page.evaluate(() => Reflect.get(window, "classroomFixture").holdCamera());
    await page.getByRole("button", { name: "Camera on", exact: true }).click();
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(1);
    await expect(page.getByRole("button", { name: "Join Class", exact: true })).toBeEnabled();
    await enterClass(page);
    await page.evaluate(() => Reflect.get(window, "classroomFixture").releaseCamera());
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "classroomFixture").tracks.filter((t: MediaStreamTrack) => t.readyState === "ended").length)).toBe(1);
    await expect(page.getByRole("button", { name: "Camera on", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "End", exact: true })).toBeVisible();
  });

  test("a listener can decline sharing consent without capturing or leaving", async ({ browser, backend }) => {
    test.setTimeout(60_000);
    const room = await pair(browser, backend, "student");
    try {
      await room.actor.getByRole("button", { name: "Unmute", exact: true }).click();
      await expect(room.actor.getByRole("dialog", { name: "Share your media?" })).toBeVisible();
      await room.actor.keyboard.press("Escape");
      expect(await senderStates(room.actor)).toEqual([]);
      expect(await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(0);
      await expect(room.actor.getByRole("button", { name: "Leave", exact: true })).toBeVisible();
    } finally { await room.close(); }
  });

  for (const role of ["teacher", "student"] as const) for (const width of [320, 375, 768, 1440]) {
    test(`${role} joins and chats without devices at ${width}px`, async ({ page, backend }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await withoutInputs(page);
      backend.rows.enrollments.push({ id: "enrollment", user_id: users.student.id, course_id: C });
      await login(page, backend, role);
      if (width === 375) await page.evaluate(() => localStorage.setItem("theme", "light"));
      await page.goto("/live/test-room");
      await expect(page.locator("html")).toHaveClass(width === 375 ? "light" : "dark");
      await expect(page.getByText("No camera or microphone detected. You can join without them.", { exact: true })).toBeVisible();
      for (const name of ["Unmute", "Camera on"]) await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Join Class", exact: true })).toBeEnabled();
      expect(await page.evaluate(() => Reflect.get(window, "captureRequests"))).toBe(0);
      await page.screenshot({ path: info.outputPath(`${role}-prejoin-${width}.png`), fullPage: true });
      // Check the actual native browser permission state, not just a hidden preview.
      expect(await page.evaluate(async () => (await navigator.permissions.query({ name: "microphone" as PermissionName })).state)).toBe("denied");
      const nativeError = await page.evaluate(async () => {
        try {
          const stream = await Reflect.get(window, "nativeCapture")({ audio: true });
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          return "unexpected-success";
        } catch (error) { return (error as DOMException).name; }
      });
      expect(["NotAllowedError", "NotFoundError"]).toContain(nativeError);
      await enterClass(page);
      for (const name of ["Unmute", "Camera on"]) await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Toggle chat", exact: true }).click();
      await page.getByLabel("Live chat message").fill("Joining without devices");
      await page.getByRole("button", { name: "Send chat message" }).click();
      await expect(page.getByText("Joining without devices", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => Reflect.get(window, "captureRequests"))).toBe(0);
      expect(await page.locator(`video[data-participant="${users[role].id}"]`).evaluate((video: HTMLVideoElement) =>
        (video.srcObject as MediaStream | null)?.getTracks().length || 0)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${role}-chat-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Close panel", exact: true }).click();
      await expect(page.getByRole("button", { name: role === "teacher" ? "End" : "Leave", exact: true })).toBeInViewport();
      await page.getByRole("button", { name: role === "teacher" ? "End" : "Leave", exact: true }).click();
    });
  }

  for (const role of ["teacher", "student"] as const) for (const kind of ["audio", "video", "both"] as const) {
    test(`${role} adds ${kind}-only media after joining without tracks`, async ({ browser, backend }) => {
      test.setTimeout(60_000);
      const room = await pair(browser, backend, role, { audio: kind !== "video", video: kind !== "audio" });
      try {
        expect(await senderStates(room.actor)).toEqual([]);
        if (kind !== "video") await enable(room.actor, "audio");
        if (kind !== "audio") await enable(room.actor, "video");
        await expect.poll(() => senderStates(room.actor)).toEqual([
          ...(kind !== "video" ? [{ kind: "audio", enabled: true, state: "live" }] : []),
          ...(kind !== "audio" ? [{ kind: "video", enabled: true, state: "live" }] : []),
        ]);
        if (kind !== "video") {
          await room.actor.getByRole("button", { name: "Mute", exact: true }).click();
          await expect.poll(() => senderStates(room.actor)).toContainEqual({ kind: "audio", enabled: false, state: "live" });
        }
        if (kind !== "audio") {
          if (kind === "both") expect(await senderStates(room.actor)).toContainEqual({ kind: "video", enabled: true, state: "live" });
          await room.actor.getByRole("button", { name: "Camera off", exact: true }).click();
          await expect.poll(() => senderStates(room.actor)).toContainEqual({ kind: "video", enabled: false, state: "live" });
        }
        const requests = await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests as MediaStreamConstraints[]);
        expect(requests).toHaveLength(kind === "both" ? 2 : 1);
        if (kind === "audio") expect(requests[0]).toMatchObject({ video: false });
        if (kind === "video") expect(requests[0]).toMatchObject({ audio: false });
      } finally { await room.close(); }
    });
  }

  for (const role of ["teacher", "student"] as const) {
    test(`${role} can attach and remove devices without rejoining or automatic capture`, async ({ browser, backend }) => {
      test.setTimeout(60_000);
      const room = await pair(browser, backend, role, { audio: false, video: false });
      try {
        for (const name of ["Unmute", "Camera on"]) await expect(room.actor.getByRole("button", { name, exact: true })).toBeDisabled();
        await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").setInputs({ audio: true, video: true }));
        for (const name of ["Unmute", "Camera on"]) await expect(room.actor.getByRole("button", { name, exact: true })).toBeEnabled();
        expect(await senderStates(room.actor)).toEqual([]);
        expect(await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(0);
        await enable(room.actor, "audio"); await enable(room.actor, "video");
        await expect.poll(() => senderStates(room.actor)).toHaveLength(2);
        await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").disconnect("audio"));
        await expect(room.actor.getByRole("button", { name: "Unmute", exact: true })).toBeDisabled();
        await expect.poll(() => senderStates(room.actor)).toEqual([{ kind: "video", enabled: true, state: "live" }]);
        await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").setInputs({ audio: true }));
        await expect(room.actor.getByRole("button", { name: "Unmute", exact: true })).toBeEnabled();
        await enable(room.actor, "audio");
        await expect.poll(() => senderStates(room.actor)).toHaveLength(2);
        expect(await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").peers.length)).toBe(1);
      } finally { await room.close(); }
    });
  }

  for (const [kind, error] of [["audio", "NotAllowedError"], ["video", "NotAllowedError"], ["video", "NotReadableError"], ["audio", "OverconstrainedError"]] as const) {
    test(`${error} on ${kind} preserves the other source and meeting`, async ({ browser, backend }) => {
      test.setTimeout(60_000);
      const room = await pair(browser, backend, "teacher");
      const other = kind === "audio" ? "video" : "audio";
      try {
        await enable(room.actor, other);
        await room.actor.evaluate(([kind, error]) => Reflect.get(window, "classroomFixture").failInput(kind, error), [kind, error]);
        await enable(room.actor, kind);
        await expect.poll(() => room.actor.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(2);
        await expect.poll(() => senderStates(room.actor)).toEqual([{ kind: other, enabled: true, state: "live" }]);
        await expect(room.actor.getByRole("status").filter({ hasText: /Permission denied|Device is busy|Device settings unavailable/ })).toBeVisible();
        await room.actor.waitForTimeout(400);
        expect(await room.actor.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(2);
        await expect(room.actor.getByRole("button", { name: "End", exact: true })).toBeEnabled();
      } finally { await room.close(); }
    });
  }

  test("zero-device host records remote media and presentation through a native tab switch", async ({ backend, browser, headless }, info) => {
    test.setTimeout(150_000);
    const native = await nativeChrome(headless, false);
    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      await backend.install(native.context); await backend.install(studentContext);
      await native.context.grantPermissions([]);
      backend.rows.enrollments.push({ id: "recording-enrollment", user_id: users.student.id, course_id: C });
      const host = await native.context.newPage(), student = await studentContext.newPage();
      await host.setViewportSize({ width: 1440, height: 1000 });
      await patternDevices(host, "#a025d4", 440, { audio: false, video: false });
      await patternDevices(student, "#20be49", 880);
      await login(host, backend, "teacher"); await host.goto(`${mockOrigin}/live/test-room`); await enterClass(host);
      await login(student, backend, "student"); await student.goto("/live/test-room");
      await enterClass(student, { microphone: true, camera: true, consent: true });
      await host.bringToFront();
      await expect.poll(() => host.locator(`video[data-participant="${users.student.id}"]`).evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
      expect(await senderStates(host)).toEqual([]);
      await record(host); await host.waitForTimeout(2000);
      await expect(student.getByTestId("recording-notice")).toBeVisible();
      await host.getByRole("button", { name: "Share screen", exact: true }).click();
      await expect(student.getByTestId("tile-presentation")).toBeVisible();
      await expect.poll(() => student.locator('video[data-participant="presentation"]').evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
      await host.waitForTimeout(1500);
      const other = await native.context.newPage(); await other.goto("about:blank"); await other.bringToFront();
      await expect.poll(() => host.evaluate(() => document.visibilityState)).toBe("hidden");
      await other.waitForTimeout(5000); await host.bringToFront();
      await expect.poll(() => host.evaluate(() => document.visibilityState)).toBe("visible");
      await expect(host.getByTestId("recording-notice")).toBeVisible(); await other.close();
      await host.getByRole("button", { name: "Stop sharing", exact: true }).click();
      await expect(student.getByTestId("tile-presentation")).toHaveCount(0);
      await host.waitForTimeout(1500);
      const file = info.outputPath("device-free-meeting.webm"); await journalRecording(host, file);
      const media = inspectMedia(file);
      expect(media.bytes).toBeGreaterThan(10000); expect(media.videoFrames).toBeGreaterThan(6);
      expect(media.tones.student880).toBeGreaterThan(0.015); expect(media.tones.presentation1320).toBeGreaterThan(0.015);
      expect(media.tones.teacher440).toBeLessThan(0.001); expect(media.clippedSamples).toBe(0);
      expect(media.colorPixels.student).toBeGreaterThan(1000); expect(media.colorPixels.presentation).toBeGreaterThan(1000);
      expect(await host.evaluate(() => Reflect.get(window, "classroomFixture").captureRequests.length)).toBe(0);
      expect(await host.evaluate(() => Reflect.get(window, "classroomFixture").tracks.length)).toBe(0);
      await info.attach("device-free-decoded-media.json", { body: JSON.stringify(media, null, 2), contentType: "application/json" });
      await info.attach("device-free-lifecycle.json", { body: JSON.stringify(await host.evaluate(() => Reflect.get(window, "classroomFixture").events), null, 2), contentType: "application/json" });
      await host.screenshot({ path: info.outputPath("device-free-host.png"), fullPage: true });
      await host.getByRole("button", { name: "End", exact: true }).click();
    } finally { await studentContext.close(); await native.close(); }
  });

  test("placeholder-only recording contains silence without requesting input devices", async ({ page, backend }, info) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      const NativeRecorder = window.MediaRecorder;
      window.MediaRecorder = class extends NativeRecorder {
        constructor(stream: MediaStream, options?: MediaRecorderOptions) {
          super(stream, options);
          Reflect.set(window, "silentRecorder", this);
        }
      };
    });
    await withoutInputs(page); await login(page, backend, "teacher"); await page.goto("/live/test-room"); await enterClass(page);
    await record(page);
    await expect.poll(() => page.evaluate(() => (Reflect.get(window, "silentRecorder") as MediaRecorder | undefined)?.state)).toBe("recording");
    await page.waitForTimeout(3200);
    const file = info.outputPath("silent-placeholder.webm"); await journalRecording(page, file);
    const media = inspectMedia(file);
    expect(media.bytes).toBeGreaterThan(1000); expect(media.videoFrames).toBeGreaterThan(1);
    expect(media.audioRms).toBeLessThan(0.00001); expect(media.peakAmplitude).toBeLessThan(0.00001);
    expect(await page.evaluate(() => Reflect.get(window, "captureRequests"))).toBe(0);
    await info.attach("silent-decoded-media.json", { body: JSON.stringify(media, null, 2), contentType: "application/json" });
  });
});
