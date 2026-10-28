import type { Page } from "@playwright/test";

/** TEST ONLY: real generated canvas/audio tracks; HTTP and signaling stay fixtures. */
export async function patternDevices(
  page: Page,
  color: string,
  frequency: number,
  inputs = { audio: true, video: true },
) {
  await page.addInitScript(
    ({ color, frequency, inputs }) => {
      const events: object[] = [];
      const tracks: MediaStreamTrack[] = [];
      const recorders: MediaRecorder[] = [];
      const peers: RTCPeerConnection[] = [];
      const captureRequests: MediaStreamConstraints[] = [];
      const failures: Partial<Record<"audio" | "video", string>> = {};
      const NativeAudio = window.AudioContext;
      window.AudioContext = class extends NativeAudio {
        constructor(options?: AudioContextOptions) {
          super(options);
          const id = events.length;
          this.addEventListener("statechange", () => events.push({
            event: "audio-context", id, state: this.state,
            audioTime: this.currentTime, time: Date.now(),
          }));
        }
      };
      let display: MediaStream | null = null;
      let denyScreen = false;
      let cameraDelay = 0;
      let cameraHold: Promise<void> | undefined;
      let releaseCamera: (() => void) | undefined;
      const NativeRecorder = window.MediaRecorder;
      window.MediaRecorder = class extends NativeRecorder {
        constructor(stream: MediaStream, options?: MediaRecorderOptions) {
          super(stream, options);
          recorders.push(this);
          for (const type of ["start", "stop", "error", "dataavailable"])
            this.addEventListener(type, (event) =>
              events.push({
                event: type,
                state: this.state,
                time: Date.now(),
                bytes: event instanceof BlobEvent ? event.data.size : undefined,
                tracks: stream
                  .getTracks()
                  .map((t) => ({
                    id: t.id,
                    kind: t.kind,
                    state: t.readyState,
                  })),
              }),
            );
        }
      };
      const NativePeer = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends NativePeer {
        constructor(options?: RTCConfiguration) {
          super(options);
          peers.push(this);
          this.addEventListener("connectionstatechange", () =>
            events.push({
              event: "peer",
              state: this.connectionState,
              time: Date.now(),
            }),
          );
        }
      };
      window.addEventListener("visibilitychange", () =>
        events.push({
          event: "visibility",
          state: document.visibilityState,
          time: Date.now(),
        }),
      );
      window.addEventListener("unhandledrejection", (event) =>
        events.push({ event: "rejection", message: String(event.reason) }),
      );
      const audio = (hz: number) => {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const out = ctx.createMediaStreamDestination();
        oscillator.frequency.value = hz;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(out);
        oscillator.start();
        void ctx.resume();
        const track = out.stream.getAudioTracks()[0];
        const stop = track.stop.bind(track);
        let stopped = false;
        track.stop = () => {
          if (stopped) return;
          stopped = true;
          stop();
          oscillator.stop();
          void ctx.close().catch(() => undefined);
        };
        return track;
      };
      const video = (fill: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d")!;
        let frame = 0;
        const draw = () => {
          ctx.fillStyle = fill;
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = "white";
          ctx.font = "32px sans-serif";
          ctx.fillText(`Media fixture ${++frame}`, 25, 55);
        };
        draw();
        const timer = setInterval(draw, 66);
        const track = canvas.captureStream(15).getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => {
          stop();
          clearInterval(timer);
        };
        return track;
      };
      const native = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      const enumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      navigator.mediaDevices.enumerateDevices = async () => (await enumerate()).filter(d =>
        d.kind === "audioinput" ? inputs.audio : d.kind === "videoinput" ? inputs.video : true);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        captureRequests.push(constraints || {});
        const kind = constraints?.audio ? "audio" : "video";
        if (!inputs[kind]) throw new DOMException("Device absent in fixture", "NotFoundError");
        if (failures[kind]) throw new DOMException("Device failure in fixture", failures[kind]);
        // Actual Chrome fake-device permission/capture path is exercised first.
        const permission = await native(constraints);
        permission.getTracks().forEach((t) => t.stop());
        if (constraints?.video && cameraHold) await cameraHold;
        if (constraints?.video && cameraDelay)
          await new Promise((resolve) => setTimeout(resolve, cameraDelay));
        const next = [
          constraints?.audio ? audio(frequency) : null,
          constraints?.video ? video(color) : null,
        ].filter((t): t is MediaStreamTrack => !!t);
        tracks.push(...next);
        return new MediaStream(next);
      };
      navigator.mediaDevices.getDisplayMedia = async () => {
        if (denyScreen)
          throw new DOMException("Permission denied", "NotAllowedError");
        display = new MediaStream([video("#ed8b19"), audio(1320)]);
        return display;
      };
      Object.assign(window, {
        classroomFixture: {
          events,
          tracks,
          recorders,
          peers,
          captureRequests,
          setInputs: (next: Partial<typeof inputs>) => {
            Object.assign(inputs, next);
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
          },
          failInput: (kind: "audio" | "video", error?: string) => { failures[kind] = error; },
          disconnect: (kind: "audio" | "video") => {
            inputs[kind] = false;
            for (const track of tracks.filter(t => t.kind === kind && t.readyState === "live")) {
              track.stop();
              track.dispatchEvent(new Event("ended"));
            }
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
          },
          delayCamera: () => {
            cameraDelay = 700;
          },
          holdCamera: () => { cameraHold = new Promise(resolve => { releaseCamera = resolve; }); },
          releaseCamera: () => { releaseCamera?.(); cameraHold = undefined; },
          stopScreen: () => {
            const track = display?.getVideoTracks()[0];
            track?.stop();
            track?.dispatchEvent(new Event("ended"));
          },
          denyScreen: () => {
            denyScreen = true;
          },
        },
      });
    },
    { color, frequency, inputs },
  );
}
