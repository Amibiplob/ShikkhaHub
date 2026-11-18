import { createClient } from '@supabase/supabase-js';
import { createRedirectSession } from '@/features/auth/redirect-session';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Accept already-issued legacy recovery links during the PKCE transition.
// This selects SDK validation only; the recovery form still requires its event.
const fragment = new URLSearchParams(window.location.hash.slice(1));
export const legacyRecovery = window.location.pathname === '/reset-password' &&
  fragment.get('type') === 'recovery' && fragment.has('access_token');

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: legacyRecovery ? 'implicit' : 'pkce',
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const authRedirect = createRedirectSession(supabase.auth);
