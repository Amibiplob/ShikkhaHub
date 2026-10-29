import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRecordingEncoder } from './recording-encoder';

afterEach(() => vi.unstubAllGlobals());
const stream = (tracks = [{ kind: 'video', readyState: 'live', enabled: true }]) => ({ getTracks: () => tracks }) as unknown as MediaStream;
describe('recording encoder selection', () => {
  it('falls back after a supported MIME rejects construction, without starting multiple recorders', () => {
    const attempts: string[] = [];
    let starts = 0;
    vi.stubGlobal('MediaRecorder', class {
      static isTypeSupported = () => true;
      constructor(_stream: MediaStream, options: MediaRecorderOptions) {
        attempts.push(options.mimeType!);
        if (attempts.length === 1) throw new DOMException('Unavailable codec', 'NotSupportedError');
      }
      start() { starts++; }
    });
    createRecordingEncoder(stream());
    expect(attempts).toEqual(['video/webm;codecs=vp8,opus', 'video/webm']);
    expect(starts).toBe(0);
  });
  it('preserves security/permission errors instead of trying other formats', () => {
    const constructor = vi.fn(() => { throw new DOMException('Denied', 'SecurityError'); });
    vi.stubGlobal('MediaRecorder', class {
      static isTypeSupported = () => true;
      constructor() { constructor(); }
    });
    expect(() => createRecordingEncoder(stream())).toThrow('Denied');
    expect(constructor).toHaveBeenCalledTimes(1);
  });
  it('explains when no MIME is supported', () => {
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported = () => false; });
    expect(() => createRecordingEncoder(stream())).toThrow('No supported recording format');
  });
  it.each([
    { tracks: [] },
    { tracks: [{ kind: 'audio', readyState: 'live', enabled: true }] },
    { tracks: [{ kind: 'video', readyState: 'ended', enabled: true }] },
    { tracks: [{ kind: 'video', readyState: 'live', enabled: false }] },
  ])('rejects unusable output tracks before constructing a recorder: %j', ({ tracks }) => {
    expect(() => createRecordingEncoder(stream(tracks))).toThrow('No usable recording media');
  });
});
