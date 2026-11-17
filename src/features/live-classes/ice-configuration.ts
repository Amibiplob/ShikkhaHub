import { supabase } from '@/integrations/supabase/client';
export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
export async function classroomIceConfiguration(room: string): Promise<RTCConfiguration> {
  if (import.meta.env.VITE_LIVE_TURN_ENABLED !== 'true') return { iceServers: STUN_SERVERS };
  const { data, error } = await supabase.functions.invoke('live-ice', {
    body: { room }, signal: AbortSignal.timeout(8_000),
  });
  if (error || !data || !Array.isArray(data.iceServers) || !data.iceServers.length ||
    !Number.isFinite(data.expiresAt) || data.expiresAt * 1000 <= Date.now())
    throw new Error('Could not obtain classroom relay access. Check your connection and retry joining.');
  return { iceServers: [...STUN_SERVERS, ...data.iceServers] };
}
