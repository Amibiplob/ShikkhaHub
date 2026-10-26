import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TutorSlot, TutoringRequest } from '@/lib/models';
import { toast } from 'sonner';

type Tutor = { user_id: string; full_name: string | null; bio: string | null };
export default function Tutors() {
  const { user, hasRole } = useAuth();
  const [slots, setSlots] = useState<TutorSlot[]>([]);
  const [requests, setRequests] = useState<TutoringRequest[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError('');
    const [available, own] = await Promise.all([
      supabase.from('tutor_slots').select('*').order('starts_at'),
      user ? supabase.from('tutoring_requests').select('*').order('created_at', { ascending: false }) : Promise.resolve({data: [], error: null}),
    ]);
    if (available.error || own.error) setError('Could not load tutoring. Check setup or try again.');
    setSlots(available.data ?? []);
    setRequests(own.data ?? []);
    const teacherIds = [...new Set((available.data ?? []).map(s => s.teacher_id))];
    if (teacherIds.length) {
      const { data } = await supabase.from('profiles').select('user_id,full_name,bio').in('user_id', teacherIds);
      setTutors(data ?? []);
    } else setTutors([]);
    setLoading(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const createSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !hasRole('teacher')) return;
    if (new Date(ends) <= new Date(starts) || new Date(starts) <= new Date()) { toast.error('Choose a future start and a later end time'); return; }
    setBusy(true);
    const { error } = await supabase.from('tutor_slots').insert({ teacher_id: user.id, subject: subject.trim(), starts_at: new Date(starts).toISOString(), ends_at: new Date(ends).toISOString() });
    if (error) toast.error(error.message);
    else { toast.success('Availability added'); setSubject(''); setStarts(''); setEnds(''); await load(); }
    setBusy(false);
  };
  const requestSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from('tutoring_requests').insert({slot_id: selected, student_id: user.id, message: message.trim()});
    if (error) toast.error(error.message);
    else { toast.success('Tutoring requested'); setSelected(''); setMessage(''); await load(); }
    setBusy(false);
  };
  const resolve = async (request: TutoringRequest, status: string) => {
    const meeting = links[request.id]?.trim() || null;
    if (status === 'approved' && (!meeting || !/^https:\/\/[^\s]+$/i.test(meeting))) { toast.error('Enter an HTTPS meeting link'); return; }
    setBusy(true);
    const { error } = await supabase.from('tutoring_requests').update({status, meeting_url: status === 'approved' ? meeting : null}).eq('id',request.id);
    if (error) toast.error(error.message); else { toast.success(`Request ${status}`); await load(); }
    setBusy(false);
  };
  const visible = slots.filter(s => new Date(s.starts_at) > new Date() && `${s.subject} ${tutors.find(t=>t.user_id===s.teacher_id)?.full_name}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="min-h-screen flex flex-col"><Header /><main className="container mx-auto flex-1 px-4 py-10">
    <h1 className="text-3xl font-bold">Private Tutoring</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Find a teacher and request an available session. Teachers approve requests and share a private meeting link.</p>
    <div className="mt-6 max-w-md"><Label htmlFor="tutor-search">Search subject or teacher</Label><Input id="tutor-search" value={search} onChange={e=>setSearch(e.target.value)} /></div>
    {error && <div role="alert" className="my-6 text-destructive">{error} <Button variant="outline" onClick={load}>Retry</Button></div>}
    {loading ? <p role="status" className="my-6">Loading tutors…</p> : !visible.length ? <p className="my-6 text-muted-foreground">No matching availability yet.</p> : <ul className="my-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visible.map(slot => <li key={slot.id} className="rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">{slot.subject}</h2><p className="mt-2">{tutors.find(t=>t.user_id===slot.teacher_id)?.full_name || 'Teacher'}</p>
      <p className="mt-2 text-sm text-muted-foreground">{tutors.find(t=>t.user_id===slot.teacher_id)?.bio}</p>
      <p className="my-4 text-sm"><time dateTime={slot.starts_at}>{new Date(slot.starts_at).toLocaleString()}</time> – {new Date(slot.ends_at).toLocaleTimeString()}</p>
      {!user ? <Button asChild variant="outline"><Link to="/auth">Sign in to request</Link></Button> : slot.teacher_id !== user.id && !requests.some(r=>r.slot_id===slot.id && r.student_id===user.id) ? <Button onClick={()=>setSelected(slot.id)}>Request tutoring</Button> : <p className="text-sm text-muted-foreground">{slot.teacher_id===user.id ? 'Your availability' : 'Request sent'}</p>}
      {selected===slot.id && <form onSubmit={requestSlot} className="mt-4 space-y-3"><Label htmlFor="tutor-message">What would you like to learn?</Label><Textarea id="tutor-message" minLength={3} maxLength={2000} required value={message} onChange={e=>setMessage(e.target.value)} /><Button type="submit" disabled={busy}>Send request</Button></form>}
    </li>)}</ul>}
    {user && hasRole('teacher') && <section className="my-10 max-w-xl rounded-xl border bg-card p-5" aria-labelledby="offer-heading"><h2 id="offer-heading" className="mb-4 text-xl font-semibold">Offer availability</h2><form onSubmit={createSlot} className="space-y-4">
      <div><Label htmlFor="tutor-subject">Subject</Label><Input id="tutor-subject" required minLength={3} maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} /></div>
      <div><Label htmlFor="slot-start">Starts (your local time)</Label><Input id="slot-start" type="datetime-local" required value={starts} onChange={e=>setStarts(e.target.value)} /></div>
      <div><Label htmlFor="slot-end">Ends (your local time)</Label><Input id="slot-end" type="datetime-local" required value={ends} onChange={e=>setEnds(e.target.value)} /></div><Button type="submit" disabled={busy}>Add availability</Button>
    </form></section>}
    {user && <section className="my-10" aria-labelledby="requests-heading"><h2 id="requests-heading" className="mb-4 text-2xl font-bold">Your tutoring requests</h2>{!requests.length && <p className="text-muted-foreground">No requests yet.</p>}
      <div className="grid gap-4 md:grid-cols-2">{requests.map(request=>{const slot=slots.find(s=>s.id===request.slot_id); const owner=slot?.teacher_id===user.id; return <article key={request.id} className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">{slot?.subject || 'Tutoring session'}</h3><p className="my-2 break-words">{request.message}</p><p className="text-sm">Status: {request.status}</p>
        {request.status==='approved' && request.meeting_url && <a href={request.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-primary underline">Join tutoring meeting</a>}
        {request.status==='pending' && (owner ? <div className="mt-4 space-y-3"><Label htmlFor={`meeting-${request.id}`}>HTTPS meeting link</Label><Input id={`meeting-${request.id}`} type="url" value={links[request.id] || ''} onChange={e=>setLinks({...links,[request.id]:e.target.value})} /><div className="flex gap-3"><Button disabled={busy} onClick={()=>resolve(request,'approved')}>Approve</Button><Button disabled={busy} variant="outline" onClick={()=>resolve(request,'rejected')}>Reject</Button></div></div> : <Button className="mt-3" variant="outline" disabled={busy} onClick={()=>resolve(request,'cancelled')}>Cancel request</Button>)}
      </article>;})}</div>
    </section>}
  </main><Footer /></div>;
}
