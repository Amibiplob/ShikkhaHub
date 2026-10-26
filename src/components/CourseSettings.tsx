import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function CourseSettings({course,onSaved}:{course:Course;onSaved:(course:Course)=>void}) {
 const [editing,setEditing]=useState(false);const [busy,setBusy]=useState(false);
 const [price,setPrice]=useState(String(course.price_bdt || 0));
 const [title,setTitle]=useState(course.title);const [description,setDescription]=useState(course.description||'');const [category,setCategory]=useState(course.category||'');
 return <section className="mt-8 rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Course information</h2>{!editing?<Button className="mt-4" variant="outline" onClick={()=>setEditing(true)}>Edit course information</Button>:<form className="mt-4 max-w-xl space-y-4" onSubmit={async e=>{e.preventDefault();if(!Number.isInteger(Number(price))||Number(price)<0){toast.error("Enter a valid non-negative price");return;}setBusy(true);const values={title:title.trim(),description:description.trim(),category:category.trim()||null,price_bdt:Number(price)};const {error}=await supabase.from('courses').update(values).eq('id',course.id);if(error)toast.error(error.message);else{onSaved({...course,...values});setEditing(false);toast.success('Course updated');}setBusy(false);}}>
 <div><Label htmlFor="course-title">Course title</Label><Input id="course-title" required minLength={3} value={title} onChange={e=>setTitle(e.target.value)} /></div><div><Label htmlFor="course-description">Course description</Label><Textarea id="course-description" value={description} onChange={e=>setDescription(e.target.value)} /></div><div><Label htmlFor="course-category">Course category</Label><Input id="course-category" value={category} onChange={e=>setCategory(e.target.value)} /></div><div><Label htmlFor="course-price">Price (BDT; 0 for free)</Label><Input id="course-price" type="number" min={0} step={1} required value={price} onChange={e=>setPrice(e.target.value)} /><p className="mt-2 text-sm text-muted-foreground">Paid courses can be displayed. Payment and paid enrollment are future work.</p></div><div className="flex gap-3"><Button type="submit" disabled={busy}>Save course information</Button><Button variant="outline" type="button" onClick={()=>setEditing(false)}>Cancel</Button></div>
 </form>}</section>;
}
