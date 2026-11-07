import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('src/circuits/americas/austin-ground-2026.json','utf8')) as {zones:{zoneId:string}[]};
for(const zone of source.zones)test(`Austin ${zone.zoneId}: standing terrain, real pass and photo`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/austin/zones/${zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const point=page.locator('.world-pick-point'),before=Number(await point.getAttribute('data-u')),key=before>.5?'ArrowLeft':'ArrowRight';await point.press(key);await expect.poll(async()=>Number(await point.getAttribute('data-u'))).not.toBe(before);await point.press(key==='ArrowLeft'?'ArrowRight':'ArrowLeft');
 await page.screenshot({path:info.outputPath('ground-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(zone.zoneId);expect(meta.observerPosture).toBe('standing');expect(meta.eyeHeightMetres).toBeCloseTo(1.65,1);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]>90&&a[i]>a[i+1]*1.3&&a[i]>a[i+2]*1.3)n++;return n});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('ground-pass.png'));await page.screenshot({path:info.outputPath('ground-photo.png')});await info.attach('standing-metrics',{body:JSON.stringify({id:zone.zoneId,red,meta}),contentType:'application/json'});
 expect(errors).toEqual([]);expect(red,'Default pass diagnostic, not every-point visibility certification').toBeGreaterThan(100);
});
test('English normal entry distinguishes race-time GA from the concert lawn',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));await page.goto('/#/circuits/austin/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();await page.getByTestId('zone-option-ga-t6-t8').click();
 await expect(page.locator('.selection h2')).toHaveText('Grass T6–T8');await expect(page.getByRole('note')).toHaveText('Only race-time viewing ground is modeled; the concert lawn is excluded.');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 const canvas=page.locator('canvas:visible'),point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u'),view=await canvas.getAttribute('data-selection-map-view'),box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2};
 if(info.project.name==='desktop'){
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+18,start.y-7,{steps:8});await page.mouse.up();
 }else{
  const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
  for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+18*i/8,y:start.y-7*i/8,id:1}]});
  await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
 }
 await expect(point).not.toHaveAttribute('data-u',before!);expect(await canvas.getAttribute('data-selection-map-view')).toBe(view);
 const performance=await page.evaluate(async()=>{const c=document.querySelector('canvas')!,start=performance.now(),frames=Number(c.dataset.renderFrames);await new Promise<void>(resolve=>{let count=0;const tick=()=>{if(++count>=120)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});return {callbackHz:120000/(window.performance.now()-start),renderCallbacks:Number(c.dataset.renderFrames)-frames,pixelRatio:c.width/c.getBoundingClientRect().width}});
 expect(performance.renderCallbacks).toBeGreaterThan(0);const sample={...performance,browser:'Edge',viewport:page.viewportSize(),scope:'Same host simulated sizes; callback timing, not real mobile hardware certification.'};writeFileSync(info.outputPath('local-frame-sample.json'),JSON.stringify(sample,null,2));await info.attach('local-frame-sample',{body:JSON.stringify(sample),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('english-race-time-ground.png')});
});
