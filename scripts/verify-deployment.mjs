// Deployment smoke checks against a real HTTP origin and repository subpath.
import {chromium,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2];
if(!base?.endsWith('/'))throw Error('Supply the full deployment URL ending in /');
const output=process.argv[3]??'artifacts/github-deployment/smoke';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,
 ...(process.env.DEPLOY_PROXY?{proxy:{server:process.env.DEPLOY_PROXY}}:{}),
 args:['--enable-webgl','--ignore-gpu-blocklist']});
const results=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{...devices['iPhone 13'],acceptDownloads:true}:{viewport:{width:1440,height:960},acceptDownloads:true});
  const page=await context.newPage(),errors=[],failed=[];page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))failed.push(`${r.status()} ${r.url()}`)});
  await page.goto(base);await expect(page.locator('.circuit-card')).toHaveCount(23);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-home.png`});
  await page.getByRole('combobox',{name:'选择赛季'}).selectOption('1950');await expect(page.locator('.circuit-card')).toHaveCount(7);
  await page.getByRole('tab',{name:'全部图鉴'}).click();await expect(page.locator('.atlas-card')).toHaveCount(78);
  await page.getByRole('textbox',{name:'搜索赛道'}).fill('纽北');await page.locator('.atlas-card').click();
  await expect(page.locator('.venue-history-list article')).toHaveCount(41);await page.reload();await expect(page.locator('.venue-history-list article')).toHaveCount(41);
  await page.goto(`${base}#/circuits/suzuka/map`);await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.corner-label')).toHaveCount(18);
  await page.goto(`${base}#/circuits/shanghai/zones/b/phone`);await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('combobox',{name:'快门速度'}).selectOption('60');
  await page.getByRole('button',{name:'拍照',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible({timeout:60000});
  const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();const file=await download;await file.saveAs(`${output}/${mobile?'mobile':'desktop'}-${file.suggestedFilename()}`);
  await page.getByRole('button',{name:'关闭预览',exact:true}).click();
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-camera.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  const statuses=await page.evaluate(async urls=>Promise.all(urls.map(async url=>(await fetch(url,{cache:'no-store'})).status)),[`${base}fonts/BarlowCondensed-SemiBold.ttf`,`${base}licenses/atlas-F1DB.txt`]);
  expect(statuses).toEqual([200,200]);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  results.push({device:mobile?'Chromium iPhone 13':'Edge desktop',passed:true,errors,failedResources:failed});await context.close();
 }
 await writeFile(`${output}/validation.json`,JSON.stringify({url:base,results},null,2)+'\n');console.log(JSON.stringify({url:base,results}));
}finally{await browser.close()}
