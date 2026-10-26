import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase,seed,ids,asUser} from './database.mjs';
let db;
before(async()=>{db=await createDatabase();await seed(db);});
after(async()=>{await db?.close();});
const sql=(user,query,args=[])=>asUser(db,user,query,args);
async function slot(teacher=ids.teacher,days=3,hour=10){return (await sql(teacher,"SELECT * FROM save_tutor_slot(NULL,'Programming',$1::timestamptz,60,'Asia/Dhaka',1)",[new Date(Date.now()+days*86400000).toISOString().slice(0,11)+String(hour).padStart(2,'0')+':00:00Z'])).rows[0];}
async function request(s,student=ids.student){return (await sql(student,"SELECT * FROM request_tutoring($1,'Help me learn loops')",[s.id])).rows[0];}

test('role RPC independently authorizes administrators and audits grants/revocations',async()=>{
 await assert.rejects(()=>sql(ids.student,"SELECT admin_set_role($1,'admin',true,'Self promotion')",[ids.student]),/Administrator/);
 await assert.rejects(()=>sql(ids.teacher,"SELECT admin_set_role($1,'admin',true,'Escalation')",[ids.teacher]),/Administrator/);
 await assert.rejects(()=>sql(ids.admin,"INSERT INTO user_roles(user_id,role) VALUES($1,'admin')",[ids.other]),/permission denied/);
 await sql(ids.admin,"SELECT admin_set_role($1,'admin',true,'Review test account')",[ids.other]);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM admin_audit_log WHERE action='role.review'")).rows[0].n,1);
 await sql(ids.admin,"SELECT admin_set_role($1,'admin',false,'End temporary access')",[ids.other]);
 await assert.rejects(()=>sql(ids.admin,"SELECT admin_set_role($1,'admin',false,'Remove own access')",[ids.admin]),/own admin/);
 await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(()=>db.exec("DELETE FROM user_roles WHERE role='admin'"),/At least one admin/);
 await assert.rejects(()=>sql(ids.student,'SELECT * FROM application_locks'),/permission denied/);
 assert.equal((await sql(ids.student,'SELECT * FROM admin_audit_log')).rows.length,0);
});

test('teacher publication requires reviewed backend operations; existing published courses survive',async()=>{
 assert.equal((await db.query('SELECT is_published FROM courses WHERE id=$1',[ids.course])).rows[0].is_published,true);
 await assert.rejects(()=>sql(ids.teacher,'UPDATE courses SET is_published=true WHERE id=$1',[ids.draft]),/review workflow/);
 await assert.rejects(()=>sql(ids.teacher,"UPDATE courses SET review_status='approved' WHERE id=$1",[ids.draft]),/review workflow/);
 await sql(ids.teacher,'SELECT request_course_review($1)',[ids.draft]);
 await assert.rejects(()=>sql(ids.student,"SELECT admin_course_action($1,'approve','Student approval')",[ids.draft]),/Administrator/);
 await sql(ids.admin,"SELECT admin_course_action($1,'approve','Reviewed course content')",[ids.draft]);
 assert.equal((await db.query('SELECT is_published FROM courses WHERE id=$1',[ids.draft])).rows[0].is_published,true);
 await sql(ids.teacher,"UPDATE courses SET description='Changed content' WHERE id=$1",[ids.draft]);
 assert.equal((await db.query('SELECT is_published FROM courses WHERE id=$1',[ids.draft])).rows[0].is_published,false);
});

