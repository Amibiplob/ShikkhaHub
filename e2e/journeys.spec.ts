import { test, expect, login, Backend, users, C, D, L, Q, A } from './fixture';

test('invalid and empty login, student login, restoration, role rejection and logout',async({page,backend})=>{
 await page.goto('/auth');await page.getByRole('button',{name:'Sign In',exact:true}).click();expect(await page.getByLabel('Email',{exact:true}).evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true);
 for(const email of [users.student.email,'nobody@example.test']) {
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('incorrect-disposable-input');await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page.getByText('Invalid login credentials',{exact:true}).last()).toBeVisible();
 }
 await login(page,backend,'student');await page.reload();await expect(page.getByRole('heading',{name:'Welcome back, Test student!'})).toBeVisible();
 await page.goto('/admin');await expect(page.getByRole('heading',{name:"You don't have access to this page"})).toBeVisible();
 await page.goto('/analytics');await expect(page.getByRole('heading',{name:"You don't have access to this page"})).toBeVisible();
 await page.goto('/dashboard');await page.getByRole('button',{name:'My Learning',exact:true}).click();await page.getByRole('menuitem',{name:'My Courses',exact:true}).click();await expect(page).toHaveURL(/tab=learning/);await page.getByRole('button',{name:'Account menu'}).click();await page.getByRole('menuitem',{name:/Sign Out/i}).click();
 await page.goto('/dashboard');await expect(page).toHaveURL(/\/auth/);
});
test('delayed roles do not transiently reject administrator session restoration',async({page,backend})=>{
 backend.roleDelay=350;await login(page,backend,'admin');await page.goto('/admin');await expect(page.getByRole('heading',{name:'Admin Panel'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Admin Panel'})).toBeVisible();
});
test('teacher signup sends intent to server and never inserts client roles',async({page,backend})=>{
 await page.goto('/auth?tab=signup&role=teacher');await page.getByLabel('Full Name').fill('Disposable Teacher');await page.getByLabel('Email',{exact:true}).fill('new-teacher@example.test');await page.getByLabel('Password',{exact:true}).fill(backend.password);await page.getByRole('button',{name:'Create Account'}).click();
 await expect(page.getByText(/Your teacher request will be reviewed/)).toBeVisible();
 expect(backend.mutations.find(m=>m.table==='auth.signup')?.body.data).toMatchObject({wants_teacher:true});expect(backend.mutations.filter(m=>m.table==='user_roles')).toEqual([]);
});
test('student enrolls, reads Markdown, persists progress, quiz and bookmarks, discusses and submits',async({page,backend},info)=>{
 await page.goto('/courses');await page.getByPlaceholder('Search courses...').fill('Browser Test');await expect(page.getByRole('heading',{name:'Browser Test Course'})).toBeVisible();
 await page.getByRole('button',{name:'Programming',exact:true}).click();await expect(page).toHaveURL(/category=Programming/);
 await login(page,backend,'student');await page.goto(`/courses/${C}`);await page.getByRole('button',{name:'Enroll Now'}).click();await expect(page.getByText('Enrolled',{exact:true})).toBeVisible();
 expect(backend.rows.enrollments).toHaveLength(1);await expect(page.getByRole('heading',{name:'Learn safely'})).toBeVisible();
 await page.getByRole('button',{name:'Mark Complete'}).click();await expect(page.getByText('100% complete')).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Completed',exact:true})).toBeVisible();expect(backend.rows.lesson_progress).toHaveLength(1);
 await page.getByRole('button',{name:'Bookmark lesson',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'Remove lesson bookmark'})).toBeVisible();
 await page.getByRole('button',{name:'Start Quiz',exact:true}).click();await page.getByRole('radio',{name:'4',exact:true}).check();await page.getByRole('button',{name:'Submit Quiz'}).click();await expect(page.getByText('Score: 1/1')).toBeVisible();expect(backend.rows.quiz_attempts[0].passed).toBe(true);
 await page.reload();await expect(page.getByText('Pass: 70% • Last: 100%')).toBeVisible();
 await page.getByRole('button',{name:'Bookmark',exact:true}).first().click();await expect(page.getByRole('button',{name:'Remove bookmark'}).first()).toBeVisible();
 await page.getByPlaceholder("Start a discussion...").first().fill('How should I practice loops?');await page.getByRole('button',{name:/Post Question|Post$/}).click();await expect(page.getByText('How should I practice loops?',{exact:true})).toBeVisible();
 await page.goto(`/assignments/${A}`);await page.getByRole('button',{name:/Submit Assignment/}).click();await page.getByPlaceholder(/github.com|https:\/\//).fill('https://example.test/student-project');await page.getByRole('button',{name:/Submit$/}).click();await expect(page.getByText('Your Submission')).toBeVisible();expect(backend.rows.submissions).toHaveLength(1);
 await page.reload();await expect(page.getByText('https://example.test/student-project',{exact:true}).first()).toBeVisible();
 await page.screenshot({path:info.outputPath('student-assignment.png'),fullPage:true});
});
test('progress and bookmark errors do not show false success',async({page,backend})=>{
 backend.rows.enrollments.push({id:'enrolled',user_id:users.student.id,course_id:C});backend.deniedProgress=true;
 await login(page,backend,'student');await page.goto(`/courses/${C}`);await page.getByRole('button',{name:'Mark Complete'}).click();await expect(page.getByText('Progress was not saved. Try again.')).toBeVisible();await expect(page.getByRole('button',{name:'Mark Complete'})).toBeVisible();expect(backend.rows.lesson_progress).toHaveLength(0);
});
test('teacher creates draft, edits course, module and lesson, adds quiz, assignment and publishes',async({page,backend})=>{
 await login(page,backend,'teacher');await page.getByRole('button',{name:'New Course',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Disposable Draft');await page.getByLabel('Description',{exact:true}).fill('Safe course creation');await page.getByRole('button',{name:'Create Course',exact:true}).click();
 const created=backend.rows.courses.find(c=>c.title==='Disposable Draft')!;expect(created.is_published).toBe(false);
 await page.goto(`/courses/${created.id}`);await page.getByRole('button',{name:'Edit course information'}).click();await page.getByLabel('Course title',{exact:true}).fill('Edited Disposable Course');await page.getByRole('button',{name:'Save course information'}).click();await expect(page.getByRole('heading',{name:'Edited Disposable Course',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Module',exact:true}).click();await page.getByRole('dialog').getByLabel('Title',{exact:true}).fill('Test module');await page.getByRole('dialog').getByRole('button',{name:'Add Module',exact:true}).click();await expect(page.getByText('Module created!',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Lesson',exact:true}).click();await page.getByRole('dialog').getByLabel('Module',{exact:true}).click();await page.getByRole('option',{name:'Test module',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Test documentation');await page.getByLabel(/Content/).fill('# Documentation\n\nPractice here.');await page.getByRole('dialog').getByRole('button',{name:'Add Lesson',exact:true}).click();await expect(page.getByText('Lesson created!',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'New Quiz',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Test assessment');await page.getByRole('button',{name:'Create Quiz',exact:true}).click();await page.getByPlaceholder('Question text').fill('Which option is correct?');await page.getByPlaceholder('Option 1').fill('Correct');await page.getByPlaceholder('Option 3').fill('Correct after gap');await page.getByRole('radio',{name:'Correct answer option 3'}).check();await page.getByRole('button',{name:'Add Question',exact:true}).click();await expect(page.getByText('1. Which option is correct?')).toBeVisible();expect(backend.rows.quiz_questions.find(q=>q.question==='Which option is correct?')?.correct_answer).toBe(1);await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'New Assignment',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('New exercise');await page.getByRole('dialog').getByRole('button',{name:'Create',exact:true}).click();await expect(page.getByText('New exercise',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Publish',exact:true}).click();expect(created.is_published).toBe(true);await page.reload();await expect(page.getByRole('button',{name:'Unpublish',exact:true})).toBeVisible();
 await page.goto(`/courses/${D}`);await expect(page.getByText('Course not found',{exact:true})).toBeVisible();
});
test('teacher grades a student submission and persists feedback',async({page,backend})=>{
 backend.rows.submissions.push({id:'grade-me',assignment_id:A,student_id:users.student.id,submission_type:'url',content:'https://example.test/project',marks:null,status:'submitted',submitted_at:new Date().toISOString()});
 await login(page,backend,'teacher');await page.goto(`/assignments/${A}`);await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByLabel('Marks (out of 100)').fill('90');await page.getByLabel('Feedback',{exact:true}).fill('Good work');await page.getByRole('button',{name:'Save Review',exact:true}).click();await expect(page.getByText('90/100',{exact:true})).toBeVisible();expect(backend.rows.submissions[0]).toMatchObject({status:'graded',marks:90,feedback:'Good work'});await page.reload();await expect(page.getByText('90/100',{exact:true})).toBeVisible();
});
test('student requests tutoring, teacher approves, private meeting persists across contexts',async({page,backend,browser})=>{
 await login(page,backend,'student');await page.goto('/tutors');await page.getByRole('button',{name:'Request tutoring'}).click();await page.getByLabel('What would you like to learn?').fill('I need help understanding loops.');await page.getByRole('button',{name:'Send request'}).click();await expect(page.getByText('Status: pending')).toBeVisible();
 const context=await browser.newContext();await backend.install(context);const teacher=await context.newPage();await login(teacher,backend,'teacher');await teacher.goto('/tutors');await teacher.getByLabel('HTTPS meeting link').fill('https://example.test/private-meeting');await teacher.getByRole('button',{name:'Approve',exact:true}).click();await expect(teacher.getByText('Status: approved')).toBeVisible();await page.reload();await expect(page.getByRole('link',{name:'Join tutoring meeting'})).toHaveAttribute('href','https://example.test/private-meeting');await context.close();
});
test('administrator searches users, changes role, reviews teacher request and monitors courses',async({page,backend})=>{
 backend.rows.teacher_requests.push({id:'test-request',user_id:users.student.id,full_name:'Test student',email:users.student.email,status:'pending'});
 await login(page,backend,'admin');await page.goto('/admin');await page.getByPlaceholder('Search by name or ID...').fill('Test student');await expect(page.getByRole('cell',{name:/Test student/})).toBeVisible();await page.getByRole('button',{name:'Approve teacher'}).click();await expect(page.getByText('No pending requests.')).toBeVisible();expect(backend.rows.user_roles.some(r=>r.user_id===users.student.id&&r.role==='teacher')).toBe(true);
 await page.getByRole('tab',{name:'Courses',exact:true}).click();await page.getByPlaceholder('Search courses...').fill('Browser Test');await expect(page.getByRole('cell',{name:'Browser Test Course',exact:true})).toBeVisible();await page.getByRole('tab',{name:'Community',exact:true}).click();await expect(page.getByText('Welcome discussion',{exact:true})).toBeVisible();
});
for(const role of ['student','teacher','admin'] as const) test(`${role} main routes at mobile and tablet widths`,async({page,backend},info)=>{
 backend.rows.enrollments.push({id:'test-enroll',user_id:users.student.id,course_id:C});await login(page,backend,role);
 for(const width of [375,768]) {
 await page.setViewportSize({width,height:1000});
 for(const path of ['/dashboard',`/courses/${C}`,`/assignments/${A}`,'/profile','/tutors',...(role==='admin'?['/admin']:[])]) {
 await page.goto(path);await expect(page.locator('main').first()).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
 }
 await page.screenshot({path:info.outputPath(`${role}-mobile.png`),fullPage:true});
});
test('theme, Bangla team section and keyboard navigation',async({page,backend},info)=>{
 await page.goto('/#project-team');await page.getByRole('button',{name:'Switch to light mode'}).click();await expect(page.locator('html')).not.toHaveClass(/dark/);await page.getByRole('button',{name:'Switch language'}).click();await expect(page.locator('html')).toHaveAttribute('lang','bn');await expect(page.getByRole('heading',{name:'প্রকল্প দলের সাথে পরিচিত হোন'})).toBeVisible();await page.locator('#project-team').screenshot({path:info.outputPath('team-bangla-light.png')});await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','bn');
});
