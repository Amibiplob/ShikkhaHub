import { boundedJson, corsHeaders } from './http.ts';

interface Dependencies {
  origins: string[];
  urls: string[];
  secret?: string;
  // Must validate the JWT and check access to this non-completed room using RLS.
  authorize: (authorization: string, room: string) => Promise<string | null>;
  now?: () => number;
  consumeQuota?: (authorization: string) => Promise<boolean>;
}
export function iceHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = corsHeaders(request, deps.origins);
    if (!headers) return new Response('Origin denied', { status: 403 });
    const reply = (status: number, body: object) => Response.json(body, { status, headers });
    if (request.method === 'OPTIONS') return new Response('', { headers });
    if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
    const authorization = request.headers.get('authorization') ?? '';
    if (!/^Bearer \S+$/i.test(authorization)) return reply(401, { error: 'Sign in required' });
    let room: string;
    try {
      const body = await boundedJson(request, 1024);
      if (typeof body.room !== 'string' || !/^[\w-]{1,160}$/.test(body.room)) throw new Error('Invalid room');
      room = body.room;
    } catch { return reply(400, { error: 'Invalid room' }); }
    try {
      const userId = await deps.authorize(authorization, room);
      if (!userId) return reply(403, { error: 'Class access denied' });
      if (!deps.secret || deps.secret.length < 32 || deps.urls.length === 0 || deps.urls.length > 8 ||
        deps.urls.some(url => !/^turns?:[a-zA-Z0-9.-]+(?::\d{1,5})?(?:\?transport=(?:udp|tcp))?$/.test(url)))
        return reply(503, { error: 'Relay configuration unavailable' });
      if (deps.consumeQuota && !await deps.consumeQuota(authorization)) return reply(429, { error: 'Request limit reached. Try again next minute.' });
      // coturn REST credentials. Repeated calls within a minute yield identical
      // credentials; quota/bandwidth enforcement belongs on the relay itself.
      const expiresAt = Math.floor((deps.now?.() ?? Date.now()) / 60_000) * 60 + 3600;
      const username = `${expiresAt}:${userId}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(deps.secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
      const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
      const credential = btoa(String.fromCharCode(...new Uint8Array(digest)));
      return reply(200, { iceServers: [{ urls: deps.urls, username, credential }], expiresAt });
    } catch { return reply(503, { error: 'Relay configuration unavailable. Retry joining.' }); }
  };
}