test('availability supports timezone-aware weekly recurrence, editing, conflicts and ownership',async()=>{
 const date=new Date(Date.now()+10*86400000).toISOString();
 const recurring=await sql(ids.teacher,"SELECT * FROM save_tutor_slot(NULL,'Algorithms',$1,45,'Asia/Dhaka',3)",[date]);
 assert.equal(recurring.rows.length,3);assert.equal(recurring.rows[0].timezone,'Asia/Dhaka');
 await assert.rejects(()=>sql(ids.student,"SELECT * FROM save_tutor_slot(NULL,'Fake',$1,45,'UTC',1)",[date]),/Teacher/);
 await assert.rejects(()=>sql(ids.teacher,"SELECT * FROM save_tutor_slot(NULL,'Overlap',$1,45,'UTC',1)",[date]),/overlaps/);
 const s=recurring.rows[0];
 await assert.rejects(()=>sql(ids.other,"SELECT cancel_tutor_slot($1)",[s.id]),/owned slot/);
 await sql(ids.teacher,"SELECT * FROM save_tutor_slot($1,'Edited algorithms',$2,30,'UTC',1)",[s.id,new Date(Date.parse(date)+3600000).toISOString()]);
 await sql(ids.teacher,'SELECT cancel_tutor_slot($1)',[s.id]);
 assert.ok((await db.query('SELECT cancelled_at FROM tutor_slots WHERE id=$1',[s.id])).rows[0].cancelled_at);
 await assert.rejects(()=>request(s),/available slot/);
});

test('weekly recurrence rejects DST gaps atomically without partial availability',async()=>{
 const year=new Date().getUTCFullYear()+(new Date().getUTCMonth()>2?1:0);
 let secondSunday=new Date(Date.UTC(year,2,8));while(secondSunday.getUTCDay()!==0)secondSunday=new Date(secondSunday.getTime()+86400000);
 const priorSunday=new Date(secondSunday.getTime()-7*86400000);priorSunday.setUTCHours(7,30,0,0);
 await assert.rejects(()=>sql(ids.teacher,"SELECT * FROM save_tutor_slot(NULL,'DST gap test',$1,30,'America/New_York',2)",[priorSunday.toISOString()]),/nonexistent local time/);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM tutor_slots WHERE subject='DST gap test'")).rows[0].n,0);
});

test('booking prohibits past/self/direct writes and protects participant links',async()=>{
 const s=await slot();
 await assert.rejects(()=>request(s,ids.teacher),/yourself/);
 await assert.rejects(()=>sql(ids.student,"INSERT INTO tutoring_requests(slot_id,student_id,message) VALUES($1,$2,'Direct insert')",[s.id,ids.student]),/permission denied/);
 const r=await request(s);
 await assert.rejects(()=>sql(ids.student,"SELECT decide_tutoring($1,'approve','https://example.test/private',NULL)",[r.id]),/Only the teacher/);
 await assert.rejects(()=>sql(ids.other,"SELECT decide_tutoring($1,'cancel',NULL,NULL)",[r.id]),/access required/);
 await sql(ids.teacher,"SELECT decide_tutoring($1,'approve','https://example.test/private',NULL)",[r.id]);
 assert.equal((await sql(ids.other,'SELECT meeting_url FROM tutoring_requests WHERE id=$1',[r.id])).rows.length,0);
 assert.equal((await sql(ids.student,'SELECT meeting_url FROM tutoring_requests WHERE id=$1',[r.id])).rows[0].meeting_url,'https://example.test/private');
 await assert.rejects(()=>sql(ids.student,"SELECT decide_tutoring($1,'complete',NULL,NULL)",[r.id]),/Only the teacher/);
 await assert.rejects(()=>sql(ids.teacher,"SELECT decide_tutoring($1,'complete',NULL,NULL)",[r.id]),/after the session/);
 await sql(ids.student,"SELECT decide_tutoring($1,'cancel',NULL,'Cannot attend')",[r.id]);
 const row=(await db.query('SELECT status,meeting_url FROM tutoring_requests WHERE id=$1',[r.id])).rows[0];assert.equal(row.status,'cancelled');assert.equal(row.meeting_url,null);
 await assert.rejects(()=>sql(ids.teacher,"SELECT decide_tutoring($1,'approve','https://example.test/private',NULL)",[r.id]),/pending booking/);
});

