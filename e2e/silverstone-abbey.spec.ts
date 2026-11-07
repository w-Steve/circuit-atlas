import {test,expect} from '@playwright/test';

for(const id of ['abbey-a','abbey-b'])test(`Silverstone ${id}: independent real area, local pass and photograph`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/silverstone/zones/${id}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.selection h2')).toHaveText(id==='abbey-a'?'Abbey A':'Abbey B');
 const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
 const photo=page.getByRole('img',{name:'赛道模拟照片'});expect(JSON.parse((await photo.getAttribute('data-exposure'))!).zoneId).toBe(id);expect(await photo.evaluate((p:HTMLImageElement)=>p.naturalWidth)).toBe(1600);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)n++;return n});expect(red,'The local pass must show the real car rather than an intervening stand').toBeGreaterThan(100);
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();await(await event).saveAs(info.outputPath('abbey-pass.png'));await page.screenshot({path:info.outputPath('photo.png')});expect(errors).toEqual([]);
});
