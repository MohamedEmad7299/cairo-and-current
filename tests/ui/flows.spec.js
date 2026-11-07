import {test,expect} from '@playwright/test';
const signIn=async(page,code,route='builder')=>{await page.goto('/#/'+route);await page.locator('#code').fill(code);await page.getByRole('button',{name:'Enter workspace'}).click();};
test('tour selection, previews and unavailable kayak',async({page})=>{await page.goto('/#/tours');await expect(page.getByRole('button',{name:'Proceed'})).toBeDisabled();await page.locator('#kayak-card').click();await expect(page.locator('.scene-kayak')).toHaveClass(/visible/);await expect(page.locator('#kayak-description')).toBeVisible();await expect(page.getByRole('button',{name:'Proceed'})).toBeDisabled();await page.locator('#khan-card').click();await expect(page.getByRole('button',{name:'Proceed'})).toBeEnabled();await page.route('https://www.airbnb.com/**',route=>route.fulfill({body:'Booking destination verified'}));await page.getByRole('button',{name:'Proceed'}).click();await expect(page).toHaveURL('https://www.airbnb.com/experiences/6840710');});
test('admin creates downloadable QR, scan appears and viewer gets names only',async({page,browser})=>{
 await signIn(page,'local-admin-demo');await expect(page.getByRole('heading',{name:'Guest details'})).toBeVisible();
 const name='UI Guest '+Date.now();await page.getByLabel('Guest name').fill(name);await page.getByLabel('Mobile number').fill('+201001234567');await page.getByRole('button',{name:'Generate QR code'}).click();await expect(page.locator('#qr-preview canvas')).toBeVisible();await page.screenshot({path:'test-results/builder-'+test.info().project.name+'.png',fullPage:true});
 const png=page.waitForEvent('download');await page.getByRole('button',{name:'PNG ↓',exact:true}).click();expect((await png).suggestedFilename()).toContain('.png');
 const svg=page.waitForEvent('download');await page.getByRole('button',{name:'SVG ↓',exact:true}).click();expect((await svg).suggestedFilename()).toContain('.svg');
 const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('cc-session')));const res=await page.request.get('http://127.0.0.1:8787/api/records?q='+encodeURIComponent(name),{headers:{Authorization:'Bearer '+stored.token}});const record=(await res.json()).items[0];
 const visitor=await browser.newContext();const guest=await visitor.newPage();const scan=guest.waitForResponse(r=>r.url().endsWith('/api/scan'));await guest.goto('http://127.0.0.1:5173/#/tours/'+record.token);expect((await scan).status()).toBe(200);await visitor.close();
 await page.getByRole('link',{name:/Dashboard/}).click();
 const filterDateBox=await page.locator('#filters input[name="from"]').boundingBox();
 expect(filterDateBox.width).toBeGreaterThan(120);
 await page.getByRole('textbox',{name:'Search guests'}).fill(name);await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByText(name,{exact:true})).toBeVisible();await page.screenshot({path:'test-results/dashboard-'+test.info().project.name+'.png'});const manageBtn=page.getByRole('button',{name:'Manage '+name});await manageBtn.scrollIntoViewIfNeeded();await manageBtn.click();await expect(page.locator('.scan-entry')).toHaveCount(1);await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:/Sign out/}).click();await page.locator('#code').fill('local-viewer-demo');const payload=page.waitForResponse(r=>r.url().includes('/api/records'));await page.getByRole('button',{name:'Enter workspace'}).click();const data=await (await payload).json();for(const item of data.items){expect(item.name).toBeTruthy();expect(item.mobile).toBeUndefined();expect(item.token).toBeUndefined();expect(item.scan_count).toBeDefined();}await expect(page.locator('.stats-grid')).toBeVisible();await expect(page.getByText('+201001234567')).toHaveCount(0);await expect(page.getByRole('link',{name:'QR builder'})).toHaveCount(0);
 await page.goto('/#/builder');await expect(page).toHaveURL(/#\/dashboard/);
});
test('validation, invalid login and narrow layouts',async({page})=>{await page.goto('/#/builder');await page.locator('#code').fill('invalid');await page.getByRole('button',{name:'Enter workspace'}).click();await expect(page.getByRole('alert')).toContainText('not recognized');await page.goto('/#/tours');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/tours-${test.info().project.name}.png`,fullPage:true});});
test('tracking outage does not block the tour',async({page})=>{await page.route('**/api/scan',route=>route.abort());await page.goto('/#/tours/'+'a'.repeat(48));await expect(page.getByRole('status').filter({hasText:'could not be recorded'})).toBeVisible();await page.locator('#khan-card').click();await expect(page.getByRole('button',{name:'Proceed'})).toBeEnabled();});
test('team access navigation and footer margins on all pages',async({page})=>{
  await page.goto('/#/privacy');
  const footer=page.locator('footer.site-footer');
  await expect(footer).toBeVisible();
  const box=await footer.boundingBox();
  expect(box.x).toBeGreaterThan(10);
  const teamLink=page.locator('#team-access-link');
  await expect(teamLink).toBeVisible();
  await teamLink.click();
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(page.locator('#code')).toBeVisible();
  await page.goto('/#/tours');
  const tourFooterBox=await page.locator('footer.site-footer').boundingBox();
  expect(tourFooterBox.x).toBeGreaterThan(10);
  await page.locator('#team-access-link').click();
  await expect(page).toHaveURL(/#\/dashboard/);
});
test('admin can open security modal and change access codes with validation',async({page})=>{
  await signIn(page,'local-admin-demo','dashboard');
  const btn=page.locator('#change-passwords');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('#password-form')).toBeVisible();

  await page.locator('#pwd-target').selectOption('viewer');
  
  // Test validation on mismatch
  await page.locator('#pwd-current').fill('local-admin-demo');
  await page.locator('#pwd-new').fill('newViewerSecret1234');
  await page.locator('#pwd-confirm').fill('differentSecret1234');
  await page.locator('#password-form button[type=submit]').click();
  await expect(page.locator('#password-error')).toContainText('not match');

  // Test reveal buttons
  const revealBtn=page.locator('.reveal-btn[data-target="pwd-new"]');
  await revealBtn.click();
  await expect(page.locator('#pwd-new')).toHaveAttribute('type','text');
  await revealBtn.click();
  await expect(page.locator('#pwd-new')).toHaveAttribute('type','password');

  // Submit valid update for viewer
  await page.locator('#pwd-confirm').fill('newViewerSecret1234');
  await page.locator('#password-form button[type=submit]').click();
  await expect(page.locator('#toast')).toContainText('updated');

  // Restore viewer code so subsequent tests remain unaffected
  await btn.click();
  await page.locator('#pwd-target').selectOption('viewer');
  await page.locator('#pwd-current').fill('local-admin-demo');
  await page.locator('#pwd-new').fill('local-viewer-demo');
  await page.locator('#pwd-confirm').fill('local-viewer-demo');
  await page.locator('#password-form button[type=submit]').click();
  await expect(page.locator('#toast')).toContainText('updated');
});



