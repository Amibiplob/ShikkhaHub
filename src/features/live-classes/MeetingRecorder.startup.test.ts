import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingRecorder } from './MeetingRecorder';
import { verifyRecordingVideo } from './recording-encoder';
import { recordingBlob, saveDraft } from './recording-store';

vi.mock('./recording-store', () => ({ saveDraft: vi.fn(async () => undefined), saveChunk: vi.fn(async () => undefined), recordingBlob: vi.fn() }));
vi.mock('./recording-encoder', async importOriginal => ({
  ...await importOriginal<typeof import('./recording-encoder')>(),
  verifyRecordingVideo: vi.fn(async () => undefined),
}));
const encoders: FakeRecorder[] = [];
let behavior: 'normal' | 'error' | 'no-start' | 'no-stop';
let audioState: AudioContextState;
let paints: number;
let capturing: boolean;
class FakeRecorder {
  static isTypeSupported = () => true;
  mimeType = 'video/webm';
  state = 'inactive';
  onstart?: () => void;
  onstop?: () => void;
  onerror?: (event: Event) => void;
  constructor() { encoders.push(this); }
  start() {
    this.state = 'recording';
    if (behavior === 'no-start') return;
    queueMicrotask(() => behavior === 'error' ? this.onerror?.(new Event('error')) : this.onstart?.());
  }
  stop() {
    this.state = 'inactive';
    if (behavior !== 'no-stop') queueMicrotask(() => this.onstop?.());
  }
}
const track = (kind: string) => ({ kind, enabled: true, readyState: 'live', stop: vi.fn() });
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  behavior = 'normal'; audioState = 'running'; paints = 0; capturing = false;
  vi.mocked(recordingBlob).mockResolvedValue(new Blob(['x'.repeat(200)]));
  vi.mocked(verifyRecordingVideo).mockResolvedValue();
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('MediaStream', class {
    constructor(private tracks: { kind: string }[] = []) {}
    getTracks = () => this.tracks;
    getVideoTracks = () => this.tracks.filter(t => t.kind === 'video');
  });
  vi.stubGlobal('AudioContext', class {
    get state() { return audioState; } currentTime = 0;
    createMediaStreamDestination = () => ({ stream: { getAudioTracks: () => [track('audio')] } });
    createDynamicsCompressor = () => ({ threshold: {}, ratio: {}, connect() {} });
    createConstantSource = () => ({ offset: {}, connect() {}, start() {}, stop() {}, disconnect() {} });
    resume = async () => undefined; close = async () => undefined;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect() { if (capturing) paints++; }, fillText() {} } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', { configurable: true, value: () => {
    capturing = true;
    return { getVideoTracks: () => [track('video')] };
  } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const create = () => new MeetingRecorder({ id: 'draft', userId: 'owner', classId: 'class', title: 'Test' }, () => ({ participants: [], screen: null }), vi.fn());
describe('recording startup and bounded failure', () => {
  it('produces frames while waiting for startup, then rejects a missing start event', async () => {
    behavior = 'no-start';
    const recorder = create();
    const result = expect(recorder.start()).rejects.toThrow('encoder startup timed out');
    await vi.advanceTimersByTimeAsync(2000);
    expect(paints).toBeGreaterThan(10);
    expect(recorder.state).toBe('starting');
    await vi.advanceTimersByTimeAsync(8001); await result;
    expect(recorder.state).toBe('failed');
    await expect(recorder.stop()).rejects.toThrow('encoder startup timed out');
  });
  it('reports an encoder error immediately rather than replacing it with a startup timeout', async () => {
    behavior = 'error';
    const recorder = create();
    await expect(recorder.start()).rejects.toThrow('Encoder failure');
    expect(recorder.state).toBe('failed');
    await expect(recorder.stop()).rejects.toThrow('Encoder failure');
  });
  it('emits failure only once so late finalization cannot reset a subsequent session', async () => {
    behavior = 'error';
    const changed = vi.fn();
    const recorder = new MeetingRecorder({ id: 'draft', userId: 'owner', classId: 'class', title: 'Test' }, () => ({ participants: [], screen: null }), changed);
    await expect(recorder.start()).rejects.toThrow('Encoder failure');
    expect(changed.mock.calls.map(call => call[0])).toEqual(['starting', 'failed']);
  });
  it('rejects a suspended audio graph without reporting active recording', async () => {
    audioState = 'suspended';
    const recorder = create();
    await expect(recorder.start()).rejects.toThrow('AudioContext is suspended');
    expect(recorder.state).toBe('failed');
  });
  it('does not require chunks to start or keep elapsed time and does not create a duplicate encoder', async () => {
    const recorder = create(); await recorder.start();
    const first = encoders[encoders.length - 1];
    await recorder.start(); await vi.advanceTimersByTimeAsync(3200);
    expect(encoders[encoders.length - 1]).toBe(first);
    expect(recorder.state).toBe('recording');
    expect(recorder.draft.duration).toBe(3);
    await recorder.stop();
  });
  it('settles stop even if the encoder never emits its stop event', async () => {
    behavior = 'no-stop';
    const recorder = create(); await recorder.start();
    const stopped = expect(recorder.stop()).rejects.toThrow('finalization timed out');
    await vi.advanceTimersByTimeAsync(10_001); await stopped;
    expect(recorder.state).toBe('failed');
  });
  it('aborts an encoder waiting for startup and settles both promises', async () => {
    behavior = 'no-start';
    const recorder = create();
    const started = expect(recorder.start()).rejects.toThrow('cancelled');
    await vi.advanceTimersByTimeAsync(100); recorder.abort();
    await started;
    await expect(recorder.stop()).rejects.toThrow('cancelled');
    expect(recorder.draft.complete).toBe(false);
  });
  it('preserves the recovery journal when bytes exist but browser decoding fails', async () => {
    const recorder = create(); await recorder.start();
    vi.mocked(verifyRecordingVideo).mockRejectedValueOnce(new Error('Cannot decode recording'));
    await expect(recorder.stop()).rejects.toThrow('Cannot decode recording');
    expect(recorder.draft.complete).toBe(false);
    expect(saveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ complete: false }));
  });
  it('never marks an empty recording as complete', async () => {
    vi.mocked(recordingBlob).mockResolvedValueOnce(new Blob([]));
    const recorder = create(); await recorder.start();
    await expect(recorder.stop()).rejects.toThrow('no playable media');
    expect(saveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ complete: false }));
  });
  it('freezes duration at stop while final persistence is delayed', async () => {
    const recorder = create(); await recorder.start();
    await vi.advanceTimersByTimeAsync(3000);
    let finish!: (blob: Blob) => void;
    vi.mocked(recordingBlob).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const stopped = recorder.stop();
    await vi.advanceTimersByTimeAsync(6000);
    finish(new Blob(['x'.repeat(200)])); await stopped;
    expect(recorder.draft.duration).toBe(3);
  });
});
