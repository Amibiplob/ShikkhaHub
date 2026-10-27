import { render, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import NotificationBell from './NotificationBell';

const fake = vi.hoisted(() => ({
  user: { id: 'student-a' },
  channel: vi.fn(() => {
    const subscription = { on: vi.fn(), subscribe: vi.fn() };
    subscription.on.mockReturnValue(subscription);
    subscription.subscribe.mockReturnValue(subscription);
    return subscription;
  }),
  removeChannel: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: fake.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  channel: fake.channel,
  removeChannel: fake.removeChannel,
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: [] }) };
    return query;
  },
} }));

it('uses a private recipient topic and replaces it when the signed-in account changes', async () => {
  const view = render(<NotificationBell />);
  await waitFor(() => expect(fake.channel).toHaveBeenCalledWith('notifications-student-a', { config: { private: true } }));
  const previous = fake.channel.mock.results[0].value;
  fake.user = { id: 'student-b' };
  view.rerender(<NotificationBell />);
  await waitFor(() => expect(fake.channel).toHaveBeenCalledWith('notifications-student-b', { config: { private: true } }));
  expect(fake.removeChannel).toHaveBeenCalledWith(previous);
  view.unmount();
});
