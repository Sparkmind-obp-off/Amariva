import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://localhost:3000';
const production=process.env.EXPECT_STORAGE==='unconfigured';
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const routes=['/','/tools','/tools/kalkulator-harga-jual','/resources','/resources/cara-menentukan-harga-jual','/resources/margin-vs-markup','/resources/cara-menghitung-bep','/resources/simulasi-diskon','/products','/products/pricing-kit','/about','/contact','/privacy','/terms','/checkout'];
let checked=0;
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
  const context=await browser.newContext({viewport});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  for(const path of routes) {
   const res=await page.goto(base+path,{waitUntil:'networkidle'});assert.equal(res.status(),200,path);
   assert.equal(await page.locator('h1').count(),1,path+' h1');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),path+' horizontal overflow at '+viewport.width);
   assert.ok(await page.locator('main').isVisible(),path+' main');
   checked++;
  }
  await page.goto(base+'/');
  await page.locator('#consent-no').click();
  if(viewport.width===1440)await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
  else if(viewport.width===390)await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
  if(viewport.width<=760){await page.locator('#nav-toggle').click();assert.equal(await page.locator('#nav-toggle').getAttribute('aria-expanded'),'true');assert.ok(await page.locator('#main-navigation').isVisible());}
  await page.goto(base+'/tools/kalkulator-harga-jual');
  await page.locator('#pricing-form button[type=submit]').click();
  assert.equal(await page.locator('#result-margin').textContent(),'45%');
  assert.equal(await page.locator('#result-bep').textContent(),'89 unit');
  assert.match(await page.locator('#result-profit').textContent(),/2\.500\.000/);
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-result').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'amariva-pricing-result.csv');
  await page.locator('#cost').fill('60000');await page.locator('#pricing-form button[type=submit]').click();assert.equal(await page.locator('#result-bep').textContent(),'Tidak tercapai');
  await page.locator('#cost').fill('25000');await page.locator('#units').fill('80');await page.locator('#pricing-form button[type=submit]').click();assert.match(await page.locator('#result-profit').textContent(),/200\.000/);assert.ok(await page.locator('#result-margin').evaluate(el=>el.classList.contains('warning')));
  assert.equal(errors.length,0,errors.join('\n'));
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 const tracking=[];page.on('request',req=>{if(req.url().endsWith('/api/events'))tracking.push(req)});
 await page.goto(base+'/tools/kalkulator-harga-jual');await page.locator('#consent-no').click();await page.locator('#pricing-form button[type=submit]').click();await page.waitForTimeout(100);assert.equal(tracking.length,0,'no analytics before/without consent');
 await page.locator('#privacy-settings').click();await page.locator('#consent-yes').click();await page.locator('#pricing-form button[type=submit]').click();await page.waitForTimeout(250);assert.ok(tracking.length>=3,'analytics only after consent');
 const payloads=tracking.map(req=>req.postDataJSON());for(const p of payloads)for(const k of ['email','cost','price','units','fixed','fee'])assert.equal(p[k],undefined,'tool inputs never sent');
 await context.close();
 console.log(`PASS: ${checked} route/viewport checks; calculator result, negative contribution, low-volume loss, CSV, mobile navigation, console and consent privacy.`);
 if(production)console.log('Production D1 intentionally unconfigured; storage requests are not claimed to work.');
} finally {await browser.close();}
