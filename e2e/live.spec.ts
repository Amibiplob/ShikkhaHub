import { test, expect, login, users, C } from './fixture';

test.use({launchOptions:{channel:process.env.E2E_BROWSER_CHANNEL||'chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}});

test('teacher and student exchange real local WebRTC media, chat and lifecycle via simulated signaling',async({page,backend,browser},info)=>{
 backend.rows.enrollments.push({id:'enrollment',user_id:users.student.id,course_id:C});
 await login(page,backend,'teacher');await page.context().grantPermissions(['camera','microphone']);await page.goto('/live/test-room');await page.getByRole('button',{name:'Camera + Audio',exact:true}).click();await expect(page.getByRole('button',{name:'End',exact:true})).toBeVisible();
 const studentContext=await browser.newContext({permissions:[],viewport:{width:1024,height:900}});await backend.install(studentContext);const student=await studentContext.newPage();const errors:string[]=[];student.on('pageerror',e=>errors.push(e.message));
 try {
 await login(student,backend,'student');await student.goto('/live/test-room');await student.getByRole('button',{name:'Join Stream',exact:true}).click();await expect(student.locator('video')).toBeVisible();
 await expect.poll(()=>student.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await student.getByLabel('Live chat message').fill('Hello from the student');await student.getByRole('button',{name:'Send chat message'}).click();await expect(page.getByText('Hello from the student',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Mute',exact:true}).click();await expect(page.getByRole('button',{name:'Unmute',exact:true})).toBeVisible();await page.getByRole('button',{name:'Camera off',exact:true}).click();await expect(page.getByText('Audio Only Mode')).toBeVisible();
 await student.getByRole('button',{name:'Raise hand',exact:true}).click();await expect(page.getByText('Test student',{exact:true}).last()).toBeVisible();
 await page.screenshot({path:info.outputPath('teacher-live.png'),fullPage:true});await student.screenshot({path:info.outputPath('student-live.png'),fullPage:true});
 await student.getByRole('button',{name:'Leave',exact:true}).click();await expect(student.getByRole('button',{name:'Join Stream',exact:true})).toBeVisible();await student.getByRole('button',{name:'Join Stream',exact:true}).click();await expect(student.locator('video')).toBeVisible();
 await page.getByRole('button',{name:'End',exact:true}).click();await expect(student.getByRole('heading',{name:'Class has ended'})).toBeVisible();expect(backend.rows.live_classes[0].status).toBe('completed');expect(errors).toEqual([]);
 } finally {await studentContext.close();}
});
test('microphone denial returns a recoverable class entry state',async({page,backend})=>{
 await login(page,backend,'teacher');await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'))});});
 await page.goto('/live/test-room');await page.getByRole('button',{name:'Audio Only',exact:true}).click();await expect(page.getByText('Could not access microphone.')).toBeVisible();await expect(page.getByRole('button',{name:'Audio Only',exact:true})).toBeVisible();expect(backend.rows.live_classes[0].status).toBe('scheduled');
});
