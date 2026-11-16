import { RecordingHealth, recordingDeadline } from "./recording-health";
import { createRecordingEncoder, encoderDeadline, verifyRecordingVideo } from "./recording-encoder";
import {
  saveChunk,
  saveDraft,
  type RecordingDraft,
  recordingBlob,
} from "./recording-store";

export type RecordingState =
  | "idle"
  | "starting"
  | "recording"
  | "stopping"
  | "processing"
  | "completed"
  | "failed";
export interface MeetingSource {
  id: string;
  name: string;
  stream: MediaStream | null;
  cameraOff: boolean;
  muted: boolean;
  consent: boolean;
}
export interface MeetingMedia {
  participants: MeetingSource[];
  screen: MediaStream | null;
}
export const RECORDING_LIMIT_BYTES = 128 * 1024 * 1024;

/** Keeps the recorder's two output tracks stable while input tracks change. */
export class MeetingRecorder {
  state: RecordingState = "idle";
  draft: RecordingDraft;
  private recorder?: MediaRecorder;
  private context?: AudioContext;
  private destination?: MediaStreamAudioDestinationNode;
  private canvas?: HTMLCanvasElement;
  private output?: MediaStream;
  private timer?: ReturnType<typeof setInterval>;
  private started = 0;
  private stopped = 0;
  private lastChunk = 0;
  private health = new RecordingHealth();
  private silence?: ConstantSourceNode;
  private bytes = 0;
  private index = 0;
  private pending = Promise.resolve();
  private completion?: Promise<Blob>;
  private resolve?: (blob: Blob) => void;
  private reject?: (error: Error) => void;
  private audios = new Map<string, MediaStreamAudioSourceNode>();
  private videos = new Map<string, HTMLVideoElement>();
  private failure?: Error;
  private cancelled = false;
  private mix?: DynamicsCompressorNode;
  private rejectStartup?: (error: Error) => void;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private finalizing = false;

