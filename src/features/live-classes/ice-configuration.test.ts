import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { classroomIceConfiguration, STUN_SERVERS } from './ice-configuration';
const fake = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: fake.invoke } } }));
beforeEach(() => { fake.invoke.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
it('keeps the existing STUN configuration when TURN is disabled', async () => {
  vi.stubEnv('VITE_LIVE_TURN_ENABLED', 'false');
  expect(await classroomIceConfiguration('room')).toEqual({ iceServers: STUN_SERVERS });
  expect(fake.invoke).not.toHaveBeenCalled();
});
it('requests credentials through the authenticated function client when enabled', async () => {
  vi.stubEnv('VITE_LIVE_TURN_ENABLED', 'true');
  const relay = { urls: ['turns:relay.example.test:5349'], username: 'expiring-user', credential: 'synthetic-one-time-value' };
  fake.invoke.mockResolvedValue({ data: { iceServers: [relay], expiresAt: Date.now() / 1000 + 3600 }, error: null });
  expect(await classroomIceConfiguration('authorized-room')).toEqual({ iceServers: [...STUN_SERVERS, relay] });
  expect(fake.invoke).toHaveBeenCalledWith('live-ice', expect.objectContaining({ body: { room: 'authorized-room' }, signal: expect.any(AbortSignal) }));
});
it.each([
  { data: null, error: new Error('offline') },
  { data: { iceServers: [], expiresAt: Date.now() / 1000 + 3600 }, error: null },
  { data: { iceServers: [{}], expiresAt: 1 }, error: null },
])('fails closed for missing or expired relay credentials %#', async response => {
  vi.stubEnv('VITE_LIVE_TURN_ENABLED', 'true'); fake.invoke.mockResolvedValue(response);
  await expect(classroomIceConfiguration('room')).rejects.toThrow('Could not obtain classroom relay access');
});
