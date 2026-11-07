import {test,expect} from '@playwright/test';
test('N-adjacent grass bank supports continuous standing observation and export',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/barcelona/zones/alonso-land-pelouse/select');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-mode','select');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const point=page.locator('.world-pick-point');await point.focus();await page.keyboard.press('ArrowRight');
 const u=Number(await point.getAttribute('data-u'));expect(u).toBeGreaterThan(0);expect(u).toBeLessThanOrEqual(1);
 await page.screenshot({path:info.outputPath('bank-select.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('bank-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','phone');
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();await page.getByRole('button',{name:'拍照',exact:true}).click();
 const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 const pixels=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)red++;return red});
 expect(pixels,'Sampled standing view sees the car without lifting eyes or moving fences').toBeGreaterThan(20);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('bank-photo.png'));expect(errors).toEqual([]);
});
