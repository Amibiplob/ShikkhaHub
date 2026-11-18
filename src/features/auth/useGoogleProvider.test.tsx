import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGoogleProvider } from './useGoogleProvider';
afterEach(() => vi.unstubAllGlobals());
it.each([true, false])('offers Google only for a strictly enabled provider: %s', async enabled => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ external: { google: enabled } }))));
  const { result } = renderHook(useGoogleProvider);
  await waitFor(() => expect(result.current).toBe(enabled ? 'enabled' : 'unavailable'));
});
it('fails closed on settings lookup failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const { result } = renderHook(useGoogleProvider);
  await waitFor(() => expect(result.current).toBe('unavailable'));
});
