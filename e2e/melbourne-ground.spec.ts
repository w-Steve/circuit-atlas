import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('src/circuits/asia/melbourne-ground.json','utf8')) as {zones:{zoneId:string;name:string;availability:string}[]};
for(const zone of source.zones)test(`Melbourne Park Pass ${zone.zoneId}: continuous selection and real pass photograph`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 test.fixme(zone.availability!=='available'&&process.env.MELBOURNE_CANDIDATE_REVIEW!=='1','Source mound candidates require explicit local review.');
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
 expect(red,'Candidate partial-visibility diagnostic; not whole-car acceptance').toBeGreaterThan(100);const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(zone.zoneId);expect(meta.observerPosture).toBe('standing');expect(meta.eyeHeightMetres).toBeCloseTo(1.65,1);expect(errors).toEqual([]);
});

test('English mound entry uses the normal shared region picker',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/melbourne/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();
 await page.getByTestId('zone-option-park-pass-t8').click();
 await expect(page.locator('.selection h2')).toHaveText('Park Pass · T8–T9 mound');
});

test('English lakeside entry exposes the reviewed stroke footprint',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/melbourne/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();
 await page.getByTestId('zone-option-park-pass-lakeside').click();
 await expect(page.locator('.selection h2')).toHaveText('Park Pass · Lakeside mound');
});

test('historical Moss deep link does not enter a different2026 stand and can return to the map',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/melbourne/zones/moss/phone');
 await expect(page.getByRole('heading',{name:'找不到此观赛区域',exact:true})).toBeVisible();
 await expect(page).toHaveURL(/moss\/phone$/);await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('link',{name:'返回地图',exact:true}).click();
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
 await expect(page.getByTestId('zone-option-moss')).toHaveCount(0);
 await expect(page.getByTestId('zone-option-park-pass-lakeside')).toBeEnabled();
 expect(errors).toEqual([]);
});
