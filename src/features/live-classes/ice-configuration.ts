import { supabase } from '@/integrations/supabase/client';
export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
function validRelay(server: RTCIceServer) {
  const urls = typeof server?.urls === 'string' ? [server.urls] : server?.urls;
  return Array.isArray(urls) && urls.length > 0 && urls.length <= 8 &&
    urls.every(url => typeof url === 'string' && /^turns?:[a-zA-Z0-9.-]+(?::\d{1,5})?(?:\?transport=(?:udp|tcp))?$/.test(url)) &&
    typeof server.username === 'string' && server.username.length > 0 &&
    typeof server.credential === 'string' && server.credential.length > 0;
}
export async function classroomIceConfiguration(room: string): Promise<RTCConfiguration> {
  if (import.meta.env.VITE_LIVE_TURN_ENABLED !== 'true') return { iceServers: STUN_SERVERS };
  const { data, error } = await supabase.functions.invoke('live-ice', {
    body: { room }, signal: AbortSignal.timeout(8_000),
  });
  if (error || !data || !Array.isArray(data.iceServers) || !data.iceServers.length ||
    !data.iceServers.every(validRelay) || !Number.isFinite(data.expiresAt) || data.expiresAt * 1000 <= Date.now() + 30_000 || data.expiresAt * 1000 > Date.now() + 3_600_000)
    throw new Error('Could not obtain classroom relay access. Check your connection and retry joining.');
  return { iceServers: [...STUN_SERVERS, ...data.iceServers] };
}
