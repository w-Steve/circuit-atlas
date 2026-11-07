import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const source={zones:[{zoneId:'t-rascasse'}]};
for(const zone of source.zones)test(`Monaco T1-T3 ${zone.zoneId}: candidate source bank, real pass and diagnostic photo`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/monaco/zones/${zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const point=page.locator('.world-pick-point'),before=Number(await point.getAttribute('data-u')),key=before>.5?'ArrowLeft':'ArrowRight';await point.press(key);await expect.poll(async()=>Number(await point.getAttribute('data-u'))).not.toBe(before);await point.press(key==='ArrowLeft'?'ArrowRight':'ArrowLeft');
 const pickBefore=await point.getAttribute('data-u'),mapBefore=await canvas.getAttribute('data-selection-map-view'),box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2};
 if(info.project.name==='desktop'){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+18,start.y-7,{steps:8});await page.mouse.up()}
 else{const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+18*i/8,y:start.y-7*i/8,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
 await expect(point).not.toHaveAttribute('data-u',pickBefore!);expect(await canvas.getAttribute('data-selection-map-view')).toBe(mapBefore);
 await page.screenshot({path:info.outputPath('ground-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(zone.zoneId);expect(meta.observerPosture).toBe('seated');expect(meta.eyeHeightMetres).toBeCloseTo(1.2,1);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]>90&&a[i]>a[i+1]*1.3&&a[i]>a[i+2]*1.3)n++;return n});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('ground-pass.png'));await page.screenshot({path:info.outputPath('ground-photo.png')});await info.attach('standing-metrics',{body:JSON.stringify({id:zone.zoneId,red,meta}),contentType:'application/json'});
 writeFileSync(info.outputPath('exposure.json'),JSON.stringify({red,meta},null,2));
 expect(errors).toEqual([]);expect(red,'Default pass diagnostic, not every-point visibility certification').toBeGreaterThan(100);
});

test('English entry exposes the final T1-T3 bank without untranslated labels',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));await page.goto('/#/circuits/monaco/map');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();await page.getByTestId('zone-option-t-rascasse').click();
 await expect(page.locator('.selection h2')).toHaveText('T1–T3 · Cale de Halage');await expect(page.locator('.selection')).toContainText('Shown area: front viewing band.');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('english-t.png')});

});
