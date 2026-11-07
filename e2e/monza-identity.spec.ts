import {test,expect} from '@playwright/test';

test('the2026 Ascari3/code12 entry retains its historical deep link and complete viewing flow',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/monza/map');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();const entry=page.getByTestId('zone-option-ascari-tre');await expect(entry).toHaveText('Ascari 3 · 12↗');await entry.click();
 await expect(page).toHaveURL(/\/zones\/ascari-tre\/select$/);await expect(page.locator('.selection h2')).toHaveText('Ascari 3 · 12');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const handle=page.locator('.world-pick-point');await handle.press('ArrowRight');expect(Number(await handle.getAttribute('data-u'))).toBeCloseTo(.52,7);
 await page.screenshot({path:info.outputPath('ascari-code12-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.getByRole('button',{name:'3×',exact:true}).click();
 await expect(page.getByRole('button',{name:'3×',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{const canvas=document.querySelector('canvas')!;await new Promise<void>(resolve=>{const frame=()=>{if(Number(canvas.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片'});await expect(photo).toBeVisible();expect(JSON.parse((await photo.getAttribute('data-exposure'))!).zoneId).toBe('ascari-tre');
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)red++;return red});expect(red).toBeGreaterThan(100);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();await(await download).saveAs(info.outputPath('ascari-code12-export.png'));
 await page.screenshot({path:info.outputPath('ascari-code12-photo.png')});expect(errors).toEqual([]);
});
