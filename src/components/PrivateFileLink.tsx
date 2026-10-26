import { useState } from 'react';
import { privateFileUrl } from '@/lib/storage';
import { toast } from 'sonner';

export default function PrivateFileLink({ bucket, path, children }: { bucket: string; path: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  return <button type="button" className="text-primary underline text-sm break-all" disabled={loading} onClick={async () => {
    // Open synchronously so popup blockers do not swallow an authorized download.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setLoading(true);
    try { const url = await privateFileUrl(bucket, path); if (tab) tab.location.href = url; else toast.error('Allow popups to open this file.'); }
    catch { tab?.close(); toast.error('Could not open this file. Check your access and try again.'); }
    finally { setLoading(false); }
  }}>{loading ? 'Opening…' : children}</button>;
}