test('competing confirmations and cross-tutor student overlap allow only one reservation',async()=>{
 const s=await slot(ids.teacher,4),other=await slot(ids.other,4);
 const a=await request(s),b=await request(s,ids.admin),c=await request(other);
 // PGlite serializes operations: these competing transactions test the contract,
 // not simultaneous independent PostgreSQL connections (separate optional test).
 const attempts=await Promise.allSettled([
  db.transaction(async tx=>{await tx.exec('SET LOCAL ROLE authenticated');await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[ids.teacher]);return tx.query("SELECT decide_tutoring($1,'approve','https://example.test/one',NULL)",[a.id]);}),
  db.transaction(async tx=>{await tx.exec('SET LOCAL ROLE authenticated');await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[ids.teacher]);return tx.query("SELECT decide_tutoring($1,'approve','https://example.test/two',NULL)",[b.id]);}),
 ]);
 assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
 await assert.rejects(()=>sql(ids.other,"SELECT decide_tutoring($1,'approve','https://example.test/other',NULL)",[c.id]),/conflicts/);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM tutoring_requests WHERE slot_id=$1 AND status='approved'",[s.id])).rows[0].n,1);
});

test('teacher completion requires elapsed confirmed session and cancellations retain history',async()=>{
 const s=await slot(ids.teacher,5),r=await request(s);
 await sql(ids.teacher,"SELECT decide_tutoring($1,'approve','https://example.test/session',NULL)",[r.id]);
 await db.query("UPDATE tutor_slots SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",[s.id]);
 await sql(ids.teacher,"SELECT decide_tutoring($1,'complete',NULL,'Session completed')",[r.id]);
 assert.equal((await db.query('SELECT status FROM tutoring_requests WHERE id=$1',[r.id])).rows[0].status,'completed');
 await assert.rejects(()=>sql(ids.student,"SELECT decide_tutoring($1,'cancel',NULL,NULL)",[r.id]),/future/);
});

test('certificate requires enrollment, all lessons, passed quizzes and graded assignments',async()=>{
 await assert.rejects(()=>sql(ids.student,'SELECT issue_course_certificate($1)',[ids.course]),/Complete all lessons/);
 await assert.rejects(()=>sql(ids.other,'SELECT issue_course_certificate($1)',[ids.course]),/Complete all lessons/);
 await assert.rejects(()=>sql(ids.student,'INSERT INTO certificates(user_id,course_id) VALUES($1,$2)',[ids.student,ids.course]),/permission denied/);
 await sql(ids.student,'INSERT INTO lesson_progress(user_id,lesson_id,completed) VALUES($1,$2,true)',[ids.student,ids.lesson]);
 await assert.rejects(()=>sql(ids.student,'SELECT issue_course_certificate($1)',[ids.course]),/Complete all lessons/);
 await sql(ids.student,'SELECT submit_quiz($1,$2)',[ids.quiz,JSON.stringify({[ids.question]:1})]);
 await assert.rejects(()=>sql(ids.student,'SELECT issue_course_certificate($1)',[ids.course]),/Complete all lessons/);
 const submission=(await sql(ids.student,"INSERT INTO submissions(assignment_id,student_id,submission_type,content) VALUES($1,$2,'url','https://example.test/answer') RETURNING id",[ids.assignment,ids.student])).rows[0].id;
 await sql(ids.teacher,"UPDATE submissions SET marks=90,status='graded',reviewed_at=now() WHERE id=$1",[submission]);
 const automatic=(await sql(ids.student,'SELECT * FROM certificates WHERE course_id=$1',[ids.course])).rows[0];assert.ok(automatic.validated_at);
 const first=(await sql(ids.student,'SELECT * FROM issue_course_certificate($1)',[ids.course])).rows[0];
 const second=(await sql(ids.student,'SELECT * FROM issue_course_certificate($1)',[ids.course])).rows[0];assert.equal(first.id,second.id);assert.equal(first.id,automatic.id);
 await sql(ids.student,"UPDATE profiles SET full_name='Changed later' WHERE user_id=$1",[ids.student]);
 assert.equal((await sql(ids.student,'SELECT * FROM issue_course_certificate($1)',[ids.course])).rows[0].student_name,'Test student');
});

