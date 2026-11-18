import { useEffect, useState } from 'react';

export function useGoogleProvider() {
  const [status, setStatus] = useState<'checking' | 'enabled' | 'unavailable'>('checking');
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 8_000);
    void fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Provider settings unavailable');
      const settings = await response.json();
      if (active) setStatus(settings?.external?.google === true ? 'enabled' : 'unavailable');
    }).catch(() => { if (active) setStatus('unavailable'); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, []);
  return status;
}
