import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, seed, ids, asUser } from './database.mjs';
let db;
before(async()=>{db=await createDatabase();await seed(db);});
after(async()=>{await db?.close();});
const sql=(user,query,params=[])=>asUser(db,user,query,params);

test('signup assigns student and persists teacher request without a session',async()=>{
 const id='00000000-0000-4000-8000-000000000010';
 await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,'new@example.test','{"full_name":"New teacher","wants_teacher":true}')`,[id]);
 assert.deepEqual((await sql(id,'SELECT role FROM user_roles')).rows,[{role:'student'}]);
 assert.equal((await sql(id,'SELECT status FROM teacher_requests')).rows[0].status,'pending');
 await assert.rejects(()=>sql(id,`INSERT INTO user_roles(user_id,role) VALUES ($1,'admin')`,[id]),/permission denied/);
 const req=(await sql(id,'SELECT id FROM teacher_requests')).rows[0].id;
 await assert.rejects(()=>sql(id,`SELECT review_teacher_request($1,true)`,[req]),/Administrator/);
 await sql(ids.admin,`SELECT review_teacher_request($1,true)`,[req]);
 assert.ok((await sql(id,'SELECT role FROM user_roles')).rows.some(r=>r.role==='teacher'));
});
test('anonymous and unenrolled users cannot read private lessons',async()=>{
 assert.equal((await sql(null,'SELECT content FROM lessons')).rows.length,0);
 assert.equal((await sql(ids.other,'SELECT content FROM lessons')).rows.length,0);
 assert.equal((await sql(ids.student,'SELECT content FROM lessons')).rows[0].content,'Private lesson');
});
test('draft courses cannot be enrolled in and enrollment is unique',async()=>{
 await assert.rejects(()=>sql(ids.student,'INSERT INTO enrollments(user_id,course_id) VALUES($1,$2)',[ids.student,ids.draft]),/row-level security/);
 await assert.rejects(()=>sql(ids.student,'INSERT INTO enrollments(user_id,course_id) VALUES($1,$2)',[ids.student,ids.course]),/unique constraint/);
});
test('another teacher cannot modify a course or its lessons',async()=>{
 assert.equal((await sql(ids.other,"UPDATE courses SET title='hijacked' WHERE id=$1 RETURNING id",[ids.course])).rows.length,0);
 assert.equal((await sql(ids.other,"UPDATE lessons SET content='hijacked' WHERE id=$1 RETURNING id",[ids.lesson])).rows.length,0);
});
test('answer keys are hidden on REST columns and student quiz RPC',async()=>{
 await assert.rejects(()=>sql(null,'SELECT correct_answer FROM quiz_questions'),/permission denied/);
 await assert.rejects(()=>sql(ids.student,'SELECT correct_answer FROM quiz_questions'),/permission denied/);
 const r=(await sql(ids.student,'SELECT read_quiz_questions($1) AS questions',[ids.quiz])).rows[0].questions;
 assert.equal(r[0].correct_answer,undefined);
 assert.equal((await sql(ids.teacher,'SELECT read_quiz_questions($1) AS questions',[ids.quiz])).rows[0].questions[0].correct_answer,1);
 await assert.rejects(()=>sql(ids.other,'SELECT read_quiz_questions($1)',[ids.quiz]),/Course access/);
});
test('forged quiz scores fail; server grades correct and incorrect answers',async()=>{
 await assert.rejects(()=>sql(ids.student,'INSERT INTO quiz_attempts(quiz_id,user_id,score,total_points,passed) VALUES($1,$2,999,1,true)',[ids.quiz,ids.student]),/permission denied/);
 for(const [answer,score,passed] of [[0,0,false],[1,1,true]]) {
 const row=(await sql(ids.student,'SELECT * FROM submit_quiz($1,$2)',[ids.quiz,JSON.stringify({[ids.question]:answer})])).rows[0];
 assert.equal(row.score,score);assert.equal(row.passed,passed);assert.equal(row.user_id,ids.student);
 }
});
test('quiz rejects missing, unknown and invalid answers and unauthorized attempts',async()=>{
 await assert.rejects(()=>sql(ids.student,'SELECT submit_quiz($1,$2)',[ids.quiz,null]),/Answers must/);
 for(const answers of [{},{unknown:0},{[ids.question]:4},{[ids.question]:'1'}]) await assert.rejects(()=>sql(ids.student,'SELECT submit_quiz($1,$2)',[ids.quiz,JSON.stringify(answers)]),/valid option/);
 await assert.rejects(()=>sql(ids.other,'SELECT submit_quiz($1,$2)',[ids.quiz,JSON.stringify({[ids.question]:1})]),/Course access/);
});
test('students cannot submit or update grades; owner grading creates one notification',async()=>{
 await assert.rejects(()=>sql(ids.student,"INSERT INTO submissions(assignment_id,student_id,submission_type,content,marks,status) VALUES($1,$2,'url','https://example.test',100,'graded')",[ids.assignment,ids.student]),/cannot grade/);
 const id=(await sql(ids.student,"INSERT INTO submissions(assignment_id,student_id,submission_type,content) VALUES($1,$2,'url','https://example.test') RETURNING id",[ids.assignment,ids.student])).rows[0].id;
 await assert.rejects(()=>sql(ids.student,"UPDATE submissions SET marks=100,status='graded' WHERE id=$1",[id]),/Only the course owner/);
 await assert.rejects(()=>sql(ids.teacher,"UPDATE submissions SET marks=101,status='graded' WHERE id=$1",[id]),/outside assignment range/);
 assert.equal((await sql(ids.other,"UPDATE submissions SET marks=90,status='graded' WHERE id=$1 RETURNING id",[id])).rows.length,0);
 await sql(ids.teacher,"UPDATE submissions SET marks=90,status='graded',feedback='Good work' WHERE id=$1",[id]);
 assert.equal((await sql(ids.student,"SELECT marks FROM submissions WHERE id=$1",[id])).rows[0].marks,90);
 assert.equal((await sql(ids.student,"SELECT count(*)::int n FROM notifications WHERE type='grade'")).rows[0].n,1);
});
test('teacher can view enrolled progress; other teachers cannot',async()=>{
 await sql(ids.student,'INSERT INTO lesson_progress(user_id,lesson_id,completed) VALUES($1,$2,true)',[ids.student,ids.lesson]);
 assert.equal((await sql(ids.teacher,'SELECT lesson_id FROM lesson_progress')).rows.length,1);
 assert.equal((await sql(ids.other,'SELECT lesson_id FROM lesson_progress')).rows.length,0);
 await assert.rejects(()=>sql(ids.other,'INSERT INTO lesson_progress(user_id,lesson_id,completed) VALUES($1,$2,true)',[ids.other,ids.lesson]),/row-level security/);
});
test('certificate claims require all lessons, assessment results and enrollment',async()=>{
 await assert.rejects(()=>sql(ids.other,'SELECT issue_course_certificate($1)',[ids.course]),/Complete all lessons/);
 await sql(ids.student,'DELETE FROM lesson_progress WHERE user_id=$1',[ids.student]);
 await assert.rejects(()=>sql(ids.student,'SELECT issue_course_certificate($1)',[ids.course]),/Complete all lessons/);
 await sql(ids.student,'INSERT INTO lesson_progress(user_id,lesson_id,completed) VALUES($1,$2,true)',[ids.student,ids.lesson]);
 await sql(ids.student,'SELECT issue_course_certificate($1)',[ids.course]);
 assert.equal((await sql(ids.student,'SELECT id FROM certificates')).rows.length,1);
});
test('lesson files are private, enrolled reads work, cross-owner upload/delete fail',async()=>{
 assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='lesson-files'")).rows[0].public,false);
 const path=`${ids.course}/document.pdf`;
 await sql(ids.teacher,"INSERT INTO storage.objects(bucket_id,name) VALUES('lesson-files',$1)",[path]);
 assert.equal((await sql(null,"SELECT name FROM storage.objects WHERE bucket_id='lesson-files'")).rows.length,0);
 assert.equal((await sql(ids.student,"SELECT name FROM storage.objects WHERE bucket_id='lesson-files'")).rows.length,1);
 assert.equal((await sql(ids.other,"DELETE FROM storage.objects WHERE name=$1 RETURNING id",[path])).rows.length,0);
 await assert.rejects(()=>sql(ids.other,"INSERT INTO storage.objects(bucket_id,name) VALUES('lesson-files',$1)",[`${ids.course}/evil.pdf`]),/row-level security/);
});
test('private assignment files are visible only to student and owner',async()=>{
 const path=`${ids.student}/${ids.assignment}/answer.pdf`;
 await sql(ids.student,"INSERT INTO storage.objects(bucket_id,name) VALUES('submissions',$1)",[path]);
 assert.equal((await sql(ids.teacher,"SELECT name FROM storage.objects WHERE bucket_id='submissions'")).rows.length,1);
 assert.equal((await sql(ids.other,"SELECT name FROM storage.objects WHERE bucket_id='submissions'")).rows.length,0);
});
test('self-demotion and final administrator removal fail on DELETE and UPDATE',async()=>{
 await assert.rejects(()=>sql(ids.admin,"DELETE FROM user_roles WHERE role='admin'"),/permission denied/);
 await assert.rejects(()=>sql(ids.admin,"SELECT admin_set_role($1,'admin',false,'Cannot demote self')",[ids.admin]),/own admin/);
 await assert.rejects(()=>sql(ids.admin,"UPDATE user_roles SET role='student' WHERE role='admin' RETURNING id"),/permission denied/);
 await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
 await assert.rejects(()=>db.exec("DELETE FROM user_roles WHERE role='admin'"),/At least one admin/);
});
test('live class metadata is scoped to participants',async()=>{
 await sql(ids.teacher,"INSERT INTO live_classes(course_id,teacher_id,title,room_name,scheduled_at) VALUES($1,$2,'Test','private-room',now())",[ids.course,ids.teacher]);
 assert.equal((await sql(ids.student,'SELECT room_name FROM live_classes')).rows.length,1);
 assert.equal((await sql(ids.other,'SELECT room_name FROM live_classes')).rows.length,0);
 assert.equal((await sql(null,'SELECT room_name FROM live_classes')).rows.length,0);
});
test('tutoring approval is teacher-only and private, with a single reservation',async()=>{
 const slot=(await sql(ids.teacher,"SELECT id FROM save_tutor_slot(NULL,'Programming',now()+interval '2 days',60,'UTC',1)")).rows[0].id;
 const req=(await sql(ids.student,"SELECT id FROM request_tutoring($1,'Help with loops')",[slot])).rows[0].id;
 const req2=(await sql(ids.other,"SELECT id FROM request_tutoring($1,'Another request')",[slot])).rows[0].id;
 await assert.rejects(()=>sql(ids.student,"SELECT decide_tutoring($1,'approve','https://example.test/meeting',NULL)",[req]),/Only the teacher/);
 assert.equal((await sql(ids.other,'SELECT id FROM tutoring_requests WHERE id=$1',[req])).rows.length,0);
 await sql(ids.teacher,"SELECT decide_tutoring($1,'approve','https://example.test/meeting',NULL)",[req]);
 assert.equal((await sql(ids.student,'SELECT meeting_url FROM tutoring_requests WHERE id=$1',[req])).rows[0].meeting_url,'https://example.test/meeting');
 assert.equal((await sql(ids.other,'SELECT meeting_url FROM tutoring_requests WHERE id=$1',[req])).rows.length,0);
 await assert.rejects(()=>sql(ids.teacher,"SELECT decide_tutoring($1,'approve','https://example.test/meeting',NULL)",[req2]),/pending booking/);
});
test('private signaling rejects outsiders and impersonation, stamps authenticated identity',async()=>{
 await assert.rejects(()=>sql(ids.other,"SELECT send_live_signal('private-room','join-request','{}')"),/Course access/);
 await assert.rejects(()=>sql(ids.student,"SELECT send_live_signal('private-room','teacher-ended','{}')"),/Only the teacher/);
 await sql(ids.student,"SELECT send_live_signal('private-room','chat-message','{\"message\":\"Hello\",\"fromId\":\"spoof\"}')");
 const row=(await db.query("SELECT payload FROM realtime.messages WHERE event='chat-message' ORDER BY id DESC LIMIT 1")).rows[0];
 assert.equal(row.payload.fromId,ids.student);
 await db.query("SELECT set_config('realtime.topic','live-private-room',false)");
 assert.equal((await sql(ids.student,'SELECT id FROM realtime.messages')).rows.length,1);
 assert.equal((await sql(ids.other,'SELECT id FROM realtime.messages')).rows.length,0);
 await assert.rejects(()=>sql(ids.student,"INSERT INTO realtime.messages(topic,extension,event,payload) VALUES('live-private-room','broadcast','teacher-ended','{}')"),/permission denied/);
});
test('paid enrollment is blocked until gateway-backed entitlements exist',async()=>{
 const course='10000000-0000-4000-8000-000000000099';
 await db.query("INSERT INTO courses(id,teacher_id,title,is_published,price_bdt) VALUES($1,$2,'Paid course',true,1000)",[course,ids.teacher]);
 await assert.rejects(()=>sql(ids.student,'INSERT INTO enrollments(user_id,course_id) VALUES($1,$2)',[ids.student,course]),/row-level security/);
});
test('public leaderboard exposes aggregate counts while raw progress remains private',async()=>{
 const result=(await sql(null,'SELECT * FROM get_leaderboard()')).rows;
 assert.equal(result.find(r=>r.user_id===ids.student).lessonsCompleted,1);
 await assert.rejects(()=>sql(null,'SELECT * FROM lesson_progress'),/permission denied/);
});
test('notification and badge forgery are rejected',async()=>{
 await assert.rejects(()=>sql(ids.student,"INSERT INTO notifications(user_id,title,type) VALUES($1,'Fake','grade')",[ids.other]),/permission denied/);
 const badge=(await db.query("SELECT id FROM badges WHERE criteria_type='lessons_completed' AND criteria_value=50")).rows[0].id;
 await assert.rejects(()=>sql(ids.student,'INSERT INTO user_badges(user_id,badge_id) VALUES($1,$2)',[ids.student,badge]),/criteria not met/);
});
test('lesson bookmarks are owned and require course access',async()=>{
 await sql(ids.student,'INSERT INTO lesson_bookmarks(user_id,lesson_id) VALUES($1,$2)',[ids.student,ids.lesson]);
 assert.equal((await sql(ids.student,'SELECT id FROM lesson_bookmarks')).rows.length,1);
 assert.equal((await sql(ids.other,'SELECT id FROM lesson_bookmarks')).rows.length,0);
 await assert.rejects(()=>sql(ids.other,'INSERT INTO lesson_bookmarks(user_id,lesson_id) VALUES($1,$2)',[ids.other,ids.lesson]),/row-level security/);
});
test('thumbnail upserts work for course owners, student writes fail',async()=>{
 const path=`${ids.course}/thumbnail.png`;
 await sql(ids.teacher,"INSERT INTO storage.objects(bucket_id,name) VALUES('course-thumbnails',$1)",[path]);
 assert.equal((await sql(ids.teacher,"UPDATE storage.objects SET metadata='{\"size\":100}' WHERE bucket_id='course-thumbnails' AND name=$1 RETURNING id",[path])).rows.length,1);
 assert.equal((await sql(ids.student,"DELETE FROM storage.objects WHERE bucket_id='course-thumbnails' RETURNING id")).rows.length,0);
});
test('future live classes do not expire based on creation time',async()=>{
 await db.exec("INSERT INTO live_classes(course_id,teacher_id,title,room_name,scheduled_at,created_at) VALUES('"+ids.course+"','"+ids.teacher+"','Future','future-room',now()+interval '2 days',now()-interval '3 days')");
 await db.exec('SELECT expire_old_live_classes()');assert.equal((await db.query("SELECT status FROM live_classes WHERE room_name='future-room'")).rows[0].status,'scheduled');
});
test('assignment and live ownership cannot be moved to another teacher course',async()=>{
 const c='10000000-0000-4000-8000-000000000088';await db.query("INSERT INTO courses(id,teacher_id,title,is_published) VALUES($1,$2,'Other course',true)",[c,ids.other]);
 await assert.rejects(()=>sql(ids.teacher,'UPDATE assignments SET course_id=$1 WHERE id=$2',[c,ids.assignment]),/ownership must match/);
 await assert.rejects(()=>sql(ids.teacher,"UPDATE live_classes SET course_id=$1 WHERE room_name='private-room'",[c]),/ownership must match/);
});
test('new students cannot pin community posts',async()=>{
 await assert.rejects(()=>sql(ids.student,"INSERT INTO community_posts(user_id,title,content,category,is_pinned) VALUES($1,'Spam','Spam','general',true)",[ids.student]),/Staff access/);
});
test('cross-course discussion parents are rejected',async()=>{
 const c='10000000-0000-4000-8000-000000000077';await db.query("INSERT INTO courses(id,teacher_id,title,is_published) VALUES($1,$2,'Second course',true)",[c,ids.teacher]);
 const p=(await sql(ids.teacher,"INSERT INTO course_discussions(course_id,user_id,content) VALUES($1,$2,'Private question') RETURNING id",[c,ids.teacher])).rows[0].id;
 await assert.rejects(()=>sql(ids.student,"INSERT INTO course_discussions(course_id,user_id,parent_id,content) VALUES($1,$2,$3,'Wrong course reply')",[ids.course,ids.student,p]),/same course/);
});
