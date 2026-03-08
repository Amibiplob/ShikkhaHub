import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface PeerState {
  pc: RTCPeerConnection;
  userId: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

/**
 * Teacher broadcasts local stream to students via WebRTC.
 * Supabase Realtime channel is used for signaling + chat.
 */
export function useTeacherBroadcast(roomName: string, userId: string, userName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeTrackRef = useRef<MediaStreamTrack | null>(null);

  const startBroadcast = useCallback(async (mode: "camera" | "screen" | "audio-only") => {
    try {
      let stream: MediaStream;

      if (mode === "screen") {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Try to get mic audio separately
        let audioTrack: MediaStreamTrack | null = null;
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          audioTrack = audioStream.getAudioTracks()[0];
        } catch { /* mic unavailable, use screen audio only */ }

        stream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...(audioTrack ? [audioTrack] : screenStream.getAudioTracks()),
        ]);
        setScreenStream(screenStream);

        screenStream.getVideoTracks()[0].onended = () => {
          stopBroadcast();
        };
      } else if (mode === "audio-only") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsCamOff(true);
      } else {
        // Camera mode - try video+audio, fallback to audio-only
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
        } catch {
          // Fallback: try audio only
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setIsCamOff(true);
          } catch {
            // Fallback: screen share
            const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            stream = ss;
            setScreenStream(ss);
            ss.getVideoTracks()[0].onended = () => stopBroadcast();
          }
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;
      activeTrackRef.current = stream.getVideoTracks()[0] || null;
      setIsLive(true);

      const channel = supabase.channel(`live-${roomName}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "join-request" }, async ({ payload }) => {
          const studentId = payload.studentId;
          const studentName = payload.studentName || "Student";
          if (!studentId || peersRef.current.has(studentId)) return;

          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          peersRef.current.set(studentId, { pc, userId: studentId });
          setViewerCount(peersRef.current.size);

          localStreamRef.current?.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current!);
          });

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              channel.send({
                type: "broadcast",
                event: "ice-candidate",
                payload: { candidate: e.candidate.toJSON(), targetId: studentId, fromId: userId },
              });
            }
          };

          pc.onconnectionstatechange = () => {
            if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
              pc.close();
              peersRef.current.delete(studentId);
              setViewerCount(peersRef.current.size);
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({
            type: "broadcast",
            event: "offer",
            payload: { sdp: offer, targetId: studentId, fromId: userId },
          });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.targetId !== userId) return;
          const peer = peersRef.current.get(payload.fromId);
          if (peer && peer.pc.signalingState !== "stable") {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.targetId !== userId) return;
          const peer = peersRef.current.get(payload.fromId);
          if (peer) {
            try { await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          }
        })
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          setChatMessages((prev) => [...prev, payload as ChatMessage]);
        })
        .on("broadcast", { event: "raise-hand" }, ({ payload }) => {
          setRaisedHands((prev) =>
            prev.includes(payload.userName) ? prev : [...prev, payload.userName]
          );
          // Auto-remove after 10s
          setTimeout(() => {
            setRaisedHands((prev) => prev.filter((n) => n !== payload.userName));
          }, 10000);
        })
        .subscribe();

      channelRef.current = channel;

      // Announce teacher is live
      setTimeout(() => {
        channel.send({ type: "broadcast", event: "teacher-live", payload: { teacherId: userId } });
      }, 1000);
    } catch (err: any) {
      console.error("Failed to start broadcast:", err);
      throw err;
    }
  }, [roomName, userId]);

  const sendChat = useCallback((message: string) => {
    if (!channelRef.current || !message.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      userName,
      message: message.trim(),
      timestamp: Date.now(),
    };
    channelRef.current.send({ type: "broadcast", event: "chat-message", payload: msg });
    setChatMessages((prev) => [...prev, msg]);
  }, [userId, userName]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(async () => {
    const videoTracks = localStreamRef.current?.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) {
      videoTracks.forEach((t) => (t.enabled = !t.enabled));
      setIsCamOff((c) => !c);
    }
  }, []);

  const shareScreen = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(screen);
      const videoTrack = screen.getVideoTracks()[0];

      peersRef.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });

      videoTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        if (camTrack) {
          peersRef.current.forEach(({ pc }) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(camTrack);
          });
        }
        setScreenStream(null);
      };
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  }, []);

  const stopBroadcast = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach(({ pc }) => pc.close());
    peersRef.current.clear();
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "teacher-ended", payload: {} });
      channelRef.current.unsubscribe();
    }
    setLocalStream(null);
    setScreenStream(null);
    setIsLive(false);
    setViewerCount(0);
    setIsMuted(false);
    setIsCamOff(false);
  }, [screenStream]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach(({ pc }) => pc.close());
      channelRef.current?.unsubscribe();
    };
  }, []);

  // ========= Recording via MediaRecorder =========
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    recordedChunksRef.current = [];
    setRecordingDuration(0);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
    mr.start(1000); // collect every second
    mediaRecorderRef.current = mr;
    setIsRecording(true);

    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(new Blob(recordedChunksRef.current, { type: "video/webm" }));
        setIsRecording(false);
        return;
      }
      mr.onstop = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        setIsRecording(false);
        resolve(blob);
      };
      mr.stop();
    });
  }, []);

  return {
    localStream, screenStream, isLive, viewerCount,
    isMuted, isCamOff, chatMessages, raisedHands,
    isRecording, recordingDuration,
    startBroadcast, stopBroadcast, toggleMute, toggleCamera,
    shareScreen, sendChat, startRecording, stopRecording,
  };
}

/**
 * Student receives the teacher's broadcast stream + chat.
 */
export function useStudentViewer(roomName: string, userId: string, userName: string) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sendChat = useCallback((message: string) => {
    if (!channelRef.current || !message.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      userName,
      message: message.trim(),
      timestamp: Date.now(),
    };
    channelRef.current.send({ type: "broadcast", event: "chat-message", payload: msg });
    setChatMessages((prev) => [...prev, msg]);
  }, [userId, userName]);

  const raiseHand = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "raise-hand",
      payload: { userId, userName },
    });
  }, [userId, userName]);

  const joinBroadcast = useCallback(() => {
    setConnecting(true);
    setEnded(false);

    const channel = supabase.channel(`live-${roomName}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.targetId !== userId) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        const stream = new MediaStream();
        pc.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((track) => stream.addTrack(track));
          setRemoteStream(new MediaStream(stream.getTracks()));
          setConnected(true);
          setConnecting(false);
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: e.candidate.toJSON(), targetId: payload.fromId, fromId: userId },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (["disconnected", "failed"].includes(pc.connectionState)) {
            setConnected(false);
            setConnecting(false);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { sdp: answer, targetId: payload.fromId, fromId: userId },
        });
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.targetId !== userId) return;
        if (pcRef.current) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        }
      })
      .on("broadcast", { event: "teacher-live" }, () => {
        channel.send({
          type: "broadcast",
          event: "join-request",
          payload: { studentId: userId, studentName: userName },
        });
      })
      .on("broadcast", { event: "teacher-ended" }, () => {
        setConnected(false);
        setConnecting(false);
        setEnded(true);
        pcRef.current?.close();
        pcRef.current = null;
      })
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        setChatMessages((prev) => [...prev, payload as ChatMessage]);
      })
      .subscribe(() => {
        setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "join-request",
            payload: { studentId: userId, studentName: userName },
          });
        }, 500);
      });

    channelRef.current = channel;
  }, [roomName, userId, userName]);

  const leaveBroadcast = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setRemoteStream(null);
    setConnected(false);
    setConnecting(false);
  }, []);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      channelRef.current?.unsubscribe();
    };
  }, []);

  return {
    remoteStream, connected, connecting, ended,
    chatMessages, joinBroadcast, leaveBroadcast,
    sendChat, raiseHand,
  };
}