test('public certificate verification omits recipient identity, revocation denies downloads',async()=>{
 const c=(await db.query('SELECT * FROM certificates WHERE course_id=$1',[ids.course])).rows[0];
 const v=(await sql(null,'SELECT verify_certificate($1) AS data',[c.verification_token])).rows[0].data;assert.equal(v.status,'valid');assert.equal('student_name' in v,false);assert.equal('user_id' in v,false);
 await assert.rejects(()=>sql(ids.other,'SELECT certificate_download_record($1)',[c.id]),/not found/);
 await assert.rejects(()=>sql(ids.student,"SELECT admin_revoke_certificate($1,'Self revoke')",[c.id]),/Administrator/);
 await sql(ids.admin,"SELECT admin_revoke_certificate($1,'Academic record corrected')",[c.id]);
 await assert.rejects(()=>sql(ids.student,'SELECT certificate_download_record($1)',[c.id]),/not found/);
 assert.equal((await sql(null,'SELECT verify_certificate($1) AS data',[c.verification_token])).rows[0].data.status,'revoked');
});

let ticket;
test('server-only support intake is bounded, idempotent and private for guests/other users',async()=>{
 const args=['00000000-0000-4000-9000-000000000001',ids.student,'Test student','student@example.test','courses','Need help','I need help with a course.', 'a'.repeat(64),'b'.repeat(64)];
 await assert.rejects(()=>sql(ids.student,'SELECT support_intake($1,$2,$3,$4,$5,$6,$7,$8,$9)',args),/permission denied/);
 await db.exec('SET ROLE service_role');try{ticket=(await db.query('SELECT support_intake($1,$2,$3,$4,$5,$6,$7,$8,$9) AS id',args)).rows[0].id;const duplicate=(await db.query('SELECT support_intake($1,$2,$3,$4,$5,$6,$7,$8,$9) AS id',args)).rows[0].id;assert.equal(ticket,duplicate);}finally{await db.exec('RESET ROLE');}
 assert.equal((await sql(ids.student,'SELECT id FROM support_tickets')).rows.length,1);assert.equal((await sql(ids.other,'SELECT id FROM support_tickets')).rows.length,0);
 await assert.rejects(()=>sql(null,'SELECT * FROM support_tickets'),/permission denied/);
 await assert.rejects(()=>sql(ids.student,"UPDATE support_tickets SET status='resolved'"),/permission denied/);
 await db.exec('SET ROLE service_role');try{
  for(let i=2;i<=3;i++)await db.query('SELECT support_intake($1,$2,$3,$4,$5,$6,$7,$8,$9)',[`00000000-0000-4000-9000-${String(i).padStart(12,'0')}`,...args.slice(1)]);
  await assert.rejects(()=>db.query('SELECT support_intake($1,$2,$3,$4,$5,$6,$7,$8,$9)',['00000000-0000-4000-9000-000000000004',...args.slice(1)]),/limit reached/);
 }finally{await db.exec('RESET ROLE');}
});

test('support lifecycle, private internal notes, reopening and audit trail are administrator only',async()=>{
 await assert.rejects(()=>sql(ids.teacher,"SELECT admin_support_action($1,'resolved','Do not allow')",[ticket]),/Administrator/);
 for(const state of ['in_progress','resolved','open'])await sql(ids.admin,'SELECT admin_support_action($1,$2,$3)',[ticket,state,'Private investigation note']);
 assert.equal((await sql(ids.student,'SELECT * FROM support_notes')).rows.length,0);
 assert.equal((await sql(ids.admin,'SELECT * FROM support_notes')).rows.length,3);
 assert.equal((await sql(ids.student,'SELECT status FROM support_tickets WHERE id=$1',[ticket])).rows[0].status,'open');
});

