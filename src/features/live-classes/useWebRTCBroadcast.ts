import { useCallback, useEffect, useRef, useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import {
  MeetingRecorder,
  type RecordingState,
  type MeetingSource,
} from "./MeetingRecorder";

export const MAX_STUDENTS = 6;
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}
export interface Participant extends MeetingSource {
  slot: number;
  connected: boolean;
}
type Roster = Omit<Participant, "stream">[];
type Peer = {
  pc: RTCPeerConnection;
  slot: number;
  timer?: ReturnType<typeof setTimeout>;
};
export type MediaKind = "audio" | "video";
export function mediaError(error: unknown) {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "NotAllowedError")
    return "Permission denied. Allow the requested device in browser settings and retry.";
  if (name === "NotFoundError")
    return "Device unavailable. Connect a microphone or camera and retry.";
  if (name === "NotReadableError")
    return "Device is busy or disconnected. Close other apps using it and retry.";
  if (name === "OverconstrainedError")
    return "Device settings unavailable. Choose another input or the default device and retry.";
  if (["SecurityError", "NotSupportedError", "TypeError"].includes(name))
    return "Device capture is unavailable in this browser. You can still join without devices.";
  return error instanceof Error
    ? error.message
    : "Media unavailable. Check your devices and retry.";
}

/** Host-originated, fixed transceivers preserve the existing private signaling model.
 * Slots relay each consenting participant once, excluding their own return audio. */
