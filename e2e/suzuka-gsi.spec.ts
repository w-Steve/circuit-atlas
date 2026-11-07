import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {CircuitPackage} from '../src/circuits/types';
const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/suzuka.json',import.meta.url),'utf8')) as CircuitPackage;

for(const zone of data.spectatorZones.filter(z=>z.availability==='available'))test(`Suzuka regional terrain: ${zone.zoneId} full real-time viewing and photo flow`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/suzuka/zones/${zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-terrain-samples','103041');await expect(page.locator('.selection h2')).toHaveText(zone.name);
 await expect(page.getByRole('link',{name:'国土地理院地形（加工）',exact:true})).toHaveAttribute('href','https://maps.gsi.go.jp/development/ichiran.html');
 const pick=page.locator('.world-pick-point'),before=Number(await pick.getAttribute('data-u'));await pick.press('ArrowRight');expect(Number(await pick.getAttribute('data-u'))).toBeCloseTo(before+.02,7);
 await page.screenshot({path:info.outputPath('selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片'});await expect(photo).toBeVisible();expect(JSON.parse((await photo.getAttribute('data-exposure'))!).zoneId).toBe(zone.zoneId);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)n++;return n});expect(red,'The actual car should be visible from this default viewpoint').toBeGreaterThan(100);
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();await(await event).saveAs(info.outputPath('real-pass.png'));await page.screenshot({path:info.outputPath('photo.png')});expect(errors).toEqual([]);
});
