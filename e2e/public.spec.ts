import { test, expect } from './fixture';
for(const width of [375,768,1024,1440]) test(`public routes at ${width}px`,async({page,backend},info)=>{
  await page.setViewportSize({width,height:1000});
  for(const path of ['/','/courses','/community','/leaderboard','/tutors','/auth','/reset-password','/missing']) {
    await page.goto(path);await expect(page.locator('main').first()).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.goto('/#project-team');
  await expect(page.getByRole('heading',{name:'Meet the Project Team'})).toBeVisible();
  for(const name of ['Md Biplob Hossain','Leon Khan','Al Amin','Asif Khan','Ahsan Habib'])await expect(page.getByText(name,{exact:true})).toBeVisible();
  await page.locator("#project-team").screenshot({path:info.outputPath(`team-${width}.png`)});
  await page.goto("/");await page.screenshot({path:info.outputPath(`home-${width}.png`)});
});
test('every protected route rejects an independent signed-out context',async({page,backend})=>{
  for(const path of ['/dashboard','/profile','/admin','/analytics','/achievements','/assignments/test','/live/test','/recordings/test']) {await page.goto(path);await expect(page).toHaveURL(/\/auth/);}
});
