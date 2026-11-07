import {test,expect} from '@playwright/test';
for(const turn of [3,4,12]){
 const id=`accessible-platform-t${turn}`;
 test(`${id}: qualified platform continuous selection and seated real-pass photo`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/#/circuits/melbourne/zones/${id}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await expect(page.getByRole('note')).toHaveText('供有无障碍需求的观众使用，不接受提前预订。');
  const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);await point.press('ArrowLeft');
  await page.screenshot({path:info.outputPath('platform-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
  await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
  await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(id);expect(meta.observerPosture).toBe('seated');expect(meta.eyeHeightMetres).toBeCloseTo(1.2,1);
  const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]>90&&a[i]>a[i+1]*1.3&&a[i]>a[i+2]*1.3)n++;return n});
  const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('platform-pass.png'));await page.screenshot({path:info.outputPath('platform-photo.png')});
  await info.attach('platform-metrics',{body:JSON.stringify({id,red,meta}),contentType:'application/json'});expect(errors).toEqual([]);expect(red,'Default photograph only; not a platform-wide visibility guarantee').toBeGreaterThan(100);
 });
 test(`${id}: English eligibility note remains readable`,async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));await page.goto(`/#/circuits/melbourne/zones/${id}/select`);
  await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.selection h2')).toHaveText(`Accessible platform · T${turn}`);
  await expect(page.getByRole('note')).toHaveText('For spectators with accessibility needs. No advance reservations.');await expect(page.getByRole('button',{name:'Enter this view ↗',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('platform-english.png')});
 });
}
