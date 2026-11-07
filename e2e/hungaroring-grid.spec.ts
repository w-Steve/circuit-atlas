import {test,expect} from '@playwright/test';

for(const id of ['grid-2','grid-3'])test(`Hungaroring ${id}: independent geometry, visible local pass and photo`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/hungaroring/zones/${id}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const pick=page.locator('.world-pick-point');await pick.focus();
 await page.keyboard.press('ArrowRight');
 expect(Number(await pick.getAttribute('data-u'))).toBeCloseTo(.52,6);
 await page.screenshot({path:info.outputPath(`${id}-selection.png`)});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath(`${id}-eye.png`)});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 expect(JSON.parse((await photo.getAttribute('data-exposure'))!).zoneId).toBe(id);expect(await photo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)count++;return count});
 expect(red,'The actual car must remain visible through the retained scene').toBeGreaterThan(100);
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await event).saveAs(info.outputPath(`${id}-pass.png`));await page.screenshot({path:info.outputPath(`${id}-photo.png`)});expect(errors).toEqual([]);
});
