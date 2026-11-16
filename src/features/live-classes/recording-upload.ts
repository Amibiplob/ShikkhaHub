import { supabase } from '@/integrations/supabase/client';
import { deleteDraft, recordingBlob, type RecordingDraft } from './recording-store';

/** Idempotent private upload. Never discard a draft on an unverified conflict. */
export async function uploadRecording(draft: RecordingDraft, userId: string, classId: string) {
  if (!draft.complete || draft.userId !== userId || draft.classId !== classId)
    throw new Error('Recording draft ownership or completion mismatch');
  const path = `${classId}/${draft.id}.${draft.mime.includes('mp4') ? 'mp4' : 'webm'}`;
  const read = () => supabase.from('class_recordings')
    .select('id, teacher_id, live_class_id, file_url').eq('id', draft.id).maybeSingle();
  const matches = (row: { teacher_id: string; live_class_id: string; file_url: string } | null) =>
    row?.teacher_id === userId && row.live_class_id === classId && row.file_url === path;
  const existing = await read();
  if (existing.error) throw existing.error;
  if (existing.data && !matches(existing.data)) throw new Error('Conflicting recording metadata');
  if (!existing.data) {
    const blob = await recordingBlob(draft);
    if (blob.size < 100) throw new Error('No finalized recording media');
    const { error: uploadError } = await supabase.storage.from('class-recordings')
      .upload(path, blob, { contentType: draft.mime.split(';')[0], upsert: false });
    if (uploadError) {
      if (!['409', 'Duplicate'].includes(String((uploadError as { statusCode?: string }).statusCode || uploadError.name))) throw uploadError;
      // A retry after metadata failure may find its own object; never assume it.
      const { data, error } = await supabase.storage.from('class-recordings').download(path);
      if (error || !data || data.size !== blob.size) throw new Error('Cannot verify existing recording object');
      const hash = async (b: Blob) => new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer()));
      const [saved, local] = await Promise.all([hash(data), hash(blob)]);
      if (!saved.every((byte, i) => byte === local[i])) throw new Error('Conflicting recording object');
    }
    const { error } = await supabase.from('class_recordings').insert({
      id: draft.id, teacher_id: userId, live_class_id: classId, file_url: path,
      file_size: blob.size, duration_seconds: draft.duration, title: draft.title,
    });
    if (error && error.code !== '23505') throw error;
    const confirmed = await read();
    if (confirmed.error || !matches(confirmed.data)) throw new Error('Recording metadata was not confirmed');
  }
  // Storage/metadata succeeded even if this browser cannot remove the local copy.
  try { await deleteDraft(draft.id); return { localCopyRetained: false }; }
  catch { return { localCopyRetained: true }; }
}
