import {test,expect} from '@playwright/test';

test('Suzuka V2 retains its upper floor through selection, viewing and phone capture',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/suzuka/zones/v1/eye');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const lower=JSON.parse((await canvas.getAttribute('data-observer-position'))!);
 await page.goto('/#/circuits/suzuka/zones/v2/select');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.selection h2')).toHaveText('V2');
 const point=page.locator('.world-pick-point'),initial=await point.getAttribute('data-u');
 await point.focus();await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',initial!);
 await page.screenshot({path:info.outputPath('upper-selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const upper=JSON.parse((await canvas.getAttribute('data-observer-position'))!);expect(upper[1]-lower[1]).toBeGreaterThan(7);
 await page.screenshot({path:info.outputPath('upper-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
 expect(JSON.parse((await page.getByRole('img',{name:'赛道模拟照片'}).getAttribute('data-exposure'))!).zoneId).toBe('v2');
 expect(errors).toEqual([]);
});
