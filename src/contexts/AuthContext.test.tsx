import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
const fake=vi.hoisted(()=>({listener:null as null | ((event:string,session:Session|null)=>void),roles:vi.fn(),profile:vi.fn(),initial:vi.fn(),signOut:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 auth:{onAuthStateChange:(cb:typeof fake.listener)=>{fake.listener=cb;return{data:{subscription:{unsubscribe:vi.fn()}}};},getSession:()=>fake.initial(),signOut:()=>fake.signOut()},
 from:(table:string)=>({select:()=>({eq:()=>table==='user_roles'?fake.roles():{single:()=>fake.profile()}})}),
}}));
vi.mock('sonner',()=>({toast:{error:vi.fn()}}));
import { toast } from 'sonner';
import { AuthProvider,useAuth } from './AuthContext';
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
