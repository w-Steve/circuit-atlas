import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync(new URL('../src/circuits/europe/silverstone-vale-2026.json',import.meta.url),'utf8'));
test.beforeEach(async({page})=>{
 if(!process.env.SILVERSTONE_VALE_CANDIDATE)return;
 const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/silverstone.json',import.meta.url),'utf8'));
 data.spectatorZones=data.spectatorZones.map((z:{zoneId:string})=>z.zoneId==='vale'?{...source.zone,availability:'available'}:z);
 await page.route(/\/assets\/silverstone-[^/]+\.js$/,async route=>{
  const response=await route.fetch(),body=await response.text();
  if(body.includes('trackGeometry')&&body.includes('spectatorZones'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(data)};`});
  else if(body.includes('vale-trackside-fence')&&body.includes('coordinates'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify({...source.barrierLayer,availability:'available'})};`});
  else await route.fulfill({response});
 });
});
for(const zone of [source.zone])test(`${zone.zoneId}: native Vale selection and seated photography`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/silverstone/zones/${zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.selection h2')).toHaveText(zone.name);
 const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);await point.press('ArrowLeft');
 const pickBefore=await point.getAttribute('data-u'),mapBefore=await canvas.getAttribute('data-selection-map-view'),box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2};
 if(info.project.name==='desktop'){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+15,start.y-5,{steps:8});await page.mouse.up()}
 else{const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+15*i/8,y:start.y-5*i/8,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
 await expect(point).not.toHaveAttribute('data-u',pickBefore!);expect(await canvas.getAttribute('data-selection-map-view')).toBe(mapBefore);
 await page.screenshot({path:info.outputPath('ground-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(zone.zoneId);expect(meta.observerPosture).toBe('seated');expect(meta.eyeHeightMetres).toBeCloseTo(1.2,1);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]>90&&a[i]>a[i+1]*1.3&&a[i]>a[i+2]*1.3)n++;return n});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('ground-pass.png'));await page.screenshot({path:info.outputPath('ground-photo.png')});writeFileSync(info.outputPath('exposure.json'),JSON.stringify({red,meta},null,2));expect(errors).toEqual([]);expect(red).toBeGreaterThan(50);
});
test('English keeps the native Vale entry usable',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));await page.goto('/#/circuits/silverstone/zones/vale/select');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.selection h2')).toHaveText('Vale');await expect(page.getByRole('button',{name:'Enter this view ↗',exact:true})).toBeVisible();
});
test('missing Vale fence fails safely even when the NPS barrier layer loads',async({page})=>{
 let failed=false;await page.route(/\/assets\/silverstone-vale-[^/]+\.js$/,async route=>{failed=true;await route.abort('failed')});
 await page.goto('/#/circuits/silverstone/zones/vale/phone');await expect(page.getByRole('heading',{name:'赛道数据未能载入',exact:true})).toBeVisible();expect(failed).toBe(true);await expect(page.locator('canvas')).toHaveCount(0);
});
