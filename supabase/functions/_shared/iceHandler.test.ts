// @vitest-environment node
import { createHmac } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { iceHandler } from './iceHandler';
const secret = 'synthetic-test-secret-32-characters-long';
const request = (body: unknown = { room: 'class-room' }, authorization = 'Bearer disposable', origin = 'https://app.example.test') => new Request('https://edge.example.test', { method: 'POST', headers: { authorization, origin }, body: JSON.stringify(body) });
const setup = () => { const authorize = vi.fn<() => Promise<string | null>>(async () => 'verified-user'); return { authorize, handler: iceHandler({ origins: ['https://app.example.test'], urls: ['turns:relay.example.test:5349?transport=tcp'], secret, authorize, now: () => 1_800_000_000_000 }) }; };
it('issues expiring coturn credentials for the verified caller without returning the shared secret', async () => {
  const { handler, authorize } = setup(); const response = await handler(request()); const data = await response.json();
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(authorize).toHaveBeenCalledWith('Bearer disposable', 'class-room');
  expect(data.expiresAt).toBe(1_800_003_600);
  expect(data.iceServers[0].username).toBe('1800003600:verified-user');
  expect(data.iceServers[0].credential).toBe(createHmac('sha1', secret).update(data.iceServers[0].username).digest('base64'));
  expect(JSON.stringify(data)).not.toContain(secret);
});
it('rejects unauthenticated, unauthorized and malformed requests', async () => {
  const { handler, authorize } = setup();
  expect((await handler(request({}, ''))).status).toBe(401);
  expect((await handler(request({ room: 'bad/room' }))).status).toBe(400);
  expect((await handler(request({ room: 'x', pad: 'a'.repeat(2000) }))).status).toBe(400);
  expect((await handler(request(undefined, 'Bearer disposable', 'https://other.example.test'))).status).toBe(403);
  expect(authorize).not.toHaveBeenCalled(); authorize.mockResolvedValue(null);
  expect((await handler(request())).status).toBe(403);
});
it('fails closed for missing relay configuration or backend errors', async () => {
  const handler = iceHandler({ origins: [], urls: [], authorize: async () => 'user' });
  const response = await handler(new Request('https://edge.example.test', { method: 'POST', headers: { authorization: 'Bearer disposable' }, body: '{"room":"class-room"}' }));
  expect(response.status).toBe(503);
  const test = setup(); test.authorize.mockRejectedValue(new Error('sensitive backend failure'));
  expect(await (await test.handler(request())).text()).not.toContain('sensitive');
});

it('enforces the application quota before issuing relay credentials', async () => {
  const handler = iceHandler({ origins: [], urls: ['turn:relay.example.test:3478'], secret, authorize: async () => 'user', consumeQuota: async () => false });
  const response = await handler(new Request('https://edge.example.test', { method: 'POST', headers: { authorization: 'Bearer disposable' }, body: '{"room":"class-room"}' }));
  expect(response.status).toBe(429);
});