export function useClassroomMedia(
  room: string,
  userId: string,
  name: string,
  hostId: string,
) {
  const host = userId === hostId;
  const [active, setActive] = useState(false);
  const [connection, setConnection] = useState("idle");
  const [ended, setEnded] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hands, setHands] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [localMedia, setLocalMedia] = useState({
    stream: null as MediaStream | null, muted: true, cameraOff: true, consent: false,
  });
  const [deviceErrors, setDeviceErrors] = useState<Partial<Record<MediaKind, string>>>({});
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingNotice, setRecordingNotice] = useState(false);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peers = useRef(new Map<string, Peer>());
  const roster = useRef<Participant[]>([]);
  const local = useRef<MediaStream | null>(null);
  const presentation = useRef<MediaStream | null>(null);
  const recorder = useRef<MeetingRecorder | null>(null);
  const starting = useRef(false);
  const mediaBusy = useRef(false);
  const deviceBusy = useRef(new Map<"audio" | "video", symbol>());
  const epoch = useRef(0);
  const ice = useRef(new Map<string, RTCIceCandidateInit[]>());
  const handTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const isRecording = useRef(false);
  const own = useRef({ muted: true, cameraOff: true, consent: false });
  const names = useRef({ name, hostId });
  useEffect(() => {
    names.current = { name, hostId };
  }, [name, hostId]);

  const signal = useCallback(
    async (event: string, payload: object = {}) => {
      try {
        const { error } = await supabase.rpc("send_live_signal", {
          room,
          signal_event: event,
          signal_payload: payload as Json,
        });
        if (error) throw error;
        return true;
      } catch {
        setError("Live connection failed. Check your access and retry.");
        return false;
      }
    },
    [room],
  );
  const publish = useCallback(() => {
    setParticipants([...roster.current]);
  }, []);
  const me = useCallback(
    (): Participant => ({
      id: userId,
      name: names.current.name,
      stream: local.current,
      slot: -1,
      connected: true,
      ...own.current,
    }),
    [userId],
  );
  const state = useCallback(
    () => roster.current.map(({ stream: _stream, ...p }) => p),
    [],
  );
  const announce = useCallback(
    () =>
      signal("meeting-state", {
        roster: state(),
        recording: isRecording.current,
        presenting: !!presentation.current,
      }),
    [signal, state],
  );
  const replace = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    for (const [id, peer] of peers.current) {
      if (peer.pc.signalingState === "closed") continue;
      const transceivers = peer.pc.getTransceivers();
      const put = (index: number, track?: MediaStreamTrack) => {
        const sender = transceivers[index]?.sender;
        if (sender && sender.track !== (track || null))
          tasks.push(sender.replaceTrack(track || null));
      };
      put(0, local.current?.getAudioTracks()[0]);
      put(1, local.current?.getVideoTracks()[0]);
      if (host) {
        put(2, presentation.current?.getVideoTracks()[0]);
        put(3, presentation.current?.getAudioTracks()[0]);
        for (let slot = 0; slot < MAX_STUDENTS; slot++) {
          const p = roster.current.find(
            (p) => p.slot === slot && p.id !== id && p.consent,
          );
          put(4 + slot * 2, p?.stream?.getAudioTracks()[0]);
          put(5 + slot * 2, p?.stream?.getVideoTracks()[0]);
        }
      }
    }
    const results = await Promise.allSettled(tasks);
    if (results.some((r) => r.status === "rejected"))
      setError(
        "A media track could not be updated. Reconnect if the participant cannot hear or see you.",
      );
  }, [host]);
  const updateMe = useCallback(async () => {
    setLocalMedia({ stream: local.current, ...own.current });
    // A local preview is not meeting admission or permission to broadcast.
    if (!channel.current) return;
    roster.current = [me(), ...roster.current.filter((p) => p.id !== userId)];
    publish();
    await replace();
    if (host) await announce();
    else await signal("media-state", own.current);
  }, [me, userId, publish, replace, host, announce, signal]);
  const safe = useCallback((work: () => Promise<unknown>) => {
    void work().catch((e) => setError(mediaError(e)));
  }, []);
  const addCandidates = useCallback(
    async (id: string, pc: RTCPeerConnection) => {
      for (const candidate of ice.current.get(id) || []) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* Candidate belongs to a closed ICE generation. */
        }
      }
      ice.current.delete(id);
    },
    [],
  );
  const removePeer = useCallback(
    (id: string) => {
      const peer = peers.current.get(id);
      clearTimeout(peer?.timer);
      peer?.pc.close();
      peers.current.delete(id);
      ice.current.delete(id);
      roster.current = roster.current.filter((p) => p.id !== id);
      publish();
    },
    [publish],
  );
  const wire = useCallback(
    (id: string, peer: Peer) => {
      const pc = peer.pc;
      pc.onicecandidate = (e) => {
        if (e.candidate)
          void signal("ice-candidate", {
            targetId: id,
            candidate: e.candidate.toJSON(),
          });
      };
      pc.onconnectionstatechange = () => {
        if (peers.current.get(id)?.pc !== pc) return;
        clearTimeout(peer.timer);
        if (pc.connectionState === "connected") {
          setConnection("connected");
          roster.current = roster.current.map((p) =>
            p.id === id ? { ...p, connected: true } : p,
          );
          publish();
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setConnection("reconnecting");
          // A transient disconnection does not destroy the stream. Give ICE time to recover.
          peer.timer = setTimeout(
            () => {
              if (host) {
                removePeer(id);
                safe(async () => {
                  await replace();
                  await announce();
                });
              } else {
                removePeer(id);
                void signal("join-request", { ...own.current });
              }
            },
            pc.connectionState === "failed" ? 1500 : 10_000,
          );
        }
      };
    },
    [signal, publish, host, removePeer, safe, replace, announce],
  );
  const receiveState = useCallback(
    (list: Roster) => {
      if (!Array.isArray(list)) return;
      const receivers = peers.current
        .get(names.current.hostId)
        ?.pc.getTransceivers();
      roster.current = list.map((p) => {
        const offset = p.id === names.current.hostId ? 0 : 4 + p.slot * 2;
        const tracks = [
          receivers?.[offset]?.receiver.track,
          receivers?.[offset + 1]?.receiver.track,
        ].filter((t): t is MediaStreamTrack => !!t);
        return {
          ...p,
          stream:
            p.id === userId
              ? local.current
              : tracks.length
                ? new MediaStream(tracks)
                : roster.current.find((old) => old.id === p.id)?.stream ||
                  new MediaStream(),
        };
      });
      publish();
    },
    [publish, userId],
  );
  const stopScreen = useCallback(async () => {
    const old = presentation.current;
    presentation.current = null;
    setScreen(null);
    old?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    await replace();
    if (host && channel.current) await announce();
  }, [replace, host, announce]);
  const shareScreen = useCallback(async () => {
    if (!host || mediaBusy.current) return;
    mediaBusy.current = true;
    setBusy(true);
    const generation = epoch.current;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error("Screen sharing is unsupported in this browser.");
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true,
      });
      if (generation !== epoch.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      const old = presentation.current;
      presentation.current = next;
      setScreen(next);
      next.getVideoTracks()[0].onended = () => safe(stopScreen);
      await replace();
      if (channel.current) await announce();
      old?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      return true;
    } catch (e) {
      setError(mediaError(e));
      return false;
    } finally {
      mediaBusy.current = false;
      setBusy(deviceBusy.current.size > 0);
    }
  }, [host, safe, stopScreen, replace, announce]);

  const acquire = useCallback(
    async (kind: "audio" | "video", deviceId?: string, enabled = true) => {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Devices require a supported browser and a secure connection.",
        );
      const generation = epoch.current;
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "audio"
          ? {
              audio: deviceId && deviceId !== "default"
                ? { deviceId: { exact: deviceId }, echoCancellation: true }
                : { echoCancellation: true },
              video: false,
            }
          : {
              audio: false,
              video: {
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 15, max: 24 },
                ...(deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : {}),
              },
            },
      );
      if (generation !== epoch.current) {
        stream.getTracks().forEach((t) => t.stop());
        throw new DOMException("Media request cancelled", "AbortError");
      }
      const track = stream.getTracks()[0];
      if (!track) throw new DOMException("No requested device track", "NotFoundError");
      // Apply privacy state before exposing a replacement to any sender.
      track.enabled = enabled;
      const existing = local.current?.getTracks() || [];
      const old = existing.filter((t) => t.kind === kind);
      // A new stream identity also reconnects video elements and audio meters
      // to a changed input; a Web Audio source stays bound to its original track.
      local.current = new MediaStream([
        ...existing.filter((t) => t.kind !== kind),
        track,
      ]);
      track.onended = () => {
        local.current = new MediaStream(local.current?.getTracks().filter(t => t !== track) || []);
        own.current = {
          ...own.current,
          ...(kind === "audio" ? { muted: true } : { cameraOff: true }),
        };
        setDeviceErrors((previous) => ({ ...previous,
          [kind]: `${kind === "audio" ? "Microphone" : "Camera"} disconnected. Select a device to recover.`,
        }));
        safe(updateMe);
      };
      await replace();
      old.forEach((t) => {
        t.onended = null;
        t.stop();
      });
      return track;
    },
    [replace, safe, updateMe],
  );
  const device = useCallback(
    async (kind: MediaKind, deviceId?: string, consent = false) => {
      if (deviceBusy.current.has(kind)) return;
      if (channel.current && !own.current.consent && !consent) {
        return;
      }
      if (channel.current && consent) own.current.consent = true;
      const generation = epoch.current;
      const ticket = Symbol(kind);
      deviceBusy.current.set(kind, ticket);
      setBusy(true);
      setDeviceErrors((previous) => ({ ...previous, [kind]: undefined }));
      try {
        const off =
          kind === "audio" ? own.current.muted : own.current.cameraOff;
        let track = local.current
          ?.getTracks()
          .find((t) => t.kind === kind && t.readyState === "live");
        if (!track || deviceId)
          track = await acquire(kind, deviceId, deviceId ? !off : off);
        if (generation !== epoch.current) return;
        track.enabled = deviceId ? !off : off;
        own.current = {
          ...own.current,
          ...(kind === "audio"
            ? { muted: !track.enabled }
            : { cameraOff: !track.enabled }),
        };
      } catch (e) {
        if (generation === epoch.current)
          setDeviceErrors((previous) => ({ ...previous, [kind]: mediaError(e) }));
      } finally {
        if (generation === epoch.current) {
          try { await updateMe(); }
          catch (e) { if (generation === epoch.current) setError(mediaError(e)); }
        }
        if (deviceBusy.current.get(kind) === ticket)
          deviceBusy.current.delete(kind);
        setBusy(mediaBusy.current || deviceBusy.current.size > 0);
      }
    },
    [acquire, updateMe],
  );

  const dispose = useCallback(() => {
    epoch.current++;
    starting.current = false;
    deviceBusy.current.clear();
    handTimers.current.forEach((timer) => clearTimeout(timer));
    handTimers.current.clear();
    recorder.current?.abort();
    isRecording.current = false;
    local.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    local.current = null;
    own.current = { muted: true, cameraOff: true, consent: false };
    presentation.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    presentation.current = null;
    for (const p of peers.current.values()) {
      clearTimeout(p.timer);
      p.pc.close();
    }
    peers.current.clear();
    ice.current.clear();
    if (channel.current)
      void supabase.removeChannel(channel.current).catch(() => undefined);
    channel.current = null;
    roster.current = [];
  }, []);
  useEffect(() => () => dispose(), [dispose, room, userId]);
  const leave = useCallback(async () => {
    if (channel.current) await signal(host ? "teacher-ended" : "leave");
    dispose();
    setActive(false);
    setScreen(null);
    setParticipants([]);
    setHands([]);
    setRecordingNotice(false);
    setRecordingState((current) => current === "starting" ? "idle" : current);
    setConnection("idle");
    setLocalMedia({ stream: null, muted: true, cameraOff: true, consent: false });
    setDeviceErrors({});
  }, [host, signal, dispose]);

  const join = useCallback(
    async (consent: boolean) => {
      if (starting.current || channel.current) return;
      starting.current = true;
      setJoining(true);
      setBusy(true);
      setError("");
      setEnded(false);
      setConnection("connecting");
      // Admission never waits for a device prompt. Cancel unfinished preview
      // requests; reuse only tracks the user already enabled intentionally.
      const generation = ++epoch.current;
      deviceBusy.current.clear();
      try {
        own.current = {
          ...own.current,
          consent: host || consent,
        };
        if (!own.current.consent) {
          local.current?.getTracks().forEach((t) => { t.onended = null; t.stop(); });
          local.current = null;
          own.current = { muted: true, cameraOff: true, consent: false };
        }
        local.current ||= new MediaStream();
        setLocalMedia({ stream: local.current, ...own.current });
        if (generation !== epoch.current) return;
        roster.current = [me()];
        publish();
        const ch = supabase.channel(`live-${room}`, {
          config: { private: true, broadcast: { self: false } },
        });
        channel.current = ch;
        ch.on("broadcast", { event: "join-request" }, ({ payload }) => {
          if (!host || payload.fromId === userId) return;
          const previous = peers.current.get(payload.fromId);
          if (
            previous &&
            !["failed", "disconnected", "closed"].includes(
              previous.pc.connectionState,
            )
          )
            return;
          if (previous) removePeer(payload.fromId);
          safe(async () => {
            const slot = Array.from({ length: MAX_STUDENTS }, (_, i) => i).find(
              (i) => !roster.current.some((p) => p.slot === i),
            );
            if (slot === undefined) {
              await signal("meeting-state", {
                targetId: payload.fromId,
                full: true,
              });
              return;
            }
            const id = payload.fromId;
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            const peer = { pc, slot };
            peers.current.set(id, peer);
            const p: Participant = {
              id,
              name: payload.userName || "Participant",
              slot,
              stream: new MediaStream(),
              connected: false,
              consent: payload.consent === true,
              muted: payload.muted !== false,
              cameraOff: payload.cameraOff !== false,
            };
            roster.current.push(p);
            publish();
            wire(id, peer);
            pc.addTransceiver("audio", { direction: "sendrecv" });
            pc.addTransceiver("video", { direction: "sendrecv" });
            pc.addTransceiver("video", { direction: "sendonly" });
            pc.addTransceiver("audio", { direction: "sendonly" });
            for (let i = 0; i < MAX_STUDENTS; i++) {
              pc.addTransceiver("audio", { direction: "sendonly" });
              pc.addTransceiver("video", { direction: "sendonly" });
            }
            pc.ontrack = (e) => {
              const person = roster.current.find((p) => p.id === id);
              if (!person) return;
              const tracks = person
                .stream!.getTracks()
                .filter((t) => t.kind !== e.track.kind);
              person.stream = new MediaStream([...tracks, e.track]);
              publish();
              safe(replace);
            };
            await replace();
            await pc.setLocalDescription(await pc.createOffer());
            await signal("offer", {
              targetId: id,
              sdp: pc.localDescription!.toJSON(),
              roster: state(),
              recording: isRecording.current,
              presenting: !!presentation.current,
            });
            await announce();
          });
        })
          .on("broadcast", { event: "offer" }, ({ payload }) => {
            if (
              host ||
              payload.targetId !== userId ||
              payload.fromId !== hostId
            )
              return;
            safe(async () => {
              removePeer(hostId);
              receiveState(payload.roster);
              setRecordingNotice(payload.recording === true);
              const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
              const peer = { pc, slot: -1 };
              peers.current.set(hostId, peer);
              wire(hostId, peer);
              pc.ontrack = (e) => {
                const index = Number(e.transceiver.mid);
                if (index === 2 || index === 3) {
                  presentation.current ||= new MediaStream();
                  const tracks = presentation.current
                    .getTracks()
                    .filter((t) => t.kind !== e.track.kind);
                  presentation.current = new MediaStream([...tracks, e.track]);
                  if (payload.presenting) setScreen(presentation.current);
                } else {
                  const person = roster.current.find((p) =>
                    index < 2
                      ? p.id === hostId
                      : p.slot === Math.floor((index - 4) / 2),
                  );
                  if (!person || person.id === userId) return;
                  const tracks =
                    person.stream
                      ?.getTracks()
                      .filter((t) => t.kind !== e.track.kind) || [];
                  person.stream = new MediaStream([...tracks, e.track]);
                  publish();
                }
              };
              await pc.setRemoteDescription(payload.sdp);
              pc.getTransceivers()
                .slice(0, 2)
                .forEach((t) => {
                  t.direction = "sendrecv";
                });
              await addCandidates(hostId, pc);
              await replace();
              await pc.setLocalDescription(await pc.createAnswer());
              await signal("answer", {
                targetId: hostId,
                sdp: pc.localDescription!.toJSON(),
              });
            });
          })
          .on("broadcast", { event: "answer" }, ({ payload }) => {
            if (!host || payload.targetId !== userId) return;
            safe(async () => {
              const pc = peers.current.get(payload.fromId)?.pc;
              if (pc?.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(payload.sdp);
                await addCandidates(payload.fromId, pc);
              }
            });
          })
          .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
            if (
              payload.targetId !== userId ||
              (!host && payload.fromId !== hostId)
            )
              return;
            const pc = peers.current.get(payload.fromId)?.pc;
            if (pc?.remoteDescription)
              safe(async () => {
                try {
                  await pc.addIceCandidate(payload.candidate);
                } catch {
                  /* Ignore stale generation. */
                }
              });
            else {
              const list = ice.current.get(payload.fromId) || [];
              if (list.length < 100) list.push(payload.candidate);
              ice.current.set(payload.fromId, list);
            }
          })
          .on("broadcast", { event: "media-state" }, ({ payload }) => {
            if (!host) return;
            roster.current = roster.current.map((p) =>
              p.id === payload.fromId
                ? {
                    ...p,
                    muted: payload.muted !== false,
                    cameraOff: payload.cameraOff !== false,
                    consent: payload.consent === true,
                  }
                : p,
            );
            publish();
            safe(async () => {
              await replace();
              await announce();
            });
          })
          .on("broadcast", { event: "meeting-state" }, ({ payload }) => {
            if (
              host ||
              payload.fromId !== hostId ||
              (payload.targetId && payload.targetId !== userId)
            )
              return;
            if (payload.full) {
              setError(
                "This classroom is full (six students). Please try another session.",
              );
              return;
            }
            receiveState(payload.roster);
            setRecordingNotice(payload.recording === true);
            setScreen(payload.presenting ? presentation.current : null);
          })
          .on("broadcast", { event: "teacher-live" }, ({ payload }) => {
            if (!host && payload.fromId === hostId)
              void signal("join-request", own.current);
          })
          .on("broadcast", { event: "teacher-ended" }, ({ payload }) => {
            if (!host && payload.fromId === hostId) {
              dispose();
              setActive(false);
              setEnded(true);
              setConnection("ended");
              setScreen(null);
              setRecordingNotice(false);
            }
          })
          .on("broadcast", { event: "leave" }, ({ payload }) => {
            if (host) {
              removePeer(payload.fromId);
              safe(async () => {
                await replace();
                await announce();
              });
            }
          })
          .on("broadcast", { event: "chat-message" }, ({ payload }) => {
            setMessages((previous) =>
              previous.some((m) => m.id === payload.id)
                ? previous
                : [...previous.slice(-199), payload as ChatMessage],
            );
          })
          .on("broadcast", { event: "raise-hand" }, ({ payload }) => {
            if (generation !== epoch.current) return;
            const handName = payload.userName || "Participant";
            clearTimeout(handTimers.current.get(handName));
            setHands((previous) =>
              previous.includes(handName) ? previous : [...previous, handName],
            );
            const timer = setTimeout(() => {
              if (handTimers.current.get(handName) !== timer) return;
              handTimers.current.delete(handName);
              setHands((previous) =>
                previous.filter((value) => value !== handName),
              );
            }, 10_000);
            handTimers.current.set(handName, timer);
          });
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () =>
              reject(new Error("Class connection timed out. Retry joining.")),
            12_000,
          );
          ch.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timeout);
              setConnection(
                host ||
                  peers.current.get(hostId)?.pc.connectionState === "connected"
                  ? "connected"
                  : "waiting",
              );
              if (host) {
                void signal("teacher-live");
                void announce();
              } else void signal("join-request", own.current);
              resolve();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              clearTimeout(timeout);
              setConnection("reconnecting");
              reject(
                new Error("Private class connection failed. Retry joining."),
              );
            }
          });
        });
        setActive(true);
      } catch (e) {
        dispose();
        setLocalMedia({ stream: null, muted: true, cameraOff: true, consent: false });
        setConnection("idle");
        setError(mediaError(e));
        throw e;
      } finally {
        starting.current = false;
        setJoining(false);
        setBusy(false);
      }
    },
    [
      host,
      userId,
      room,
      hostId,
      me,
      publish,
      safe,
      signal,
      wire,
      replace,
      state,
      announce,
      removePeer,
      receiveState,
      addCandidates,
      dispose,
    ],
  );

  useEffect(() => {
    if (
      !active ||
      host ||
      !["waiting", "reconnecting", "connecting"].includes(connection)
    )
      return;
    // A peer from a reloaded tab can take time to disconnect at the host. Retry
    // discovery on the existing subscription; host-side deduplication owns offers.
    const retry = setInterval(() => {
      void signal("join-request", own.current);
    }, 4000);
    return () => clearInterval(retry);
  }, [active, host, connection, signal]);

  const sendChat = useCallback(
    (message: string) => {
      if (message.trim())
        void signal("chat-message", {
          id: crypto.randomUUID(),
          message: message.trim().slice(0, 2000),
          timestamp: Date.now(),
        });
    },
    [signal],
  );
  const startRecording = useCallback(
    async (classId: string, title: string) => {
      if (
        !host ||
        !active ||
        isRecording.current ||
        (recorder.current &&
          !["completed", "failed", "idle"].includes(recorder.current.state))
      )
        return;
      isRecording.current = true;
      const generation = epoch.current;
      setRecordingState("starting");
      setRecordingNotice(true);
      const notified = await announce();
      // Leaving/unmounting while the RPC is pending must never start a recorder.
      if (generation !== epoch.current) return;
      if (!notified) {
        isRecording.current = false;
        setRecordingNotice(false);
        setRecordingState("failed");
        setError(
          "Recording did not start because participant notice could not be sent. Reconnect and retry.",
        );
        return;
      }
      const next = new MeetingRecorder(
        { id: crypto.randomUUID(), userId, classId, title },
        () => ({ participants: roster.current, screen: presentation.current }),
        (nextState, seconds, message) => {
          setRecordingState(nextState);
          setRecordingDuration(seconds);
          const recording = [
            "starting",
            "recording",
            "stopping",
            "processing",
          ].includes(nextState);
          if (isRecording.current !== recording) {
            isRecording.current = recording;
            setRecordingNotice(recording);
            void announce();
          }
          if (message) setError(message);
        },
      );
      recorder.current = next;
      try {
        await next.start();
      } catch (e) {
        setError(mediaError(e));
      }
    },
    [host, active, userId, announce],
  );
  const stopRecording = useCallback(async () => {
    if (!recorder.current) return;
    await recorder.current.stop();
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (isRecording.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return {
    active,
    connection,
    ended,
    participants,
    screen,
    messages,
    hands,
    error,
    busy,
    joining,
    localMedia,
    deviceErrors,
    recordingState,
    recordingDuration,
    recordingNotice,
    join,
    leave,
    device,
    shareScreen,
    stopScreen,
    sendChat,
    startRecording,
    stopRecording,
    raiseHand: () => {
      void signal("raise-hand");
    },
    clearError: () => setError(""),
  };
}
