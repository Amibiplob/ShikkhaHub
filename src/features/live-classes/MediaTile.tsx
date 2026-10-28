import { useEffect, useRef, useState } from "react";
import { MicOff, VideoOff } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { Participant } from "./useWebRTCBroadcast";
let meterContext: AudioContext | null = null;
let meters = 0;
export default function MediaTile({
  participant,
  local = false,
  presentation = false,
}: {
  participant: Participant;
  local?: boolean;
  presentation?: boolean;
}) {
  const { lang } = useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const { stream, cameraOff, muted, name, id } = participant;
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    if (stream) void element.play().catch(() => undefined);
    return () => {
      element.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    if (
      !stream?.getAudioTracks().length ||
      muted ||
      presentation ||
      !window.AudioContext
    )
      return;
    let source: MediaStreamAudioSourceNode;
    let timer: ReturnType<typeof setInterval>;
    try {
      meterContext ||= new AudioContext();
      source = meterContext.createMediaStreamSource(stream);
      meters++;
      const analyser = meterContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);
      timer = setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        setSpeaking(buffer.some((v) => Math.abs(v - 128) > 10));
      }, 350);
    } catch {
      return;
    }
    return () => {
      clearInterval(timer);
      source?.disconnect();
      if (--meters === 0) {
        void meterContext?.close().catch(() => undefined);
        meterContext = null;
      }
    };
  }, [stream, muted, presentation]);
  return (
    <article
      data-testid={`tile-${id}`}
      aria-label={`${name}${presentation ? " presentation" : ""}`}
      className={`relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-slate-900 ${speaking && !muted ? "border-emerald-400" : "border-white/10"} ${presentation ? "h-full" : "aspect-video max-h-[65dvh]"}`}
    >
      <video
        data-participant={id}
        ref={video}
        autoPlay
        playsInline
        muted={local || muted}
        className={`h-full max-h-[65dvh] w-full object-contain ${cameraOff && !presentation ? "opacity-0" : ""}`}
      />
      {cameraOff && !presentation && (
        <div className="absolute inset-x-0 top-0 bottom-10 flex flex-col items-center justify-center gap-2 text-slate-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/25 text-xl font-semibold text-indigo-100">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs">
            <VideoOff className="mr-2 inline h-3 w-3" />
            {lang === "bn" ? "ক্যামেরা বন্ধ" : "Camera off"}
          </span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex min-w-0 items-center justify-between gap-2 rounded-lg bg-slate-950/80 px-3 py-1.5 text-xs text-white">
        <span className="truncate">
          {name}
          {local ? (lang === "bn" ? " · আপনি" : " · You") : ""}
        </span>
        {muted && (
          <MicOff
            aria-label="Microphone muted"
            className="h-3.5 w-3.5 shrink-0"
          />
        )}
      </div>
    </article>
  );
}
