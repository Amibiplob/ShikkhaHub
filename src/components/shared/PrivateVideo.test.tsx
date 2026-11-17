import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PrivateVideo from './PrivateVideo';
import { deferred } from '@/test/deferred';
const fake = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock('@/lib/storage', () => ({ privateFileUrl: (...args: unknown[]) => fake.sign(...args) }));
beforeEach(() => { vi.useFakeTimers(); fake.sign.mockReset(); fake.sign.mockImplementation(async () => `https://media.example.test/${fake.sign.mock.calls.length}`); vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
it('renews before expiry and restores position and playing intent', async () => {
  const view = render(<PrivateVideo bucket="lesson-files" path="private.webm" />);
  await act(async () => {});
  const video = view.container.querySelector('video')!;
  Object.defineProperty(video, 'paused', { value: false, configurable: true });
  video.currentTime = 125;
  await act(async () => { await vi.advanceTimersByTimeAsync(240_000); });
  expect(fake.sign).toHaveBeenCalledTimes(2);
  video.currentTime = 0; fireEvent.loadedMetadata(video);
  expect(video.currentTime).toBe(125); expect(video.play).toHaveBeenCalled();
});
it('bounds playback recovery and offers explicit retry', async () => {
  const view = render(<PrivateVideo bucket="class-recordings" path="broken.webm" />); await act(async () => {});
  const video = view.container.querySelector('video')!;
  for (let i = 0; i < 5; i++) { await act(async () => { fireEvent.error(video); }); }
  expect(fake.sign).toHaveBeenCalledTimes(3); expect(screen.getByRole('alert')).toHaveTextContent('Could not play');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry video' })); });
  expect(fake.sign).toHaveBeenCalledTimes(4);
});
it('ignores a late signing response for a different resource and clears timers on unmount', async () => {
  const pending = deferred<string>(); fake.sign.mockReturnValueOnce(pending.promise);
  const view = render(<PrivateVideo bucket="class-recordings" path="old.webm" />);
  view.rerender(<PrivateVideo bucket="class-recordings" path="new.webm" />); await act(async () => {});
  await act(async () => pending.resolve('https://media.example.test/old'));
  expect(view.container.querySelector('video')?.src).not.toContain('/old');
  view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(500_000); });
  expect(fake.sign).toHaveBeenCalledTimes(2);
});
