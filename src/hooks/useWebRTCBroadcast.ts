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

/**
 * Teacher broadcasts local stream to students via WebRTC.
 * Supabase Realtime channel is used for signaling.
 */
export function useTeacherBroadcast(roomName: string, userId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const startBroadcast = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsLive(true);

      // Join realtime channel for signaling
      const channel = supabase.channel(`live-${roomName}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "join-request" }, async ({ payload }) => {
          const studentId = payload.studentId;
          if (!studentId || peersRef.current.has(studentId)) return;

          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          peersRef.current.set(studentId, { pc, userId: studentId });
          setViewerCount(peersRef.current.size);

          // Add tracks
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
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
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
            await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
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

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCamOff((c) => !c);
  }, []);

  const shareScreen = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(screen);
      const videoTrack = screen.getVideoTracks()[0];

      // Replace video track for all peers
      peersRef.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });

      videoTrack.onended = () => {
        // Revert to camera
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
    channelRef.current?.unsubscribe();
    setLocalStream(null);
    setScreenStream(null);
    setIsLive(false);
    setViewerCount(0);
  }, [screenStream]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach(({ pc }) => pc.close());
      channelRef.current?.unsubscribe();
    };
  }, []);

  return {
    localStream,
    screenStream,
    isLive,
    viewerCount,
    isMuted,
    isCamOff,
    startBroadcast,
    stopBroadcast,
    toggleMute,
    toggleCamera,
    shareScreen,
  };
}

/**
 * Student receives the teacher's broadcast stream.
 */
export function useStudentViewer(roomName: string, userId: string) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const joinBroadcast = useCallback(() => {
    setConnecting(true);

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
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
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
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .on("broadcast", { event: "teacher-live" }, () => {
        // Teacher is live, send join request
        channel.send({
          type: "broadcast",
          event: "join-request",
          payload: { studentId: userId },
        });
      })
      .subscribe(() => {
        // Send join request immediately in case teacher is already live
        setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "join-request",
            payload: { studentId: userId },
          });
        }, 500);
      });

    channelRef.current = channel;
  }, [roomName, userId]);

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

  return { remoteStream, connected, connecting, joinBroadcast, leaveBroadcast };
}
