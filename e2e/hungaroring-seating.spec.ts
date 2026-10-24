import {test,expect} from '@playwright/test';

for(const [id,label] of [['hungaroring','Hungaroring'],['grand-prix-2','Grand Prix 2'],['podium','Podium'],['chicane-3','Chicane 3'],['t1','T1'],['grand-prix-1','Grand Prix 1'],['apex-2','Apex 2'],['grid-1','Grid 1'],['grid-2','Grid 2'],['grid-3','Grid 3'],['pit-exit-1','Pit Exit 1'],['pit-exit-2','Pit Exit 2']])test(`Hungaroring ${id}: sourced seating supports picking, viewing and actual photograph export`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`/#/circuits/hungaroring/zones/${id}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.selection h2')).toHaveText(label);
 const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 if(id==='hungaroring'){
  await page.getByRole('button',{name:'3×',exact:true}).click();
  await page.getByRole('button',{name:'播放赛车',exact:true}).click();
  // Capture the actual 200km/h local pass at its recorded center (350m upstream).
  // Do not teleport, resize or change simulation speed for the photograph.
  await page.evaluate(async()=>{const canvas=document.querySelector('canvas')!;await new Promise<void>(resolve=>{
   const frame=()=>{if(Number(canvas.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame);
  });Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 }
 await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
 const photo=page.getByRole('img',{name:'赛道模拟照片'}),metadata=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(metadata.zoneId).toBe(id);
 expect(await photo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
 if(id==='hungaroring'){
  const redPixels=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)red++;return red});
  expect(redPixels,'A real car must be visible beyond the ordinary seating bank').toBeGreaterThan(100);
  expect(metadata.velocity).toBe(0);expect(metadata.samples).toBe(1);
  const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();const download=await downloadEvent;expect(download.suggestedFilename()).toMatch(/\.png$/);await download.saveAs(info.outputPath('main-pass-export.png'));
  await page.screenshot({path:info.outputPath('main-pass-photo.png')});
 }
 expect(errors).toEqual([]);
});
