import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync(new URL('../src/circuits/europe/spa-gold7-candidate.json',import.meta.url),'utf8'));
test.beforeEach(async({page})=>{
 test.skip(!process.env.SPA_GOLD7_CANDIDATE,'Explicit candidate injection only; this is not an accepted runtime zone.');
 const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/spa.json',import.meta.url),'utf8'));
 data.spectatorZones=data.spectatorZones.map((z:{zoneId:string})=>z.zoneId===source.zone.zoneId?source.zone:z);
 data.barriers={...source.barrierLayer,availability:'available'};
 expect(data.barriers.barriers).toHaveLength(4);
 await page.route(/\/assets\/spa-[^/]+\.js$/,async route=>{
  const response=await route.fetch(),body=await response.text();
  if(body.includes('trackGeometry')&&body.includes('spectatorZones'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(data)};`});
  else await route.fulfill({response});
 });
});
test('native Gold7 candidate supports continuous selection and seated photo export',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/spa/zones/gold-7-la-source/select');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-sourced-barriers','4');
 const point=page.locator('.world-pick-point');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).toHaveAttribute('data-u','0.52');
 if(info.project.name!=='desktop'){
  const b=(await point.boundingBox())!,start={x:b.x+b.width/2,y:b.y+b.height/2},before=await point.getAttribute('data-u');
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+12,y:start.y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  await expect(point).not.toHaveAttribute('data-u',before!);
 }
 await page.screenshot({path:info.outputPath('candidate-selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('candidate-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();await page.getByRole('button',{name:'拍照',exact:true}).click();
 const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();expect(JSON.parse((await photo.getAttribute('data-exposure'))!).zoneId).toBe(source.zone.zoneId);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>90&&pixels[i]>pixels[i+1]*1.3&&pixels[i]>pixels[i+2]*1.3)count++;return count});
 expect(red,'Car visible at this tested middle viewpoint with native barriers retained').toBeGreaterThan(20);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('candidate-photo.png'));
 expect(errors).toEqual([]);
});
test('English candidate entry and camera parameters remain usable',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/spa/zones/gold-7-la-source/select');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'Open camera ◎',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Shutter speed',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ideal panning',exact:true}).click();await expect(page.getByRole('button',{name:'Ideal panning',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('rear-row endpoints retain seated views with the canopy present',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const side of ['left','right']){
  await page.goto('/#/circuits/spa/zones/gold-7-la-source/select');
  const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const point=page.locator('.world-pick-point');await point.focus();
  for(let i=0;i<50;i++)await page.keyboard.press(side==='left'?'ArrowLeft':'ArrowRight');
  for(let i=0;i<20;i++)await page.keyboard.press('ArrowUp');
  await expect(point).toHaveAttribute('data-u',side==='left'?'0':'1');await expect(point).toHaveAttribute('data-v','1');
  await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.screenshot({path:info.outputPath(`rear-${side}-eye.png`)});
 }
 expect(errors).toEqual([]);
});
