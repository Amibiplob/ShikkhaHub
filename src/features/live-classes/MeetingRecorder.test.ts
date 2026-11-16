import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingRecorder } from './MeetingRecorder';
import { recordingBlob, saveDraft } from './recording-store';
vi.mock('./recording-encoder', () => ({
  createRecordingEncoder: (stream: MediaStream) => new MediaRecorder(stream),
  encoderDeadline: (operation: Promise<unknown>) => operation,
  verifyRecordingVideo: vi.fn(async () => undefined),
}));
vi.mock('./recording-store', () => ({ saveDraft: vi.fn(async () => undefined), saveChunk: vi.fn(async () => undefined), recordingBlob: vi.fn() }));
const encoders: FakeRecorder[] = [];
class FakeRecorder {
  static isTypeSupported = () => true;
  state = 'inactive';
  onstart?: () => void;
  onstop?: () => void;
  constructor() { encoders.push(this); }
  start() { this.state = 'recording'; queueMicrotask(() => this.onstart?.()); }
  stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
}
const track = () => ({ kind: 'audio', readyState: 'live', enabled: true, stop: vi.fn() });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recordingBlob).mockResolvedValue(new Blob(['x'.repeat(200)]));
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('MediaStream', class { getTracks = () => [track()]; getVideoTracks = () => [track()]; });
  vi.stubGlobal('AudioContext', class {
    state = 'running'; currentTime = 0;
    createMediaStreamDestination = () => ({ stream: { getAudioTracks: () => [track()] } });
    createDynamicsCompressor = () => ({ threshold: {}, ratio: {}, connect() {} });
    createConstantSource = () => ({ offset: {}, connect() {}, start() {}, stop() {}, disconnect() {} });
    resume = async () => undefined; close = async () => undefined;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect() {}, fillText() {} } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', { configurable: true, value: () => ({ getVideoTracks: () => [track()] }) });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const create = () => new MeetingRecorder({ id: 'draft', userId: 'owner', classId: 'class', title: 'Test' }, () => ({ participants: [], screen: null }), vi.fn());
describe('recording finalization', () => {
  it('never marks an empty recording complete in the recovery journal', async () => {
    vi.mocked(recordingBlob).mockResolvedValue(new Blob([]));
    const recorder = create(); await recorder.start();
    await expect(recorder.stop()).rejects.toThrow(/no playable media/);
    expect(recorder.state).toBe('failed');
    expect(vi.mocked(saveDraft).mock.calls[vi.mocked(saveDraft).mock.calls.length - 1]?.[0].complete).toBe(false);
  });
  it('retains the recording duration while final persistence is slow', async () => {
    vi.useFakeTimers();
    const recorder = create(); await recorder.start();
    await vi.advanceTimersByTimeAsync(3000);
    let finish!: (value: Blob) => void;
    vi.mocked(recordingBlob).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const stopping = recorder.stop(); await Promise.resolve(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(6000);
    finish(new Blob(['x'.repeat(200)])); await stopping;
    expect(recorder.draft.duration).toBe(3);
    expect(encoders[encoders.length - 1]?.state).toBe('inactive');
  });
});
