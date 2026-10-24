import {test,expect} from '@playwright/test';

test('Shanghai sourced terrain, height display and all eight viewing regions remain navigable',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/shanghai/map');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-terrain-samples','4225');await expect(canvas).toHaveAttribute('data-terrain-colored','true');
 await page.getByRole('button',{name:'高度配色 · 5m 等高线',exact:true}).click();await expect(canvas).toHaveAttribute('data-terrain-colored','false');
 await page.getByRole('button',{name:'显示高度配色',exact:true}).click();
 await page.screenshot({path:info.outputPath('shanghai-terrain-map.png')});
 for(const id of ['a','b','e','h','k','c','f','j']){
  await page.goto(`/#/circuits/shanghai/zones/${id}/select`);
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const point=page.locator('.world-pick-point');await expect(point).toBeVisible();await point.focus();const u=await point.getAttribute('data-u');await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',u!);
  await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const position=await page.getByTestId('car-position').textContent(),y=Number(position?.match(/Y\s+(-?[\d.]+)/)?.[1]);expect(y).toBeGreaterThan(1);
  await page.screenshot({path:info.outputPath(`shanghai-${id}-eye.png`)});
 }
 expect(errors).toEqual([]);
});

for(const id of ['b','c'])test(`Shanghai ${id}: real elevated pass is visible and can be photographed`,async({page},info)=>{
 await page.goto(`/#/circuits/shanghai/zones/${id}/phone`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')?.dataset.simulationSeconds)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 // Telemetry refreshes every 100ms. Wait for its paused frame before reading
 // the reference position, rather than comparing against stale running text.
 await expect(page.getByTestId('sim-status')).toHaveText('已暂停');
 const before=await page.getByTestId('car-position').textContent();await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'上海赛车场模拟照片'});await expect(photo).toBeVisible();
 const pixels=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)red++;return red});
 expect(pixels,'Actual car pixels must remain visible above the terrain').toBeGreaterThan(100);
 expect(JSON.parse((await photo.getAttribute('data-exposure'))!).velocity).toBe(0);
 const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();const download=await downloadEvent;await download.saveAs(info.outputPath(`shanghai-${id}-pass.png`));
 await page.screenshot({path:info.outputPath(`shanghai-${id}-photo.png`)});
 await page.getByRole('button',{name:'关闭预览'}).click();expect(await page.getByTestId('car-position').textContent()).toBe(before);
});
