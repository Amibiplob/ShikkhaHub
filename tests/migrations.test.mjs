import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createDatabase, seed, ids, asUser } from './database.mjs';

const october = (await readdir('supabase/migrations')).filter(f => f.startsWith('20261026')).sort();
async function apply(db, file) {
  // Rehearse one transaction per migration, including fail-closed recovery.
  await db.exec('BEGIN');
  try { await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8')); await db.exec('COMMIT'); }
  catch (error) { await db.exec('ROLLBACK'); throw error; }
}

test('read-only staging preflight reports malformed legacy JSON without evaluating array operations on objects', async () => {
  const db = await createDatabase({ hardening: false });
  try {
    await seed(db);
    await db.query("UPDATE quiz_questions SET options='{}' WHERE id=$1", [ids.question]);
    const results = await db.exec(await readFile('tests/staging-preflight.sql', 'utf8'));
    const checks = results.flatMap(result => result.rows || []);
    assert.equal(checks.find(row => row.check_name === 'invalid quiz questions').blockers, 1);
    assert.equal((await db.query('SELECT options FROM quiz_questions')).rows[0].options.constructor, Object);
  } finally { await db.close(); }
});

test('seven migrations adopt legacy teacher requests and preserve academic records', async () => {
  const db = await createDatabase({ hardening: false });
  try {
    await seed(db);
    await db.query('INSERT INTO teacher_requests(user_id,full_name,email) VALUES($1,$2,$3)', [ids.student, 'Preserved request', 'student@example.test']);
    await db.query("INSERT INTO submissions(assignment_id,student_id,submission_type,content,status,marks) VALUES($1,$2,'url','https://example.test/legacy','reviewed',80)", [ids.assignment, ids.student]);
    for (const file of october) await apply(db, file);
    assert.equal(october.length, 7);
    assert.equal((await db.query('SELECT full_name FROM teacher_requests')).rows[0].full_name, 'Preserved request');
    assert.equal((await db.query('SELECT status,marks FROM submissions')).rows[0].status, 'reviewed');
    assert.equal((await db.query('SELECT marks FROM submissions')).rows[0].marks, 80);
    await assert.rejects(() => asUser(db, ids.admin, "UPDATE teacher_requests SET status='approved' RETURNING id"), /permission denied/);
    const constraints = await db.query("SELECT conname FROM pg_constraint WHERE conname IN ('quiz_question_valid','quiz_pass_valid','submissions_student_id_fkey','course_reviews_user_id_fkey') AND NOT convalidated");
    assert.equal(constraints.rows.length, 4);
    for (const [table, constraint] of [['quiz_questions','quiz_question_valid'],['quizzes','quiz_pass_valid'],['submissions','submissions_student_id_fkey'],['course_reviews','course_reviews_user_id_fkey']]) {
      await db.exec(`ALTER TABLE public.${table} VALIDATE CONSTRAINT ${constraint}`);
    }
    const policies = await db.query("SELECT count(*)::int AS count FROM pg_policies WHERE tablename='teacher_requests' AND cmd='UPDATE'");
    assert.equal(policies.rows[0].count, 0);
  } finally { await db.close(); }
});

test('duplicate legacy submissions abort migration atomically without deleting work', async () => {
  const db = await createDatabase({ hardening: false });
  try {
    await seed(db);
    for (let i = 0; i < 2; i++) await db.query("INSERT INTO submissions(assignment_id,student_id,submission_type,content) VALUES($1,$2,'url','https://example.test/legacy')", [ids.assignment, ids.student]);
    await assert.rejects(() => apply(db, october[0]), /unique index|duplicate key/);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM submissions')).rows[0].count, 2);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name='lessons' AND column_name='is_free_preview'")).rows[0].count, 0);
    assert.equal((await db.query("SELECT to_regprocedure('public.submit_quiz(uuid,jsonb)') AS proc")).rows[0].proc, null);
  } finally { await db.close(); }
});

test('NOT VALID preserves malformed legacy questions until explicit repair and validation', async () => {
  const db = await createDatabase({ hardening: false });
  try {
    await seed(db);
    await db.query("UPDATE quiz_questions SET options='{}' WHERE id=$1", [ids.question]);
    await apply(db, october[0]);
    await assert.rejects(() => db.exec('ALTER TABLE quiz_questions VALIDATE CONSTRAINT quiz_question_valid'), /violated|non-array/);
    await db.query("UPDATE quiz_questions SET options='[\"3\",\"4\"]' WHERE id=$1", [ids.question]);
    await db.exec('ALTER TABLE quiz_questions VALIDATE CONSTRAINT quiz_question_valid');
    await assert.rejects(() => db.query("UPDATE quiz_questions SET points=0 WHERE id=$1", [ids.question]), /check constraint/);
  } finally { await db.close(); }
});

test('unexpected permissive Realtime policies survive and must block staging acceptance', async () => {
  const db = await createDatabase({ hardening: false });
  try {
    await db.exec('CREATE POLICY unexpected_broad_receive ON realtime.messages FOR SELECT TO authenticated USING (true)');
    for (const file of october) await apply(db, file);
    const policies = await db.query("SELECT policyname FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' ORDER BY policyname");
    assert.equal(policies.rows.length, 2);
    await db.exec("INSERT INTO realtime.messages(topic,extension) VALUES ('live-outsider','broadcast')");
    const result = await asUser(db, ids.student, 'SELECT topic FROM realtime.messages');
    assert.equal(result.rows.length, 1, 'Demonstrates OR-policy conflict; migrations do not silently delete external policies.');
  } finally { await db.close(); }
});

test('reapplying a recorded migration fails transactionally rather than masking drift', async () => {
  const db = await createDatabase({ phase3: false });
  try {
    await assert.rejects(() => apply(db, october[0]), /already exists/);
    assert.equal((await db.query("SELECT to_regprocedure('public.submit_quiz(uuid,jsonb)') IS NOT NULL AS exists")).rows[0].exists, true);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM pg_policies WHERE tablename='teacher_requests'")).rows[0].count, 2);
  } finally { await db.close(); }
});

test('Phase 3 certificate-number collision aborts the new migration without deleting legacy certificates',async()=>{
 const db=await createDatabase({phase3:false});
 try{
  await seed(db);
  for(const user of [ids.student,ids.other])await db.query("INSERT INTO certificates(user_id,course_id,certificate_number) VALUES($1,$2,'LEGACY-DUPLICATE')",[user,ids.course]);
  const phase3=(await readdir('supabase/migrations')).filter(f=>f.startsWith('20261027')).sort();
  await apply(db,phase3[0]);await apply(db,phase3[1]);
  await assert.rejects(()=>apply(db,phase3[2]),/unique index|duplicate key/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM certificates')).rows[0].n,2);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='certificates' AND column_name='verification_token'")).rows[0].n,0);
  const fk=(await db.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='certificates_course_id_fkey'")).rows[0].definition;
  assert.match(fk,/CASCADE/);
 }finally{await db.close();}
});
