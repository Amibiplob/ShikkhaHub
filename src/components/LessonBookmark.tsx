import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
export default function LessonBookmark({lessonId}:{lessonId:string}) {
 const {user}=useAuth();const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setSaved(false);if(user)supabase.from('lesson_bookmarks').select('id').eq('lesson_id',lessonId).eq('user_id',user.id).maybeSingle().then(({data})=>{if(active)setSaved(!!data);});return()=>{active=false;};},[lessonId,user]);
 if(!user)return null;
 return <Button variant="ghost" size="sm" aria-pressed={saved} disabled={busy} onClick={async()=>{setBusy(true);const {error}=saved?await supabase.from('lesson_bookmarks').delete().eq('lesson_id',lessonId).eq('user_id',user.id):await supabase.from('lesson_bookmarks').insert({lesson_id:lessonId,user_id:user.id});if(error)toast.error('Lesson bookmark was not saved. Try again.');else setSaved(!saved);setBusy(false);}}><Bookmark className={`mr-2 h-4 w-4 ${saved?'fill-current':''}`} />{saved?'Remove lesson bookmark':'Bookmark lesson'}</Button>;
}
