import { expect, it, vi } from 'vitest';
import { readAllRows } from './read-all-rows';
function setup(responses: { data: { id: number }[] | null; count: number | null; error: unknown }[]) {
  const query = { order: vi.fn(() => query), abortSignal: vi.fn(() => query), range: vi.fn(async () => responses.shift()!) };
  return query;
}
it('reads beyond a smaller provider cap and uses deterministic order', async () => {
  const query = setup([{ data: [{ id: 1 }, { id: 2 }], count: 3, error: null }, { data: [{ id: 3 }], count: 3, error: null }]);
  expect((await readAllRows(query)).data.map(row => row.id)).toEqual([1,2,3]);
  expect(query.order).toHaveBeenCalledWith('id');
  expect(query.range.mock.calls).toEqual([[0,499],[2,501]]);
});
it('returns an empty authorized dataset when its exact total is zero', async () => {
  expect(await readAllRows(setup([{ data: [], count: 0, error: null }]))).toEqual({ data: [], error: null });
});
it.each([
  [{ data: [{ id: 1 }], count: null, error: null }],
  [{ data: [], count: 1, error: null }],
  [{ data: [], count: 50_001, error: null }],
  [{ data: [{ id: 1 }], count: 2, error: null }, { data: [{ id: 2 }], count: 3, error: null }],
].map(responses => ({ responses })))('rejects incomplete or inconsistent data instead of inventing a complete summary %#', async ({ responses }) => {
  await expect(readAllRows(setup(responses))).rejects.toThrow();
});
it('propagates provider errors and does not start another page after cancellation', async () => {
  const error = new Error('offline'); await expect(readAllRows(setup([{ data: null, count: null, error }]))).rejects.toBe(error);
  const abort = new AbortController(); abort.abort(); const query = setup([]);
  await expect(readAllRows(query, abort.signal)).rejects.toThrow(); expect(query.range).not.toHaveBeenCalled();
});
