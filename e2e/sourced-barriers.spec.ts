import {test,expect} from '@playwright/test';

test('Monza source fence remains in the real low-front-row camera and saved photograph',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/monza/zones/vedano/select');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-sourced-barriers','7');
 const handle=page.locator('.world-pick-point');await handle.focus();
 // A source-polyline intersection exists from this actual low front-row eye.
 // Reach it using the same keyboard selection as a visitor, without camera hacks.
 for(let i=0;i<22;i++)await handle.press('ArrowRight');for(let i=0;i<9;i++)await handle.press('ArrowDown');
 expect(Number(await handle.getAttribute('data-u'))).toBeCloseTo(.94,7);expect(Number(await handle.getAttribute('data-v'))).toBeCloseTo(.05,7);
 await page.getByRole('button',{name:'进入相机 ◎',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'3×',exact:true}).click();await page.screenshot({path:info.outputPath('source-fence-viewfinder.png')});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片'});await expect(photo).toBeVisible();
 expect(await photo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();await(await event).saveAs(info.outputPath('source-fence-export.png'));
 await page.screenshot({path:info.outputPath('source-fence-photo.png')});expect(errors).toEqual([]);
});
