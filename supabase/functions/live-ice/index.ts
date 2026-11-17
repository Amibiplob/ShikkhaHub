import { createClient } from '@supabase/supabase-js';
import { iceHandler } from '../_shared/iceHandler.ts';

Deno.serve(iceHandler({
  origins: (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  urls: (Deno.env.get('TURN_URLS') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  secret: Deno.env.get('TURN_SHARED_SECRET'),
  consumeQuota: async authorization => {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data, error } = await client.rpc('consume_endpoint_quota', { endpoint_name: 'ice' });
    if (error) throw error;
    return data === true;
  },
  authorize: async (authorization, room) => {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: auth, error } = await client.auth.getUser();
    if (error || !auth.user) return null;
    const { data: session, error: accessError } = await client.from('live_classes')
      .select('id').eq('room_name', room).in('status', ['scheduled', 'live']).maybeSingle();
    return !accessError && session ? auth.user.id : null;
  },
}));
