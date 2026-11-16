/** Observe capture clocks, not microphone loudness: silence is valid media. */
export class RecordingHealth {
  private previous?: { wall: number; audio: number };
  private reported = false;
  observe(wall: number, audio: number, lastChunk: number): boolean {
    const previous = this.previous;
    this.previous = { wall, audio };
    const stalled = !!previous && (wall - previous.wall) / 1000 - (audio - previous.audio) > 2;
    if (!this.reported && (stalled || wall - lastChunk > 10_000)) {
      this.reported = true;
      return true;
    }
    return false;
  }
}

export async function recordingDeadline<T>(operation: PromiseLike<T>, stage: string, milliseconds = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([Promise.resolve(operation), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${stage} timed out. Return to the classroom and retry. Saved chunks remain on this device.`)), milliseconds);
    })]);
  } finally { clearTimeout(timer!); }
}
