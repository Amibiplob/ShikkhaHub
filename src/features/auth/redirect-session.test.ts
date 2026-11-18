import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createRedirectSession, redirectError } from './redirect-session';

describe('redirect initialization', () => {
  it('retains validated recovery across lazy mounts and clears on signout', async () => {
    let listener!: (event: string, session: Session | null) => void;
    const session = { user: { id: 'recovering-user' } } as Session;
    const auth = {
      onAuthStateChange: vi.fn(cb => { listener = cb; }),
      initialize: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
    };
    const state = createRedirectSession(auth as unknown as SupabaseClient['auth']);
    const notify = vi.fn(); state.subscribe(notify);
    expect(state.recoveryUser()).toBeNull();
    listener('SIGNED_IN', session);
    expect(state.recoveryUser()).toBeNull();
    listener('PASSWORD_RECOVERY', session);
    expect(state.recoveryUser()).toBe('recovering-user');
    await state.ready; await state.ready;
    expect(auth.initialize).toHaveBeenCalledTimes(1);
    listener('SIGNED_OUT', null);
    expect(state.recoveryUser()).toBeNull();
    expect(notify).toHaveBeenCalledTimes(3);
  });
  it('does not use an existing session when callback validation fails', async () => {
    const auth = { onAuthStateChange: vi.fn(), initialize: vi.fn(async () => ({ error: new Error('invalid code') })), getSession: vi.fn() };
    const state = createRedirectSession(auth as unknown as SupabaseClient['auth']);
    expect((await state.ready).session).toBeNull();
    expect(auth.getSession).not.toHaveBeenCalled();
  });
  it('shows cancellation and linking errors without reflecting provider text', () => {
    expect(redirectError(new URL('https://app.test/auth/callback#error=access_denied&error_description=private-data'))).toContain('cancelled');
    expect(redirectError(new URL('https://app.test/auth/callback?error_code=identity_already_exists'))).toContain('existing method');
    expect(redirectError(new URL('https://app.test/auth/callback?error=arbitrary&error_description=private-data'))).not.toContain('private-data');
  });
});