test('administration statistics and server pagination are accurate and independently authorized',async()=>{
 await assert.rejects(()=>sql(ids.student,'SELECT admin_overview()'),/Administrator/);
 await assert.rejects(()=>sql(ids.teacher,"SELECT admin_records('users')"),/Administrator/);
 const overview=(await sql(ids.admin,'SELECT admin_overview() AS data')).rows[0].data;assert.equal(overview.users,4);assert.equal(overview.open_support,3);assert.equal(overview.revoked_certificates,1);
 const page=(await sql(ids.admin,"SELECT admin_records('users','','',0,2) AS data")).rows[0].data;assert.equal(page.total,4);assert.equal(page.rows.length,2);
 const empty=(await sql(ids.admin,"SELECT admin_records('users','no-such-person','',0,10) AS data")).rows[0].data;assert.equal(empty.rows.length,0);
 for(const kind of ['courses','tutoring','certificates','support','audit','community'])assert.ok((await sql(ids.admin,'SELECT admin_records($1) AS data',[kind])).rows[0].data.rows);
 await assert.rejects(()=>sql(ids.admin,"SELECT admin_records('auth.users')"),/Unknown/);
 await assert.rejects(()=>sql(ids.admin,"SELECT admin_records('users','','',0,1000)"),/pagination/);
});

test('removed courses cannot issue certificates and historical certificate metadata survives deletion',async()=>{
 const course='10000000-0000-4000-9000-000000000001',module='20000000-0000-4000-9000-000000000001',lesson='30000000-0000-4000-9000-000000000001';
 await db.query("INSERT INTO courses(id,teacher_id,title,is_published,review_status) VALUES($1,$2,'Disposable certificate course',true,'approved')",[course,ids.teacher]);
 await db.query("INSERT INTO modules(id,course_id,title) VALUES($1,$2,'Only module')",[module,course]);
 await db.query("INSERT INTO lessons(id,module_id,title,type) VALUES($1,$2,'Only lesson','article')",[lesson,module]);
 await sql(ids.student,'INSERT INTO enrollments(user_id,course_id) VALUES($1,$2)',[ids.student,course]);
 await sql(ids.student,'INSERT INTO lesson_progress(user_id,lesson_id,completed) VALUES($1,$2,true)',[ids.student,lesson]);
 const c=(await sql(ids.student,'SELECT * FROM issue_course_certificate($1)',[course])).rows[0];
 await assert.rejects(()=>sql(ids.teacher,'SELECT admin_content_action($1,$2,$3,$4)',[course,'course','delete','Not an administrator']),/Administrator/);
 await sql(ids.admin,'SELECT admin_content_action($1,$2,$3,$4)',[course,'course','delete','Remove disposable acceptance course']);
 assert.equal((await db.query('SELECT course_title FROM certificates WHERE id=$1',[c.id])).rows[0].course_title,'Disposable certificate course');
 assert.equal((await sql(null,'SELECT verify_certificate($1) AS data',[c.verification_token])).rows[0].data.status,'course_removed');
 await assert.rejects(()=>sql(ids.student,'SELECT issue_course_certificate($1)',[course]),/Complete all lessons/);
 await assert.rejects(()=>sql(ids.student,'SELECT certificate_download_record($1)',[c.id]),/not found/);
});

test('cancelled availability retains private participant history without advertising revoked teachers',async()=>{
 const s=await slot(ids.other,6),r=await request(s);
 await sql(ids.other,'SELECT cancel_tutor_slot($1)',[s.id]);
 assert.equal((await sql(ids.student,'SELECT id FROM tutor_slots WHERE id=$1',[s.id])).rows.length,1);
 assert.equal((await sql(null,'SELECT id FROM tutor_slots WHERE id=$1',[s.id])).rows.length,0);
 assert.equal((await sql(ids.student,'SELECT status FROM tutoring_requests WHERE id=$1',[r.id])).rows[0].status,'rejected');
});
