import { useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { AuthProvider } from './AuthContext';
import { useAuth } from '@/features/auth/useAuth';
const fake=vi.hoisted(()=>({listener:null as null | ((event:string,session:Session|null)=>void),roles:vi.fn(),profile:vi.fn(),initial:vi.fn(),signOut:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 auth:{onAuthStateChange:(cb:typeof fake.listener)=>{fake.listener=cb;return{data:{subscription:{unsubscribe:vi.fn()}}};},getSession:()=>fake.initial(),signOut:()=>fake.signOut()},
 from:(table:string)=>({select:()=>({eq:()=>table==='user_roles'?fake.roles():{single:()=>fake.profile()}})}),
}}));
vi.mock('sonner',()=>({toast:{error:vi.fn()}}));
const next=(id:string)=>({user:{id},access_token:'disposable'} as Session);
function State(){const auth=useAuth();return <><button onClick={auth.signOut}>Log out</button><p>{auth.loading?'loading':`${auth.user?.id||'guest'}:${auth.roles.join(',')}`}</p></>;}
beforeEach(()=>{fake.signOut.mockResolvedValue({error:null});fake.initial.mockResolvedValue({data:{session:null}});fake.roles.mockResolvedValue({data:[{role:'admin'}]});fake.profile.mockResolvedValue({data:{full_name:'Test'}});});
describe('session and role synchronization',()=>{
 it('reports signout transport failure without an unhandled rejection',async()=>{fake.signOut.mockRejectedValue(new Error('offline'));render(<AuthProvider><State /></AuthProvider>);await screen.findByText('guest:');fireEvent.click(screen.getByRole('button',{name:'Log out'}));await waitFor(()=>expect(toast.error).toHaveBeenCalledWith('Could not sign out. Please try again.'));});
 it('keeps authorization loading until roles arrive',async()=>{
 let resolve:(value:unknown)=>void;fake.roles.mockReturnValue(new Promise(r=>resolve=r));
 render(<AuthProvider><State /></AuthProvider>);await screen.findByText('guest:');act(()=>fake.listener?.('SIGNED_IN',next('admin')));await screen.findByText('loading');
 await act(async()=>resolve({data:[{role:'admin'}]}));await screen.findByText('admin:admin');
 });
 it('ignores a late role response after logout',async()=>{
 let resolve:(value:unknown)=>void;fake.roles.mockReturnValue(new Promise(r=>resolve=r));render(<AuthProvider><State /></AuthProvider>);await screen.findByText('guest:');act(()=>fake.listener?.('SIGNED_IN',next('old')));await screen.findByText('loading');act(()=>fake.listener?.('SIGNED_OUT',null));await screen.findByText('guest:');await act(async()=>resolve({data:[{role:'admin'}]}));expect(screen.getByText('guest:')).toBeInTheDocument();
 });
 it('fails closed when the role request rejects',async()=>{
 fake.roles.mockRejectedValue(new Error('offline'));render(<AuthProvider><State /></AuthProvider>);await screen.findByText('guest:');act(()=>fake.listener?.('SIGNED_IN',next('user')));await waitFor(()=>expect(screen.getByText('user:')).toBeInTheDocument());
 });
});

it('keeps a protected media session mounted during same-user SIGNED_IN revalidation', async () => {
  const cleanup = vi.fn();
  function MediaSession() { useEffect(() => cleanup, []); return <p>live media</p>; }
  function ProtectedMedia() { const auth = useAuth(); return auth.loading ? <p>loading media</p> : auth.user ? <MediaSession /> : null; }
  render(<AuthProvider><ProtectedMedia /></AuthProvider>);
  await waitFor(() => expect(fake.listener).toBeTypeOf('function'));
  await act(async () => fake.listener?.('SIGNED_IN', next('teacher')));
  await screen.findByText('live media');
  let resolve: (value: unknown) => void;
  fake.roles.mockReturnValue(new Promise(r => resolve = r));
  await act(async () => fake.listener?.('SIGNED_IN', next('teacher')));
  expect(cleanup).not.toHaveBeenCalled();
  expect(screen.getByText('live media')).toBeInTheDocument();
  await act(async () => resolve({ data: [{ role: 'teacher' }] }));
});

it('discards descendant state across accounts while preserving same-user session state', async () => {
  function PrivateState() { const auth = useAuth(); const [draft, setDraft] = useState(''); return <><p>{auth.user?.id ?? 'guest'}</p><input aria-label="Private draft" value={draft} onChange={e => setDraft(e.target.value)} /></>; }
  render(<AuthProvider><PrivateState /></AuthProvider>);
  await screen.findByText('guest');
  await act(async () => fake.listener?.('SIGNED_IN', next('first')));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'private first account' } });
  await act(async () => fake.listener?.('SIGNED_IN', next('first')));
  expect(screen.getByRole('textbox')).toHaveValue('private first account');
  await act(async () => fake.listener?.('SIGNED_IN', next('second')));
  expect(screen.getByRole('textbox')).toHaveValue('');
});
