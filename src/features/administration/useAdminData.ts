import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
export type RecordRow = Record<string, Json | undefined>;
type PageData = { rows: RecordRow[]; total: number };
type Overview = Record<string, number | { date: string; changes: number }[]>;

export function useAdminData(kind: string, query: string, state: string, page: number, revision: number, params: URLSearchParams) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [statsError, setStatsError] = useState('');
  const [data, setData] = useState<PageData>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void Promise.resolve(supabase.rpc("admin_overview", {})).then(({ data, error }) => {
      if (active) {
        if (error) setStatsError("Could not load platform statistics.");
        else {
          setStatsError("");
          setOverview(data as unknown as Overview);
        }
      }
    }).catch(() => { if (active) setStatsError("Could not load platform statistics."); });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    let active = true;
    void Promise.resolve(supabase
      .rpc("admin_records", {
        kind,
        search: query,
        state:
          kind === "users" && params.get("role") === "teacher" && !state
            ? "teacher"
            : state,
        page_offset: page * 10,
        page_size: 10,
      }))
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("Could not load records. Please try again.");
        else {
          setError("");
          setData(data as unknown as PageData);
        }
        setLoading(false);
      }).catch(() => { if (active) { setError("Could not load records. Please try again."); setLoading(false); } });
    return () => {
      active = false;
    };
  }, [kind, query, state, page, revision, params]);
  return { overview, statsError, data, loading, error, setLoading };
}
