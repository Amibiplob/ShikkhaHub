import { expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

export async function record(page: Page) {
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I consent — start recording", exact: true })
    .click();
  await expect(page.getByTestId("recording-notice")).toBeVisible();
}
export async function journalRecording(page: Page, path: string) {
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

export function inspectMedia(file: string) {
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", file],
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
    audioRms: Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / Math.max(samples.length, 1)),
    videoFrames: Number(probe.streams.find((s: Record<string, unknown>) => s.codec_type === "video")?.nb_read_frames || 0),
    sampledVideoFrames: frames.length / (160 * 90 * 3),
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
