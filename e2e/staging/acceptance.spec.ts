import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { stagingSettings } from './settings';

const settings = stagingSettings();
type Role = 'student' | 'teacher' | 'admin';
const clients = {} as Record<Role, SupabaseClient<Database>>;
const uid = {} as Record<Role, string>;
const run = `staging-acceptance-${randomUUID()}`;
const course = randomUUID(), draft = randomUUID(), moduleId = randomUUID(), lesson = randomUUID();
const quiz = randomUUID(), question = randomUUID(), assignment = randomUUID(), live = randomUUID();
const room = `acceptance-${randomUUID()}`;
const object = `${course}/${run}.txt`;
const created: string[] = [];
let uploaded = false;
function ok(error: unknown) {
  // Do not serialize response objects, sessions, keys or passwords in reports.
  const code = error && typeof error === 'object' && 'code' in error ? error.code : 'service-error';
  expect(error ? { code } : null).toBeNull();
}
async function login(page: Page, role: Role) {
  await page.goto('/auth');
  // locator.fill can echo its argument in failure call logs. Keep credentials out
  // of those logs while still using the real form and React input events.
  for (const [label, value] of [['Email', settings!.identities[role].email],
    ['Password', settings!.identities[role].password]] as const) {
    const input = page.getByLabel(label, { exact: true });
    await input.waitFor({ state: 'visible' });
    await input.evaluate((element, credential) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(element, credential);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
}

test.describe('REAL Supabase staging acceptance (external opt-in)', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!settings, 'BLOCKED: no approved disposable staging target and external role credentials.');
  test.beforeAll(async () => {
    for (const role of ['student', 'teacher', 'admin'] as const) {
      const client = createClient<Database>(settings!.url, settings!.key, { auth: { persistSession: false, autoRefreshToken: false } });
      clients[role] = client;
      const { data, error } = await client.auth.signInWithPassword(settings!.identities[role]);
      ok(error); expect(data.user).not.toBeNull(); uid[role] = data.user!.id;
      const roles = await client.from('user_roles').select('role').eq('user_id', uid[role]);
      ok(roles.error); expect(roles.data?.map(row => row.role)).toContain(role);
      if (role !== 'admin') expect(roles.data?.map(row => row.role)).not.toContain('admin');
      if (role === 'student') expect(roles.data?.map(row => row.role)).not.toContain('teacher');
    }
    expect(new Set(Object.values(uid)).size).toBe(3);
    await mkdir('artifacts/staging', { recursive: true, mode: 0o700 });
    // Persist exact cleanup IDs before the first write; no account credentials.
    await writeFile(`artifacts/staging/${run}.json`, JSON.stringify({ run, course, draft, moduleId, lesson, quiz, question, assignment, live, room, object, uid }, null, 2), { mode: 0o600 });
    for (const [id, published] of [[course, true], [draft, false]] as const) {
      ok((await clients.teacher.from('courses').insert({ id, teacher_id: uid.teacher, title: run, is_published: published, price_bdt: 0 })).error);
      created.push(id);
    }
    ok((await clients.teacher.from('modules').insert({ id: moduleId, course_id: course, title: 'Acceptance module' })).error);
    ok((await clients.teacher.from('lessons').insert({ id: lesson, module_id: moduleId, title: 'Acceptance lesson', type: 'article', content: '# Staging acceptance lesson' })).error);
    ok((await clients.teacher.from('quizzes').insert({ id: quiz, course_id: course, title: 'Acceptance quiz' })).error);
    ok((await clients.teacher.from('quiz_questions').insert({ id: question, quiz_id: quiz, question: '2 + 2?', options: ['3', '4'], correct_answer: 1 })).error);
    ok((await clients.teacher.from('assignments').insert({ id: assignment, course_id: course, teacher_id: uid.teacher, title: 'Acceptance assignment', max_marks: 100 })).error);
    if (settings!.realtime) ok((await clients.teacher.from('live_classes').insert({ id: live, course_id: course, teacher_id: uid.teacher,
      title: run, room_name: room, scheduled_at: new Date(Date.now() + 3600000).toISOString() })).error);
  });
  test.afterAll(async () => {
    const failures: string[] = [];
    if (uploaded && (await clients.teacher.storage.from('lesson-files').remove([object])).error) failures.push('owned object cleanup');
    for (const id of created) {
      const result = await clients.teacher.from('courses').delete().eq('id', id).eq('teacher_id', uid.teacher).eq('title', run).select('id');
      if (result.error || result.data?.length !== 1) failures.push('owned course cleanup');
    }
    for (const client of Object.values(clients)) { await client.removeAllChannels(); await client.auth.signOut(); }
    expect(failures, 'Inspect the exact-ID cleanup manifest; notification cleanup is an operator step.').toEqual([]);
  });

  for (const role of ['student', 'teacher', 'admin'] as const) test(`${role}: real login, reload, role boundary and logout`, async ({ page }) => {
    await login(page, role); await page.reload();
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: role === 'admin' ? 'Admin Panel' : "You don't have access to this page" })).toBeVisible();
    await page.goto('/dashboard'); await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: /Sign Out/i }).click();
    await page.goto('/dashboard'); await expect(page).toHaveURL(/\/auth/);
  });

  test('unenrolled content and draft access are denied', async () => {
    const lessons = await clients.student.from('lessons').select('id,content').eq('id', lesson); ok(lessons.error); expect(lessons.data).toEqual([]);
    const drafts = await clients.student.from('courses').select('id').eq('id', draft); ok(drafts.error); expect(drafts.data).toEqual([]);
    expect((await clients.student.from('enrollments').insert({ course_id: draft, user_id: uid.student })).error).not.toBeNull();
  });
  test('teacher edits owned course through the actual UI', async ({ page }) => {
    await login(page, 'teacher'); await page.goto(`/courses/${course}`);
    await page.getByRole('button', { name: 'Edit course information' }).click();
    await page.getByLabel('Course description', { exact: true }).fill('Disposable staging acceptance');
    await page.getByRole('button', { name: 'Save course information' }).click();
    await expect(page.getByText('Course updated', { exact: true })).toBeVisible();
    const row = await clients.teacher.from('courses').select('description').eq('id', course).single(); ok(row.error);
    expect(row.data?.description).toBe('Disposable staging acceptance');
  });
  test('student enrollment and progress persist in PostgreSQL after reload', async ({ page }) => {
    await login(page, 'student'); await page.goto(`/courses/${course}`);
    await page.getByRole('button', { name: 'Enroll Now', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Staging acceptance lesson' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark Complete', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();
    const row = await clients.student.from('lesson_progress').select('completed').eq('lesson_id', lesson).eq('user_id', uid.student).single(); ok(row.error); expect(row.data?.completed).toBe(true);
  });
  test('quiz answer keys stay private, forged scores fail and UI result is server stored', async ({ page }) => {
    expect((await clients.student.from('quiz_questions').select('correct_answer').eq('quiz_id', quiz)).error).not.toBeNull();
    expect((await clients.student.from('quiz_attempts').insert({ quiz_id: quiz, user_id: uid.student, score: 999, total_points: 1, passed: true })).error).not.toBeNull();
    await login(page, 'student'); await page.goto(`/courses/${course}`);
    await page.getByRole('button', { name: 'Start Quiz', exact: true }).click(); await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('button', { name: 'Submit Quiz' }).click(); await expect(page.getByText('Score: 1/1')).toBeVisible();
    const rows = await clients.student.from('quiz_attempts').select('score,total_points,passed').eq('quiz_id', quiz); ok(rows.error);
    expect(rows.data).toEqual([{ score: 1, total_points: 1, passed: true }]);
  });
  test('student submits, cannot self-grade, teacher grades, student reloads result', async ({ page, browser }) => {
    await login(page, 'student'); await page.goto(`/assignments/${assignment}`);
    await page.getByRole('button', { name: /Submit Assignment/ }).click();
    await page.getByPlaceholder(/github.com|https:\/\//).fill('https://example.test/staging-assignment');
    await page.getByRole('button', { name: /Submit$/ }).click(); await expect(page.getByText('Your Submission')).toBeVisible();
    const row = await clients.student.from('submissions').select('id').eq('assignment_id', assignment).single(); ok(row.error);
    expect((await clients.student.from('submissions').update({ marks: 100, status: 'graded' }).eq('id', row.data!.id)).error).not.toBeNull();
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:18081' }); const teacherPage = await context.newPage();
    try {
      await login(teacherPage, 'teacher'); await teacherPage.goto(`/assignments/${assignment}`);
      await teacherPage.getByRole('button', { name: 'Review', exact: true }).click();
      await teacherPage.getByLabel('Marks (out of 100)').fill('90'); await teacherPage.getByLabel('Feedback', { exact: true }).fill('Acceptance feedback');
      await teacherPage.getByRole('button', { name: 'Save Review', exact: true }).click(); await expect(teacherPage.getByText('90/100', { exact: true })).toBeVisible();
      await page.reload(); await expect(page.getByText('Marks: 90/100', { exact: true })).toBeVisible();
    } finally { await context.close(); }
  });
  test('cross-user writes and private bookmark reads are denied', async () => {
    const changed = await clients.student.from('courses').update({ description: 'unauthorized' }).eq('id', course).select('id');
    expect(changed.error !== null || changed.data?.length === 0).toBe(true);
    const row = await clients.teacher.from('courses').select('description').eq('id', course).single(); ok(row.error); expect(row.data?.description).toBe('Disposable staging acceptance');
    ok((await clients.student.from('lesson_bookmarks').insert({ user_id: uid.student, lesson_id: lesson })).error);
    const hidden = await clients.teacher.from('lesson_bookmarks').select('id').eq('lesson_id', lesson); ok(hidden.error); expect(hidden.data).toEqual([]);
  });
  test('real Storage: authorized signing/download, anonymous read and cross-owner upload denial', async () => {
    ok((await clients.teacher.storage.from('lesson-files').upload(object, Buffer.from(run), { contentType: 'text/plain' })).error); uploaded = true;
    const signed = await clients.student.storage.from('lesson-files').createSignedUrl(object, 60); ok(signed.error);
    // Native fetch avoids Playwright API call logs recording signed bearer URLs.
    const download = await fetch(signed.data!.signedUrl, { signal: AbortSignal.timeout(10000) })
      .catch(() => { throw new Error('Signed object download failed'); });
    expect(download.ok).toBe(true); expect(await download.text()).toBe(run);
    const publicUrl = clients.teacher.storage.from('lesson-files').getPublicUrl(object).data.publicUrl;
    const publicRead = await fetch(publicUrl, { signal: AbortSignal.timeout(10000) })
      .catch(() => { throw new Error('Anonymous object check failed'); });
    expect(publicRead.ok).toBe(false);
    const denied = await clients.student.storage.from('lesson-files').upload(`${course}/${run}-denied.txt`, Buffer.from(run), { contentType: 'text/plain' });
    if (!denied.error) { await clients.teacher.storage.from('lesson-files').remove([`${course}/${run}-denied.txt`]); }
    expect(denied.error).not.toBeNull();
  });
  test('real private Realtime receives server-stamped identity and rejects teacher-event spoofing', async () => {
    test.skip(!settings!.realtime, 'BLOCKED: STAGING_REALTIME=enabled requires private-only settings/policy review.');
    const messages: Record<string, unknown>[] = [];
    const channel = clients.student.channel(`live-${room}`, { config: { private: true } })
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => messages.push(payload));
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Private subscription timed out')), 15000);
        channel.subscribe(status => {
          if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error('Private subscription denied')); }
        });
      });
      ok((await clients.teacher.rpc('send_live_signal', { room, signal_event: 'chat-message', signal_payload: { message: run, userId: uid.student } })).error);
      await expect.poll(() => messages.length).toBe(1); expect(messages[0].userId).toBe(uid.teacher);
      expect((await clients.student.rpc('send_live_signal', { room, signal_event: 'teacher-ended', signal_payload: {} })).error).not.toBeNull();
    } finally { await clients.student.removeChannel(channel); }
  });
});
