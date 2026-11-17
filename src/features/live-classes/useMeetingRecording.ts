import { useCallback, useEffect, useRef, useState, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { MeetingRecorder, type RecordingState, type MeetingSource } from './MeetingRecorder';
import { mediaError } from './media-errors';

interface Options {
  host: boolean; active: boolean; userId: string;
  epochRef: RefObject<number>; isRecordingRef: RefObject<boolean>; signalFailureRef: RefObject<string>;
  announce: () => Promise<boolean>;
  sources: () => { participants: MeetingSource[]; screen: MediaStream | null };
  setError: Dispatch<SetStateAction<string>>;
  setRecordingNotice: Dispatch<SetStateAction<boolean>>;
}
export function useMeetingRecording({ host, active, userId, epochRef, isRecordingRef, signalFailureRef, announce, sources, setError, setRecordingNotice }: Options) {
  const recorder = useRef<MeetingRecorder | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingWarning, setRecordingWarning] = useState(false);
  const startRecording = useCallback(
    async (classId: string, title: string) => {
      if (
        !host ||
        !active ||
        isRecordingRef.current ||
        (recorder.current &&
          !["completed", "failed", "idle"].includes(recorder.current.state))
      )
        return;
      isRecordingRef.current = true;
      const generation = epochRef.current;
      setRecordingWarning(false);
      setRecordingDuration(0);
      setError("");
      setRecordingState("starting");
      setRecordingNotice(true);
      const notified = await announce();
      // Leaving/unmounting while the RPC is pending must never start a recorder.
      if (generation !== epochRef.current) return;
      if (!notified) {
        isRecordingRef.current = false;
        setRecordingNotice(false);
        setRecordingState("failed");
        setError(
          `Recording did not start because participant notice could not be sent. ${signalFailureRef.current}`,
        );
        return;
      }
      const next = new MeetingRecorder(
        { id: crypto.randomUUID(), userId, classId, title },
        sources,
        (nextState, seconds, message) => {
          if (generation !== epochRef.current) return;
          setRecordingState(nextState);
          setRecordingDuration(seconds);
          const recording = [
            "starting",
            "recording",
            "stopping",
            "processing",
          ].includes(nextState);
          if (isRecordingRef.current !== recording) {
            isRecordingRef.current = recording;
            setRecordingNotice(recording);
            void announce();
          }
          if (message) setError(message);
        },
        () => { if (generation === epochRef.current) setRecordingWarning(true); },
      );
      recorder.current = next;
      try {
        await next.start();
      } catch (e) {
        if (generation === epochRef.current) setError(mediaError(e));
      }
    },
    [host, active, userId, announce, epochRef, isRecordingRef, sources, signalFailureRef, setError, setRecordingNotice],
  );
  const stopRecording = useCallback(async () => {
    if (!recorder.current) return;
    await recorder.current.stop();
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (isRecordingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isRecordingRef]);
  const abortRecording = useCallback(() => { recorder.current?.abort(); }, []);
  const resetRecording = useCallback(() => { setRecordingState(current => current === 'starting' ? 'idle' : current); }, []);
  return { recordingState, recordingDuration, recordingWarning, startRecording, stopRecording, abortRecording, resetRecording };
}
