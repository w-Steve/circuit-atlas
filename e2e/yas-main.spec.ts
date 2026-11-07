import {test,expect} from '@playwright/test';
test('Approximate Main continuous seated selection, observation and PNG export',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/yas-marina/zones/main/select');
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const point=page.locator('.world-pick-point');await point.focus();
 const before=await point.getAttribute('data-u');await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('main-select.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('main-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const f=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(f)};requestAnimationFrame(f)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
 await page.screenshot({path:info.outputPath('main-phone.png')});
 await page.getByRole('button',{name:'拍照',exact:true}).click();
 const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 const red=await photo.evaluate((img:HTMLImageElement)=>{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
  let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>90&&pixels[i]>pixels[i+1]*1.3&&pixels[i]>pixels[i+2]*1.3)count++;
  return count;
 });
 expect(red,'The sampled seated candidate photo includes the passing car').toBeGreaterThan(20);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();
 await(await download).saveAs(info.outputPath('main-photo.png'));expect(errors).toEqual([]);
});

