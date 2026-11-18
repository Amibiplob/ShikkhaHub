import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authRedirect } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/useAuth';
import { clearRedirectUrl, redirectError } from '@/features/auth/redirect-session';
import { clearAuthReturn, signInDestination, readAuthReturn } from '@/features/auth/workspaces';

export default function AuthCallback() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [incomingError] = useState(() => redirectError(new URL(window.location.href)));
  const [destination] = useState(readAuthReturn);
  const [result, setResult] = useState<{ error: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    void authRedirect.ready.then(({ error, session }) => {
      clearRedirectUrl();
      if (active) setResult({ error: incomingError || (error || !session ? 'Sign-in could not be completed. Try again in the same browser, or use email and password.' : null) });
    });
    return () => { active = false; };
  }, [incomingError]);
  useEffect(() => {
    if (result && !result.error && user && !loading) {
      clearAuthReturn();
      navigate(signInDestination(destination, roles), { replace: true });
    }
  }, [result, user, loading, roles, destination, navigate]);
  return <main id="main-content" className="mx-auto max-w-md p-8 text-center">
    <h1 className="text-2xl font-bold">Google sign-in</h1>
    {result?.error ? <><p role="alert" className="my-4">{result.error}</p><Link className="text-primary underline" to="/auth">Back to sign in</Link></> : <p role="status" className="my-4">Completing sign-in…</p>}
  </main>;
}
