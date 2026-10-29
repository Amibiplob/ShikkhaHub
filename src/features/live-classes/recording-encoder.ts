/** A deadline bounds browser promises; chunk cadence is never a startup test. */
export async function encoderDeadline<T>(operation: PromiseLike<T>, stage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve(operation), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${stage} timed out. Keep the classroom visible and retry. Saved chunks remain on this device.`)), 10_000);
    })]);
  } finally { clearTimeout(timer); }
}

export function createRecordingEncoder(stream: MediaStream): MediaRecorder {
  const tracks = stream.getTracks();
  if (!tracks.some(t => t.kind === 'video') || tracks.some(t => t.readyState !== 'live' || !t.enabled))
    throw new Error('No usable recording media: output tracks must be live and enabled.');
  // Support queries are advisory: a supported encoder may still reject construction.
  const formats = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  const failures: string[] = [];
  for (const mimeType of formats.filter(m => MediaRecorder.isTypeSupported(m))) {
    try {
      return new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000 });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'NotSupportedError') throw error;
      failures.push(`${mimeType}: ${error.message}`);
    }
  }
  throw new Error(`No supported recording format${failures.length ? ` (${failures.join('; ')})` : '.'}`);
}

/** Decode input/output using the browser, without asking for any device. */
export async function verifyRecordingVideo(source: MediaStream | Blob): Promise<void> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const url = source instanceof Blob ? URL.createObjectURL(source) : undefined;
  try {
    await encoderDeadline(new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => {
        if (video.videoWidth && video.videoHeight && video.readyState >= 2) resolve();
        else reject(new Error('Recording contains no playable video frames.'));
      };
      video.onerror = () => reject(new Error(`Recording video could not be decoded (media error ${video.error?.code ?? 'unknown'}). Saved chunks remain on this device.`));
      if (url) video.src = url;
      else {
        video.srcObject = source;
        void video.play().catch(reject);
      }
    }), url ? 'Recording playback validation' : 'Recording video frame startup');
  } finally {
    video.onloadeddata = null;
    video.onerror = null;
    video.pause();
    video.srcObject = null;
    video.removeAttribute('src');
    video.load();
    if (url) URL.revokeObjectURL(url);
  }
}
