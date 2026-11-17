import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Recording } from '@/types/models';

export const RECORDINGS_PER_PAGE = 10;
export function useRecordingPage(scope: { courseId: string; classId?: never } | { classId: string; courseId?: never }) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const key = `${scope.courseId ?? scope.classId}:${page}:${revision}`;
  const [response, setResponse] = useState<{ key: string; rows: Recording[]; total: number; error: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      const query = scope.courseId !== undefined
        ? supabase.from('class_recordings').select('*, live_classes!class_recordings_live_class_id_fkey!inner(course_id)', { count: 'exact' }).eq('live_classes.course_id', scope.courseId)
        : supabase.from('class_recordings').select('*', { count: 'exact' }).eq('live_class_id', scope.classId);
      const { data, count, error } = await query.order('created_at', { ascending: false }).order('id')
        .range(page * RECORDINGS_PER_PAGE, (page + 1) * RECORDINGS_PER_PAGE - 1).abortSignal(controller.signal);
      if (active) setResponse({ key, rows: data ?? [], total: count ?? 0, error: !!error });
    };
    void load().catch(() => { if (active) setResponse({ key, rows: [], total: 0, error: true }); });
    return () => { active = false; controller.abort(); };
  }, [scope.courseId, scope.classId, key, page]);
  const current = response?.key === key ? response : null;
  return { recordings: current?.rows ?? [], total: current?.total ?? 0, loading: !current,
    error: current?.error ?? false, page, setPage, retry: () => setRevision(r => r + 1) };
}
