import {test,expect} from '@playwright/test';

for(const [id,label] of [['b1','B1'],['b2','B2'],['q1','Q1'],['q2','Q2'],['s','S 家庭看台']])test(`Suzuka ${id}: sourced seating supports picking, viewing and actual photograph export`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`/#/circuits/suzuka/zones/${id}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.selection h2')).toHaveText(label);
 const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
 const photo=page.getByRole('img',{name:'赛道模拟照片'}),metadata=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(metadata.zoneId).toBe(id);
 expect(await photo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
 expect(errors).toEqual([]);
});

test('English S family stand is reachable from the circuit region picker',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/suzuka/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();await page.getByTestId('zone-option-s').click();
 await expect(page.locator('.selection h2')).toHaveText('Family Grandstand S');await expect(page).toHaveURL(/zones\/s\/select$/);
});
