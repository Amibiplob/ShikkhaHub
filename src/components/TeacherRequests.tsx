import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TeacherRequests({ onReviewed }: { onReviewed: () => void }) {
  const [requests,setRequests]=useState<Tables<'teacher_requests'>[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  const load=async()=>{ const {data,error}=await supabase.from('teacher_requests').select('*').eq('status','pending').order('created_at');setError(!!error);setRequests(data??[]); };
  useEffect(()=>{void load();},[]);
  const review=async(id:string,approve:boolean)=>{
    setBusy(true);const {error}=await supabase.rpc('review_teacher_request',{request_id:id,approve});
    if(error)toast.error(error.message);else{toast.success(approve?'Teacher access approved':'Request dismissed');await load();onReviewed();}setBusy(false);
  };
  return <section className="mb-8 rounded-xl border bg-card p-5" aria-labelledby="teacher-requests-heading">
    <h2 id="teacher-requests-heading" className="mb-3 text-xl font-semibold">Teacher access requests</h2>
    {error?<p role="alert">Could not load teacher requests. <Button onClick={load} variant="outline">Retry</Button></p>:!requests.length?<p className="text-sm text-muted-foreground">No pending requests.</p>:<ul className="space-y-3">{requests.map(r=><li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p className="font-medium">{r.full_name||'Applicant'}</p><p className="text-sm text-muted-foreground">{r.email}</p></div><div className="flex gap-2"><Button disabled={busy} onClick={()=>review(r.id,true)}>Approve teacher</Button><Button disabled={busy} variant="outline" onClick={()=>review(r.id,false)}>Dismiss</Button></div></li>)}</ul>}
  </section>;
}