  constructor(
    draft: Pick<RecordingDraft, "id" | "userId" | "classId" | "title">,
    private media: () => MeetingMedia,
    private changed: (
      state: RecordingState,
      seconds: number,
      error?: string,
    ) => void,
    private warning: () => void = () => undefined,
  ) {
    this.draft = {
      ...draft,
      mime: "",
      createdAt: Date.now(),
      duration: 0,
      complete: false,
    };
  }
  private transition(state: RecordingState, error?: string) {
    const previousState = this.state;
    const previousDuration = this.draft.duration;
    this.state = state;
    this.draft.duration = this.started
      ? Math.floor(((this.stopped || Date.now()) - this.started) / 1000)
      : 0;
    if (
      previousState !== state ||
      previousDuration !== this.draft.duration ||
      error
    )
      this.changed(state, this.draft.duration, error);
  }
  async start() {
    if (this.state !== "idle") return;
    this.transition("starting");
    try {
      if (
        !window.MediaRecorder ||
        !HTMLCanvasElement.prototype.captureStream ||
        !window.AudioContext
      )
        throw new Error(
          "Meeting recording is unsupported in this browser. Use desktop Chrome.",
        );
      await recordingDeadline(saveDraft(this.draft), "Local recording storage");
      if (this.cancelled) throw new Error("Recording cancelled.");
      this.canvas = document.createElement("canvas");
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.context = new AudioContext();
      this.destination = this.context.createMediaStreamDestination();
      this.mix = this.context.createDynamicsCompressor();
      this.mix.threshold.value = -8;
      this.mix.ratio.value = 12;
      this.mix.connect(this.destination);
      // A real zero-valued source keeps the output graph valid with no devices.
      this.silence = this.context.createConstantSource();
      this.silence.offset.value = 0;
      this.silence.connect(this.mix);
      this.silence.start();
      await recordingDeadline(this.context.resume(), "Recording audio startup");
      if (this.context.state !== "running")
        throw new Error(`Recording audio initialization failed: AudioContext is ${this.context.state}. Keep the classroom visible and retry.`);
      if (this.cancelled) throw new Error("Recording cancelled.");
      this.output = new MediaStream([
        ...this.canvas.captureStream(15).getVideoTracks(),
        ...this.destination.stream.getAudioTracks(),
      ]);
      // Capture must exist before drawing, and frames must continue while the
      // encoder is starting. Waiting for onstart before drawing deadlocks Chrome.
      this.update();
      this.timer = setInterval(() => {
        try {
          this.update();
          if (this.state !== "recording") return;
          if (this.output!.getTracks().some(t => t.readyState !== "live"))
            throw new Error("Recording media ended unexpectedly. Saved chunks remain on this device.");
          if (this.health.observe(Date.now(), this.context!.currentTime, this.lastChunk)) {
            this.draft.captureInterrupted = true;
            this.warning();
          }
          if (Date.now() - this.started > 30 * 60 * 1000)
            void this.stop().catch(() => undefined);
          else this.transition("recording");
        } catch (error) {
          this.fail(error);
        }
      }, 1000 / 15);
      document.addEventListener("visibilitychange", this.visibility);
      await verifyRecordingVideo(new MediaStream(this.output.getVideoTracks()));
      if (this.cancelled || this.failure) throw this.failure || new Error("Recording cancelled.");
      this.recorder = createRecordingEncoder(this.output);
      this.draft.mime = this.recorder.mimeType;
      await recordingDeadline(saveDraft(this.draft), "Local recording storage");
      if (this.cancelled || this.failure) throw this.failure || new Error("Recording cancelled.");
      this.completion = new Promise<Blob>((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
      // Auto-stop errors remain visible even before the user asks for the result.
      void this.completion.catch(() => undefined);
      this.recorder.ondataavailable = ({ data }) => {
        if (!data.size) return;
        this.lastChunk = Date.now();
        this.bytes += data.size;
        const index = this.index++;
        this.pending = this.pending
          .then(async () => {
            await encoderDeadline(saveChunk(this.draft.id, index, data), "Recording chunk storage");
          })
          .catch((error) => {
            this.fail(error);
          });
        if (this.bytes >= RECORDING_LIMIT_BYTES)
          void this.stop().catch(() => undefined);
      };
      this.recorder.onerror = (event) =>
        this.fail(
          new Error(
            `The browser interrupted recording. Encoder failure${"error" in event && event.error instanceof DOMException ? ` (${event.error.name}: ${event.error.message})` : ""}. Saved chunks remain available for recovery.`,
          ),
        );
      this.recorder.onstop = () => {
        if (["starting", "recording"].includes(this.state) && !this.failure)
          this.fail(new Error("Recording encoder stopped unexpectedly. Saved chunks remain on this device."));
        void this.finalize();
      };
      await encoderDeadline(new Promise<void>((resolve, reject) => {
        this.rejectStartup = reject;
        this.recorder!.onstart = () => {
          if (this.cancelled || this.failure || this.recorder!.state !== "recording" ||
            this.context!.state !== "running" || this.output!.getTracks().some(t => t.readyState !== "live")) {
            reject(this.failure || new Error("Recording encoder did not enter an active state."));
          } else resolve();
        };
        this.recorder!.start(1000);
      }), "Recording encoder startup");
      this.rejectStartup = undefined;
      if (this.cancelled || this.failure) throw this.failure || new Error("Recording cancelled.");
      this.started = Date.now();
      this.lastChunk = this.started;
      this.health.observe(this.started, this.context.currentTime, this.lastChunk);
      this.transition("recording");
    } catch (error) {
      this.fail(error instanceof DOMException
        ? new Error(`Recording media initialization failed (${error.name}): ${error.message}`)
        : error);
      if (this.completion) await this.completion.catch(() => undefined);
      else this.cleanup();
      throw this.failure;
    }
  }
  private visibility = () => {
    // Background video may freeze; audio and stable output tracks are retained.
    if (!document.hidden && this.state === "recording") {
      if (this.context) void recordingDeadline(this.context.resume(), "Recording audio recovery").catch((error) => this.fail(error));
      try {
        this.update();
        this.transition("recording");
      } catch (error) {
        this.fail(error);
      }
    }
  };
  private fail(error: unknown) {
    this.failure ||=
      error instanceof Error ? error : new Error("Recording failed");
    this.rejectStartup?.(this.failure);
    this.rejectStartup = undefined;
    this.stopped ||= Date.now();
    if (this.state !== "failed") this.transition("failed", this.failure.message);
    if (this.recorder && this.completion) this.requestStop();
    else this.cleanup();
  }
  private requestStop() {
    if (this.recorder && this.recorder.state !== "inactive") {
      try { this.recorder.stop(); }
      catch (error) {
        this.failure ||= error instanceof Error ? error : new Error("Recording encoder could not stop.");
        void this.finalize();
        return;
      }
    }
    // Stop/error must settle even if a broken encoder never delivers onstop.
    if (!this.stopTimer && !this.finalizing) {
      this.stopTimer = setTimeout(() => {
        this.failure ||= new Error("Recording encoder finalization timed out. Saved chunks remain on this device.");
        void this.finalize();
      }, 10_000);
    }
  }
  private update() {
    if (!this.canvas || !this.context || !this.destination) return;
    const media = this.media();
    const people = media.participants.filter((p) => p.consent);
    const streams = [
      ...people.filter((p) => !p.muted).map((p) => p.stream),
      media.screen,
    ].filter((s): s is MediaStream => !!s);
    const tracks = new Map(
      streams
        .flatMap((s) => s.getAudioTracks())
        .filter((t) => t.readyState === "live")
        .map((t) => [t.id, t]),
    );
    for (const [id, node] of this.audios)
      if (!tracks.has(id)) {
        node.disconnect();
        this.audios.delete(id);
      }
    for (const [id, track] of tracks)
      if (!this.audios.has(id)) {
        const node = this.context.createMediaStreamSource(
          new MediaStream([track]),
        );
        node.connect(this.mix!);
        this.audios.set(id, node);
      }
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Video composition is unavailable");
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, 1280, 720);
    const liveVideos = new Set<string>();
    const tile = (
      id: string,
      name: string,
      stream: MediaStream | null,
      off: boolean,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      liveVideos.add(id);
      let video = this.videos.get(id);
      if (!video) {
        video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        this.videos.set(id, video);
      }
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        if (stream) void video.play().catch(() => undefined);
      }
      ctx.fillStyle = "#18243a";
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      if (!off && video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(
          (w - 8) / video.videoWidth,
          (h - 8) / video.videoHeight,
        );
        const vw = video.videoWidth * scale,
          vh = video.videoHeight * scale;
        ctx.drawImage(video, x + (w - vw) / 2, y + (h - vh) / 2, vw, vh);
      } else {
        ctx.fillStyle = "#b8c7e4";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(name.slice(0, 2).toUpperCase(), x + w / 2, y + h / 2);
      }
      ctx.textAlign = "left";
      ctx.fillStyle = "#0b1220cc";
      ctx.fillRect(x + 8, y + h - 40, w - 16, 32);
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px sans-serif";
      ctx.fillText(name.slice(0, 36), x + 16, y + h - 18);
    };
    if (media.screen) {
      tile("screen", "Presentation", media.screen, false, 0, 0, 1030, 720);
      people.forEach((p, i) =>
        tile(
          p.id,
          p.name,
          p.stream,
          p.cameraOff,
          1030,
          i * (720 / Math.max(people.length, 1)),
          250,
          720 / Math.max(people.length, 1),
        ),
      );
    } else {
      const columns = people.length > 1 ? (people.length > 4 ? 3 : 2) : 1;
      const rows = Math.ceil(people.length / columns) || 1;
      people.forEach((p, i) =>
        tile(
          p.id,
          p.name,
          p.stream,
          p.cameraOff,
          ((i % columns) * 1280) / columns,
          (Math.floor(i / columns) * 720) / rows,
          1280 / columns,
          720 / rows,
        ),
      );
    }
    for (const [id, video] of this.videos)
      if (!liveVideos.has(id)) {
        video.pause();
        video.srcObject = null;
        this.videos.delete(id);
      }
  }
  abort() {
    this.cancelled = true;
    if (this.state === "starting") this.fail(new Error("Recording cancelled."));
    if (this.state === "recording") void this.stop().catch(() => undefined);
  }
  stop(): Promise<Blob> {
    if (this.state === "recording") {
      this.stopped = Date.now();
      this.transition("stopping");
      this.requestStop();
    }
    return (
      this.completion || Promise.reject(new Error("No recording is available"))
    );
  }
  private async finalize() {
    if (this.finalizing) return;
    this.finalizing = true;
    clearTimeout(this.stopTimer);
    this.stopped ||= Date.now();
    if (!this.failure) this.transition("processing");
    this.cleanup();
    await this.pending;
    try {
      this.draft.duration = this.started ? Math.floor((this.stopped - this.started) / 1000) : 0;
      if (this.failure) throw this.failure;
      const blob = await encoderDeadline(recordingBlob(this.draft), "Recording draft recovery");
      if (blob.size < 100)
        throw new Error("Recording contains no playable media");
      await verifyRecordingVideo(blob);
      this.draft.complete = true;
      await encoderDeadline(saveDraft(this.draft), "Recording draft finalization");
      this.transition("completed");
      this.resolve?.(blob);
    } catch (error) {
      this.draft.complete = false;
      await encoderDeadline(saveDraft(this.draft), "Recording recovery metadata").catch(() => undefined);
      const failure =
        error instanceof Error
          ? error
          : new Error("Recording could not be finalized");
      this.failure ||= failure;
      if (this.state !== "failed") this.transition("failed", this.failure.message);
      this.reject?.(failure);
    }
  }
  private cleanup() {
    clearInterval(this.timer);
    clearTimeout(this.stopTimer);
    document.removeEventListener("visibilitychange", this.visibility);
    this.silence?.stop();
    this.silence?.disconnect();
    this.silence = undefined;
    this.output?.getTracks().forEach((t) => t.stop());
    this.audios.forEach((n) => n.disconnect());
    this.audios.clear();
    void this.context?.close().catch(() => undefined);
    this.videos.forEach((v) => {
      v.pause();
      v.srcObject = null;
    });
    this.videos.clear();
  }
}
