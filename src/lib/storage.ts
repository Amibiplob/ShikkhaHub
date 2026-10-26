import { supabase } from '@/integrations/supabase/client';

// Keep stable object paths in rows. Resolve fresh, short-lived URLs on access.
export async function privateFileUrl(bucket: string, pathOrUrl: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const path = pathOrUrl.includes(marker) ? decodeURIComponent(pathOrUrl.split(marker)[1].split('?')[0]) : pathOrUrl;
  if (/^https?:\/\//i.test(path)) return path; // An explicitly supplied external resource.
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export const allowedDocument = (file: File, maxMB = 10) =>
  file.size <= maxMB * 1024 * 1024 && /\.(pdf|txt|doc|docx|zip)$/i.test(file.name);
