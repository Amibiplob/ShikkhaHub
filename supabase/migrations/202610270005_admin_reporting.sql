CREATE FUNCTION public.admin_overview() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT jsonb_build_object(
 'users',(SELECT count(*) FROM public.profiles),'students',(SELECT count(*) FROM public.user_roles WHERE role='student'),
 'teachers',(SELECT count(*) FROM public.user_roles WHERE role='teacher'),'published_courses',(SELECT count(*) FROM public.courses WHERE is_published),
 'pending_courses',(SELECT count(*) FROM public.courses WHERE review_status='pending'),'enrollments',(SELECT count(*) FROM public.enrollments),
 'tutoring_requests',(SELECT count(*) FROM public.tutoring_requests WHERE status='pending'),
 'upcoming_tutoring',(SELECT count(*) FROM public.tutoring_requests r JOIN public.tutor_slots s ON s.id=r.slot_id WHERE r.status='approved' AND s.ends_at>now()),
 'completed_tutoring',(SELECT count(*) FROM public.tutoring_requests WHERE status='completed'),
 'open_support',(SELECT count(*) FROM public.support_tickets WHERE status<>'resolved'),
 'certificates',(SELECT count(*) FROM public.certificates WHERE validated_at IS NOT NULL AND revoked_at IS NULL AND course_id IS NOT NULL),
 'revoked_certificates',(SELECT count(*) FROM public.certificates WHERE revoked_at IS NOT NULL),
 'learning_completions',(SELECT count(*) FROM public.certificates WHERE validated_at IS NOT NULL),
 'activity',(SELECT coalesce(jsonb_agg(jsonb_build_object('date',d::date,'changes',(SELECT count(*) FROM public.admin_audit_log a WHERE a.created_at>=d AND a.created_at<d+interval '1 day')) ORDER BY d),'[]') FROM generate_series(date_trunc('day',now())-interval '6 days',date_trunc('day',now()),interval '1 day') d)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

-- Whitelisted query kinds; bounded server pagination and parameterized filters.
CREATE FUNCTION public.admin_records(kind text, search text DEFAULT '', state text DEFAULT '', page_offset integer DEFAULT 0, page_size integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE source text; result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF page_offset IS NULL OR page_offset<0 OR page_offset>100000 OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 50 OR length(coalesce(search,''))>200 THEN RAISE EXCEPTION 'Invalid pagination'; END IF;
 CASE kind
 WHEN 'users' THEN source=$q$SELECT p.id,p.user_id,p.full_name,p.created_at,'Registered profile'::text AS account_status,coalesce((SELECT jsonb_agg(r.role ORDER BY r.role) FROM public.user_roles r WHERE r.user_id=p.user_id),'[]') AS roles FROM public.profiles p$q$;
 WHEN 'courses' THEN source=$q$SELECT c.id,c.title,c.teacher_id,c.is_published,c.review_status AS status,c.created_at,p.full_name AS teacher FROM public.courses c LEFT JOIN public.profiles p ON p.user_id=c.teacher_id$q$;
 WHEN 'tutoring' THEN source=$q$SELECT r.id,r.student_id,r.status,r.message,r.decision_note,r.created_at,s.teacher_id,s.subject,s.starts_at,s.ends_at,s.timezone,p.full_name AS student,t.full_name AS teacher FROM public.tutoring_requests r JOIN public.tutor_slots s ON s.id=r.slot_id LEFT JOIN public.profiles p ON p.user_id=r.student_id LEFT JOIN public.profiles t ON t.user_id=s.teacher_id$q$;
 WHEN 'certificates' THEN source=$q$SELECT id,certificate_number,student_name,course_title,issued_at AS created_at,verification_token,CASE WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN course_id IS NULL THEN 'course_removed' WHEN validated_at IS NULL THEN 'pending_validation' ELSE 'valid' END AS status,revocation_reason FROM public.certificates$q$;
 WHEN 'support' THEN source=$q$SELECT id,user_id,name,email,category,subject,message,status,created_at,updated_at FROM public.support_tickets$q$;
 WHEN 'audit' THEN source=$q$SELECT id,actor_id,action,target_id,details,created_at FROM public.admin_audit_log$q$;
 WHEN 'community' THEN source=$q$SELECT id,title,content,user_id,is_pinned,is_reported,created_at FROM public.community_posts$q$;
 ELSE RAISE EXCEPTION 'Unknown administration view'; END CASE;
 EXECUTE 'WITH records AS ('||source||'), filtered AS (SELECT to_jsonb(r) AS record FROM records r WHERE (lower(to_jsonb(r)::text) LIKE ''%''||lower($1)||''%'') AND ($2='''' OR coalesce(to_jsonb(r)->>''status'','''')=$2 OR (to_jsonb(r)->''roles'') ? $2)), page AS (SELECT record FROM filtered ORDER BY record->>''created_at'' DESC,record->>''id'' LIMIT $3 OFFSET $4) SELECT jsonb_build_object(''rows'',coalesce((SELECT jsonb_agg(record) FROM page),''[]''),''total'',(SELECT count(*) FROM filtered))'
 INTO result USING coalesce(search,''),coalesce(state,''),page_size,page_offset;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_records(text,text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_records(text,text,text,integer,integer) TO authenticated;

CREATE FUNCTION public.audit_course_moderation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.has_role(auth.uid(),'admin') THEN
  INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'course.'||lower(TG_OP),CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END::text,'{}');
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER audit_course_moderation AFTER DELETE OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.audit_course_moderation();
REVOKE ALL ON FUNCTION public.audit_course_moderation() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.audit_community_moderation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.has_role(auth.uid(),'admin') THEN INSERT INTO public.admin_audit_log(actor_id,action,target_id) VALUES(auth.uid(),'community.'||lower(TG_OP),CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END::text); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER audit_community_moderation AFTER DELETE OR UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.audit_community_moderation();
REVOKE ALL ON FUNCTION public.audit_community_moderation() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_content_action(target_id uuid, content_kind text, action text, reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF coalesce(length(trim(reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'A reason is required'; END IF;
 IF content_kind='course' AND action='delete' THEN DELETE FROM public.courses WHERE id=target_id;
 ELSIF content_kind='post' AND action='delete' THEN DELETE FROM public.community_posts WHERE id=target_id;
 ELSIF content_kind='post' AND action IN ('pin','unpin') THEN UPDATE public.community_posts SET is_pinned=(action='pin') WHERE id=target_id;
 ELSE RAISE EXCEPTION 'Invalid content moderation action'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Moderated content not found'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),content_kind||'.'||action,target_id::text,jsonb_build_object('reason',trim(reason)));
END $$;
REVOKE ALL ON FUNCTION public.admin_content_action(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_content_action(uuid,text,text,text) TO authenticated;
