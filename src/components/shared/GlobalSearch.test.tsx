import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { deferred } from '@/test/deferred';
import GlobalSearch from './GlobalSearch';
const fake = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const query = { select: () => query, eq: () => query, ilike: (_: string, term: string) => { key = term; return query; }, limit: () => query, abortSignal: () => fake.search(table, key) };
  let key = '';
  return query;
} } }));
beforeEach(() => { vi.useFakeTimers(); fake.search.mockReset(); });
afterEach(() => vi.useRealTimers());
const type = async (value: string) => { fireEvent.change(screen.getByRole('textbox'), { target: { value } }); await act(async () => { await vi.advanceTimersByTimeAsync(300); }); };
it('keeps new results when an older request finishes later', async () => {
  const old = deferred<{ data: { id: string; title: string }[] }>();
  fake.search.mockImplementation((table, term) => table === 'courses' && term === '%old%' ? old.promise : Promise.resolve({ data: table === 'courses' ? [{ id: 'new', title: 'New course' }] : [] }));
  render(<MemoryRouter><GlobalSearch /></MemoryRouter>);
  await type('old'); await type('new');
  expect(screen.getByText('New course')).toBeInTheDocument();
  await act(async () => old.resolve({ data: [{ id: 'old', title: 'Old course' }] }));
  expect(screen.queryByText('Old course')).not.toBeInTheDocument();
});
it('clearing cancels pending work and never revives previous results', async () => {
  const pending = deferred<{ data: { id: string; title: string }[] }>();
  fake.search.mockReturnValue(pending.promise);
  render(<MemoryRouter><GlobalSearch /></MemoryRouter>); await type('pending');
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  await act(async () => pending.resolve({ data: [{ id: 'old', title: 'Old course' }] }));
  expect(screen.getByRole('textbox')).toHaveValue(''); expect(screen.queryByText('Old course')).not.toBeInTheDocument();
});
it('reports provider errors and allows a retry; literal wildcards are escaped', async () => {
  fake.search.mockResolvedValue({ data: null, error: { message: 'offline' } });
  render(<MemoryRouter><GlobalSearch /></MemoryRouter>); await type('a_%');
  expect(screen.getByRole('alert')).toHaveTextContent('Search failed');
  expect(fake.search).toHaveBeenCalledWith('courses', '%a\\_\\%%');
  fake.search.mockResolvedValue({ data: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Retry search' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(screen.getByText('No results found')).toBeInTheDocument();
});
