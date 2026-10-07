export interface SortablePost { id: string; is_pinned?: boolean | null; created_at: string }

/** Pinned first, then most upvotes, then newest. */
export const sortPopular = <T extends SortablePost>(posts: T[], counts: Record<string, number>): T[] =>
  [...posts].sort((a, b) => {
    if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
    const diff = (counts[b.id] || 0) - (counts[a.id] || 0);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

export const paginate = <T,>(items: T[], page: number, size: number): T[] => items.slice(page * size, (page + 1) * size);

export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / size));
