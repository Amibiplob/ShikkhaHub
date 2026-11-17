interface Page<T> { data: T[] | null; error: unknown; count: number | null }
interface PagedRead<T> {
  order(column: string): PagedRead<T>;
  abortSignal(signal: AbortSignal): PagedRead<T>;
  range(from: number, to: number): PromiseLike<Page<T>>;
}

/** Read exact-count, caller-scoped datasets used for derived summaries.
 * A smaller provider cap is not an end marker. Missing/changing counts, stalled
 * pages or excessive datasets fail visibly rather than returning partial totals.
 */
export async function readAllRows<T>(query: PagedRead<T>, signal?: AbortSignal) {
  const rows: T[] = [];
  const deadline = AbortSignal.timeout(30_000);
  const cancellation = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const ordered = query.order('id').abortSignal(cancellation);
  let total: number | undefined;
  for (let page = 0; page < 200; page++) {
    cancellation.throwIfAborted();
    const response = await ordered.range(rows.length, rows.length + 499);
    cancellation.throwIfAborted();
    if (response.error) throw response.error;
    if (response.count === null || !Number.isSafeInteger(response.count) || response.count < 0 || response.count > 50_000)
      throw new Error('This dataset cannot be summarized completely. Narrow the scope or retry.');
    if (total !== undefined && total !== response.count)
      throw new Error('The dataset changed while loading. Please retry.');
    total = response.count;
    const data = response.data ?? [];
    if (!data.length && rows.length < total) throw new Error('An incomplete data page was returned. Please retry.');
    rows.push(...data);
    if (rows.length > total) throw new Error('Inconsistent dataset. Please retry.');
    if (rows.length === total) return { data: rows, error: null };
  }
  throw new Error('Too many data pages to summarize completely. Narrow the scope or retry.');
}
