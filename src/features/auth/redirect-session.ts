import type { SupabaseClient } from '@supabase/supabase-js';

/** Observe recovery before lazy routes mount; the SDK owns URL validation and exchange. */
export function createRedirectSession(auth: SupabaseClient['auth']) {
  let recoveryUser: string | null = null;
  const listeners = new Set<() => void>();
  auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') recoveryUser = session?.user.id ?? null;
    if (event === 'SIGNED_OUT') recoveryUser = null;
    for (const listener of listeners) listener();
  });
  // initialize() reuses the SDK's single initialization promise. Never exchange
  // a PKCE code twice (including React StrictMode and lazy-route remounts).
  const ready = auth.initialize().then(async ({ error }) => {
    if (error) return { error, session: null };
    const result = await auth.getSession();
    return { error: result.error, session: result.data.session };
  }).catch(() => ({ error: new Error('Authentication failed'), session: null }));
  return {
    ready,
    recoveryUser: () => recoveryUser,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export function redirectError(url: URL) {
  const params = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('error_code') || params.get('error_code') || url.searchParams.get('error') || params.get('error');
  if (!code) return null;
  if (code === 'access_denied') return 'Google sign-in was cancelled. You can try again or use email and password.';
  if (['identity_already_exists', 'email_exists', 'user_already_exists'].includes(code))
    return 'This identity could not be linked. Sign in using your existing method. Accounts are linked only by Supabase when eligible; contact support if needed.';
  return 'Sign-in could not be completed. Try again using the same browser, or use your existing email and password.';
}

/** Remove credentials, one-use codes and provider messages from browser history. */
export function clearRedirectUrl() {
  if (['/auth/callback', '/reset-password'].includes(window.location.pathname))
    window.history.replaceState(window.history.state, '', window.location.pathname);
}
