import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

// PostgreSQL engine in WASM. Auth/Storage schemas are small test shims, not GoTrue,
// PostgREST, Realtime, a storage server, or evidence about a deployed Supabase project.
export const databaseBootstrapSQL = `
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA realtime;
    CREATE TABLE realtime.messages(id bigserial PRIMARY KEY, topic text, extension text, event text, payload jsonb);
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic',true) $$;
    CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) RETURNS void LANGUAGE sql AS $$
      INSERT INTO realtime.messages(topic,extension,event,payload) VALUES($3,'broadcast',$2,$1) $$;
    GRANT USAGE ON SCHEMA realtime TO authenticated, anon;
    GRANT SELECT ON realtime.messages TO authenticated;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean DEFAULT false,
      file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text,
      name text, owner uuid, owner_id text, metadata jsonb DEFAULT '{}');
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      SELECT (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'),1)-1] $$;
    CREATE PUBLICATION supabase_realtime;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
    GRANT SELECT ON storage.objects TO anon;
`;

export async function createDatabase({ hardening = true, phase3 = true } = {}) {
  const db = new PGlite();
  await db.exec(databaseBootstrapSQL);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    // Historical migration only installs two hosted extensions unavailable in WASM.
    if (file.startsWith('20260308214544')) continue;
    if (!hardening && file.startsWith('20261026')) continue;
    if ((!hardening || !phase3) && file.startsWith('20261027')) continue;
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  if (!hardening) await db.exec(await readFile('drizzle/migrations/0000_create_teacher_requests.sql', 'utf8'));
  return db;
}

export const ids = {
  student: '00000000-0000-4000-8000-000000000001',
  teacher: '00000000-0000-4000-8000-000000000002',
  other: '00000000-0000-4000-8000-000000000003',
  admin: '00000000-0000-4000-8000-000000000004',
  course: '10000000-0000-4000-8000-000000000001',
  draft: '10000000-0000-4000-8000-000000000002',
  module: '20000000-0000-4000-8000-000000000001',
  lesson: '30000000-0000-4000-8000-000000000001',
  quiz: '40000000-0000-4000-8000-000000000001',
  question: '50000000-0000-4000-8000-000000000001',
  assignment: '60000000-0000-4000-8000-000000000001',
};
export async function seed(db) {
  for (const name of ['student','teacher','other','admin']) {
    await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3)`,
      [ids[name], `${name}@example.test`, JSON.stringify({full_name: `Test ${name}`})]);
  }
  await db.exec(`
    INSERT INTO user_roles(user_id, role) VALUES ('${ids.teacher}','teacher'), ('${ids.other}','teacher'), ('${ids.admin}','admin');
    INSERT INTO courses(id,teacher_id,title,is_published) VALUES
      ('${ids.course}','${ids.teacher}','Test Course',true), ('${ids.draft}','${ids.teacher}','Private Draft',false);
    INSERT INTO modules(id,course_id,title) VALUES ('${ids.module}','${ids.course}','Introduction');
    INSERT INTO lessons(id,module_id,title,type,content) VALUES ('${ids.lesson}','${ids.module}','Read me','article','Private lesson');
    INSERT INTO enrollments(user_id,course_id) VALUES ('${ids.student}','${ids.course}');
    INSERT INTO quizzes(id,course_id,title) VALUES ('${ids.quiz}','${ids.course}','Basics');
    INSERT INTO quiz_questions(id,quiz_id,question,options,correct_answer) VALUES
      ('${ids.question}','${ids.quiz}','2 + 2?','["3","4"]',1);
    INSERT INTO assignments(id,course_id,teacher_id,title) VALUES ('${ids.assignment}','${ids.course}','${ids.teacher}','Exercise');
  `);
}
export async function asUser(db, user, sql, params = []) {
  await db.exec(`SET ROLE ${user ? 'authenticated' : 'anon'}`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [user || '']);
  try { return await db.query(sql, params); }
  finally { await db.exec('RESET ROLE'); }
}
