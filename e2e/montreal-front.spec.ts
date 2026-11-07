import {test,expect} from '@playwright/test';

for(const edge of [false,true])test(`Montreal 15 ${edge?'front edge':'middle'}: continuous pick, real pass and photo export`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/montreal/zones/grandstand-15/select');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const pick=page.locator('.world-pick-point');await pick.focus();
 if(edge){for(let i=0;i<22;i++)await page.keyboard.press('ArrowRight');for(let i=0;i<9;i++)await page.keyboard.press('ArrowDown');expect(Number(await pick.getAttribute('data-u'))).toBeCloseTo(.94,5);expect(Number(await pick.getAttribute('data-v'))).toBeCloseTo(.05,5)}
 await page.screenshot({path:info.outputPath('selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:edge?'1×':'3×',exact:true}).click();
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
 await page.getByRole('button',{name:'拍照',exact:true}).click();const dialog=page.getByRole('dialog',{name:'照片预览'});await expect(dialog).toBeVisible();
 const img=page.getByRole('img',{name:'赛道模拟照片'});expect(JSON.parse((await img.getAttribute('data-exposure'))!).zoneId).toBe('grandstand-15');
 expect(await img.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
 const red=await img.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const p=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)n++;return n});expect(red,'Real car must be visible, including from the formerly blocked front edge').toBeGreaterThan(100);
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();const download=await event;await download.saveAs(info.outputPath('montreal-15-pass.png'));
 await page.screenshot({path:info.outputPath('photo.png')});expect(errors).toEqual([]);
});
