-- Supabase Realtime already owns/enables RLS on realtime.messages. Do not ALTER it.
-- Clients receive only; each outgoing event is authorized and stamped by the RPC.
CREATE POLICY "Course participants receive live broadcasts" ON realtime.messages FOR SELECT TO authenticated USING (
 extension='broadcast' AND EXISTS(SELECT 1 FROM public.live_classes lc
 WHERE 'live-'||lc.room_name=(SELECT realtime.topic()) AND lc.status IN ('scheduled','live') AND public.can_access_course(lc.course_id)));
CREATE FUNCTION public.send_live_signal(room text, signal_event text, signal_payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lc public.live_classes; sender_name text; body jsonb;
BEGIN
 SELECT * INTO lc FROM public.live_classes WHERE room_name=room;
 IF NOT FOUND OR NOT coalesce(public.can_access_course(lc.course_id),false) THEN RAISE EXCEPTION 'Course access required'; END IF;
 IF lc.status NOT IN ('scheduled','live') AND signal_event<>'teacher-ended' THEN RAISE EXCEPTION 'Class has ended'; END IF;
 IF signal_payload IS NULL OR jsonb_typeof(signal_payload)<>'object' OR octet_length(signal_payload::text)>65536 THEN RAISE EXCEPTION 'Invalid signal'; END IF;
 IF signal_event IN ('teacher-live','teacher-ended','offer') THEN
   IF auth.uid()<>lc.teacher_id THEN RAISE EXCEPTION 'Only the teacher may send this event'; END IF;
 ELSIF signal_event NOT IN ('join-request','answer','ice-candidate','chat-message','raise-hand','leave') THEN RAISE EXCEPTION 'Invalid signal event'; END IF;
 IF signal_event='chat-message' AND (length(trim(coalesce(signal_payload->>'message','')))=0 OR length(signal_payload->>'message')>2000) THEN RAISE EXCEPTION 'Invalid chat message'; END IF;
 SELECT coalesce(full_name,'Participant') INTO sender_name FROM public.profiles WHERE user_id=auth.uid();
 body=signal_payload || jsonb_build_object('fromId',auth.uid(),'userId',auth.uid(),'userName',sender_name,'studentId',auth.uid(),'studentName',sender_name,'teacherId',lc.teacher_id);
 PERFORM realtime.send(body,signal_event,'live-'||room,true);
END $$;
REVOKE ALL ON FUNCTION public.send_live_signal(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_live_signal(text,text,jsonb) TO authenticated;
