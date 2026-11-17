import { randomUUID } from 'node:crypto';
import { test, expect, login, C, D, users } from './fixture';

test('community popularity, counts, pagination, literal search and retry work together', async ({ page, backend }) => {
  backend.rows.community_posts = Array.from({ length: 14 }, (_, i) => ({ id: randomUUID(), user_id: users.teacher.id, title: `Feed post ${i}`, content: i === 12 ? 'literal %,),title.eq.secret_ marker' : 'Details', category: 'programming', is_pinned: i === 0, created_at: new Date(2026, 0, i+1).toISOString() }));
  const popular = backend.rows.community_posts[13];
  backend.rows.community_upvotes = [users.student, users.teacher, users.admin].map(u => ({ id: randomUUID(), user_id: u.id, post_id: popular.id }));
  backend.rows.community_comments = [{ id: randomUUID(), user_id: users.teacher.id, post_id: popular.id, content: 'Comment' }];
  await page.goto('/community?sort=popular');
  const titles = page.locator('h3');
  await expect(titles).toHaveCount(10); await expect(titles.nth(0)).toHaveText('Feed post 0'); await expect(titles.nth(1)).toHaveText('Feed post 13');
  await expect(page.getByText('1 comments', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click(); await expect(titles).toHaveCount(4);
  await page.getByRole('textbox', { name: 'Search posts', exact: true }).fill('%,),title.eq.secret_');
  await expect(titles).toHaveCount(1); await expect(titles).toHaveText('Feed post 12');
  let fail = true;
  backend.expectedHttp.push({ path: '/rpc/community_feed', status: 403 });
  await page.route('**/rpc/community_feed', route => fail ? route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"offline"}' }) : route.fallback());
  await page.getByRole('textbox', { name: 'Search posts', exact: true }).fill('Feed');
  await expect(page.getByRole('alert')).toContainText('Could not load posts'); fail = false;
  await page.getByRole('button', { name: 'Retry posts' }).click(); await expect(titles).toHaveCount(10);
});

test('course recordings are course-filtered and paged before reaching the browser', async ({ page, backend }) => {
  const classId = randomUUID(), otherId = randomUUID();
  backend.rows.live_classes.push({ id: classId, course_id: C, title: 'Recorded class', teacher_id: users.teacher.id, status: 'completed', room_name: 'recorded-class', scheduled_at: new Date().toISOString() }, { id: otherId, course_id: D });
  backend.rows.class_recordings = Array.from({ length: 13 }, (_, i) => ({ id: randomUUID(), live_class_id: i === 12 ? otherId : classId, title: i === 12 ? 'Other course private recording' : `Course recording ${i}`, file_url: `${classId}/${i}.webm`, created_at: new Date(2026,0,i+1).toISOString(), teacher_id: users.teacher.id }));
  await login(page, backend, 'student');
  const requests: URL[] = []; page.on('request', request => { if (request.url().includes('/class_recordings?')) requests.push(new URL(request.url())); });
  await page.goto(`/courses/${C}`);
  await expect(page.getByText('Class Recordings (12)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Watch', exact: true })).toHaveCount(10);
  await expect(page.getByText('Other course private recording')).toHaveCount(0);
  expect(requests[0].searchParams.get('live_classes.course_id')).toBe(`eq.${C}`);
  expect(requests[0].searchParams.get('limit')).toBe('10');
  await page.getByRole('button', { name: 'Next recordings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch', exact: true })).toHaveCount(2);
  expect(requests.at(-1)?.searchParams.get('offset')).toBe('10');
});

test('dashboard progress reads every page instead of silently truncating after the first 500 rows', async ({ page, backend }) => {
  const module = backend.rows.modules[0];
  backend.rows.lessons = Array.from({ length: 501 }, (_, i) => ({ id: randomUUID(), module_id: module.id, title: `Lesson ${i}`, type: 'article', sort_order: i, content: 'Body' }));
  backend.rows.enrollments = [{ id: randomUUID(), user_id: users.student.id, course_id: C }];
  backend.rows.lesson_progress = backend.rows.lessons.map(lesson => ({ id: randomUUID(), lesson_id: lesson.id, user_id: users.student.id, completed: true }));
  const offsets: string[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.endsWith('/lesson_progress')) offsets.push(url.searchParams.get('offset') ?? '0'); });
  await login(page, backend, 'student');
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
  expect(offsets).toContain('500');
});

test('discussion read errors remain recoverable instead of looking like an empty thread', async ({ page, backend }) => {
  const post = backend.rows.community_posts[0];
  let denied = true;
  backend.expectedHttp.push({ path: '/community_comments', status: 403 });
  await page.route('**/rest/v1/community_comments?*', route => denied ? route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"access temporarily unavailable"}' }) : route.fallback());
  await page.goto(`/community/${post.id}`);
  await expect(page.getByRole('alert')).toContainText('Could not load the discussion');
  denied = false;
  await page.getByRole('button', { name: 'Retry discussion' }).click();
  await expect(page.getByRole('heading', { name: String(post.title), exact: true })).toBeVisible();
});
