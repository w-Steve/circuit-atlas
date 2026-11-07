import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('src/circuits/asia/melbourne-stands-2026.json','utf8')) as {zones:{zoneId:string;name:string;availability:string}[]};
for(const zone of source.zones)test(`Melbourne stand ${zone.zoneId}: continuous selection and real pass photograph`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 test.fixme(zone.availability!=='available'&&process.env.MELBOURNE_STAND_REVIEW!=='1','Source mound candidates require explicit local review.');
 await page.goto(`/#/circuits/melbourne/zones/${zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.selection h2')).toHaveText(zone.name);
 const point=page.locator('.world-pick-point'),u=Number(await point.getAttribute('data-u'));await point.press(u>.5?'ArrowLeft':'ArrowRight');await expect.poll(async()=>Number(await point.getAttribute('data-u'))).not.toBe(u);await point.press(u>.5?'ArrowRight':'ArrowLeft');
 await page.screenshot({path:info.outputPath('ground-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('ground-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)n++;return n});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('ground-pass.png'));await page.screenshot({path:info.outputPath('ground-photo.png')});
 // Candidate screenshots are retained even if the pixel check fails. This is a
 // visual regression, not a requirement that every grass viewpoint see a car.
 expect(red,'Candidate partial-visibility diagnostic; not whole-car acceptance').toBeGreaterThan(100);const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(zone.zoneId);expect(meta.observerPosture).toBe('seated');expect(meta.eyeHeightMetres).toBeCloseTo(1.2,1);expect(errors).toEqual([]);
});

for(const [id,name] of [['engineers-australia','Engineers Australia'],['mercedes-amg','Mercedes-AMG Grandstand'],['hill','Hill'],['american-express','American Express'],...source.zones.slice(6).map(z=>[z.zoneId,z.name])])test(`English stand picker ${id}`,async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/melbourne/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();
 await page.getByTestId(`zone-option-${id}`).click();await expect(page.locator('.selection h2')).toHaveText(name);
});

test('Hill handle dragging stays separate from map navigation on mouse and touch',async({page},info)=>{
 await page.goto('/#/circuits/melbourne/zones/hill/select');const canvas=page.locator('canvas:visible'),point=page.locator('.world-pick-point');
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
