import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('src/circuits/asia/lusail-general-admission.json','utf8'));
// Explicit local candidate builds never change the published availability.
const candidateReview=process.env.LUSAIL_CANDIDATE_REVIEW==='1';
import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

for(const [id,label] of [['lusail-hill','Lusail Hill 普通观赛区']])test(`Lusail ${id}: public ground supports picking, viewing and actual photograph export`,async({page},info)=>{
 test.fixme(source.zones[0].availability!=='available'&&!candidateReview,'Hill structural profile remains unverified; candidate review requires an explicit local preview build.');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`/#/circuits/lusail/zones/${id}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.selection h2')).toHaveText(label);
 const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 {
  await page.getByRole('button',{name:'3×',exact:true}).click();
  await page.getByRole('button',{name:'播放赛车',exact:true}).click();
  // Capture the actual 200km/h local pass at its recorded center (350m upstream).
  // Do not teleport, resize or change simulation speed for the photograph.
  await page.evaluate(async()=>{const canvas=document.querySelector('canvas')!;await new Promise<void>(resolve=>{
   const frame=()=>{if(Number(canvas.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame);
  });Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 }
 await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
 const photo=page.getByRole('img',{name:'赛道模拟照片'}),metadata=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(metadata.zoneId).toBe(id);
 expect(metadata.observerPosture).toBe('standing');expect(metadata.eyeHeightMetres).toBeCloseTo(1.65,1);
 expect(await photo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
 {
  const redPixels=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)red++;return red});
  expect(metadata.velocity).toBe(0);expect(metadata.samples).toBe(1);
  const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();const download=await downloadEvent;expect(download.suggestedFilename()).toMatch(/\.png$/);await download.saveAs(info.outputPath('public-ground-pass-export.png'));
  await page.screenshot({path:info.outputPath('public-ground-pass-photo.png')});
  await writeFile(info.outputPath('standing-review.json'),JSON.stringify({redPixels,metadata},null,2));
  expect(redPixels,'Diagnostic candidate photo: failure needs source review, not artificial clearance').toBeGreaterThan(100);
 }
 expect(errors).toEqual([]);
});

test('English GA areas are reachable from the region picker',async({page})=>{
 test.fixme(source.zones[0].availability!=='available','Hill remains unavailable until the structural elevation is validated.');
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/lusail/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();
 await page.getByTestId('zone-option-lusail-hill').click();await expect(page.locator('.selection h2')).toHaveText('Lusail Hill General Admission');
});

test('public-ground handle dragging stays separate from map navigation on mouse and touch',async({page},info)=>{
 test.fixme(source.zones[0].availability!=='available','Official Hill terraces lack a validated elevation profile; previous three-device photos failed. Keep full photo/gesture acceptance for future activation.');
 await page.goto('/#/circuits/lusail/zones/lusail-hill/select');const canvas=page.locator('canvas:visible'),point=page.locator('.world-pick-point');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const beforeU=await point.getAttribute('data-u'),beforeV=await point.getAttribute('data-v'),beforeView=await canvas.getAttribute('data-selection-map-view');
 const box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2},end={x:start.x+22,y:start.y-8};
 if(info.project.name==='desktop'){
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
 }else{
  const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
  for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/8,y:start.y+(end.y-start.y)*i/8,id:1}]});
  await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
 }
 await expect.poll(async()=>[await point.getAttribute('data-u'),await point.getAttribute('data-v')].join(',')).not.toBe([beforeU,beforeV].join(','));
 expect(await canvas.getAttribute('data-selection-map-view')).toBe(beforeView);
 const selection=[await point.getAttribute('data-u'),await point.getAttribute('data-v')];
 const r=(await canvas.boundingBox())!,a={x:r.x+r.width*.2,y:r.y+r.height*.25},b={x:a.x-25,y:a.y+15};
 expect(await canvas.evaluate((e,p)=>document.elementFromPoint(p.x,p.y)===e,a),'Map gesture must start on the canvas, not the compass button').toBe(true);
 if(info.project.name==='desktop'){
  await page.mouse.move(a.x,a.y);await page.mouse.down({button:'right'});await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up({button:'right'});await page.mouse.wheel(0,-80);
 }else{
  const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
 }
 await expect(canvas).not.toHaveAttribute('data-selection-map-view',beforeView!);
 expect([await point.getAttribute('data-u'),await point.getAttribute('data-v')]).toEqual(selection);
 const frames=await page.evaluate(async()=>{const values:number[]=[];await new Promise<void>(resolve=>{const start=performance.now();let last=start;const frame=(now:number)=>{values.push(now-last);last=now;if(now-start>=1200)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});return values});
 const sorted=frames.slice().sort((a,b)=>a-b),file=info.outputPath('frame-times.json');await writeFile(file,JSON.stringify({device:info.project.name,count:frames.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)}));await info.attach('public-ground-frame-times',{path:file,contentType:'application/json'});
 await page.screenshot({path:info.outputPath('ground-drag-navigation.png')});
});

// A source-confirmed ticket product must not expose an unusable placeholder camera.
test('unmodeled Hill terraces keep an honest error route and a usable circuit map',async({page},info)=>{
 await page.goto('/#/circuits/lusail/zones/lusail-hill/phone');
 await expect(page.getByRole('heading',{name:'此观赛区域暂未开放',exact:true})).toBeVisible();
 await expect(page).toHaveURL(/lusail-hill\/phone$/);await expect(page.locator('canvas')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('hill-unavailable.png')});
 await page.getByRole('link',{name:'返回地图',exact:true}).click();
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-map-ready','lusail');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('[data-zone="lusail-hill"]')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('retained-circuit-map.png')});
});
