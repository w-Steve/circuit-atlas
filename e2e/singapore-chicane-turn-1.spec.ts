import {test,expect} from '@playwright/test';
for(const tier of ['chicane-turn-1'])test(`Singapore Chicane1 ${tier} selection, observation and PNG export`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/singapore/zones/${tier}/select`);
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');

 const point=page.locator('.world-pick-point');await point.focus();
 const before=await point.getAttribute('data-u');await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('singapore-chicane1-select.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('singapore-chicane1-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const f=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3){(Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='暂停赛车'||b.textContent==='暂停赛车') as HTMLButtonElement).click();resolve();}else requestAnimationFrame(f)};requestAnimationFrame(f)}));
 await expect(page.getByRole('button',{name:'播放赛车',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('singapore-chicane1-phone.png')});
 await page.getByRole('button',{name:'拍照',exact:true}).click();
 const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 const red=await photo.evaluate((img:HTMLImageElement)=>{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
  let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>90&&pixels[i]>pixels[i+1]*1.3&&pixels[i]>pixels[i+2]*1.3)count++;
  return count;
 });
 await info.attach('standing-view-car-pixels',{body:String(red),contentType:'text/plain'});
 expect(await photo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(1000);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();
 await(await download).saveAs(info.outputPath('singapore-chicane1-photo.png'));expect(errors).toEqual([]);
});
