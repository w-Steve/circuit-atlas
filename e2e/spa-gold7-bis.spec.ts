import {test,expect} from '@playwright/test';
test('production Gold7 Bis loads its structure and exports a seated car photograph',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/spa/zones/gold-7-bis-source/select');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-mode','select');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-sourced-barriers','4');
 await expect(page.locator('.selection-stats')).toContainText('近似看台');
 const point=page.locator('.world-pick-point');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).toHaveAttribute('data-u','0.52');
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('production-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','phone');
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const frame=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();await page.getByRole('button',{name:'拍照',exact:true}).click();
 const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<p.length;i+=4)if(p[i]>90&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.3)red++;return red});
 expect(red,'Car in this sampled photo with real roof/posts/barriers retained').toBeGreaterThan(20);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('production-photo.png'));expect(errors).toEqual([]);
});
test('production Gold7 Bis keeps its approximation label and camera controls in English',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/spa/zones/gold-7-bis-source/select');await expect(page.locator('.selection-stats')).toContainText('Approximate stand');
 await page.getByRole('button',{name:'Open camera ◎',exact:true}).click();await expect(page.getByRole('combobox',{name:'Shutter speed',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ideal panning',exact:true}).click();await expect(page.getByRole('button',{name:'Ideal panning',exact:true})).toHaveAttribute('aria-pressed','true');
});
