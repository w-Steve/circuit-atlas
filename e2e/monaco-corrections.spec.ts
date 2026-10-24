import {test,expect} from '@playwright/test';
for(const [zoneId,name] of [['n-piscine','N · Piscine'],['o-piscine','O · Piscine'],['p-piscine','P · Piscine']]){
 test(`Monaco ${name}: corrected footprint supports selection, turning and phone capture`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/#/circuits/monaco/zones/${zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await expect(page.locator('.selection h2')).toHaveText(name);
  const point=page.locator('.world-pick-point');const before=await point.getAttribute('data-v');await point.focus();await page.keyboard.press('ArrowUp');await expect(point).not.toHaveAttribute('data-v',before!);
  await page.screenshot({path:info.outputPath('selected-stand.png')});
  await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.screenshot({path:info.outputPath('eye.png')});
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
  const metadata=JSON.parse((await page.getByRole('img',{name:'赛道模拟照片'}).getAttribute('data-exposure'))!);expect(metadata.zoneId).toBe(zoneId);
  expect(errors).toEqual([]);
 });
}
