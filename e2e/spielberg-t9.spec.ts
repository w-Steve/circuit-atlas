import {test,expect} from '@playwright/test';
test('T9 and legacy east-bank links enter the corrected independent region',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['t9','ost-t8']){
  await page.goto(`/#/circuits/spielberg/zones/${id}/select`);const canvas=page.locator('canvas:visible');
  await expect(canvas).toHaveAttribute('data-camera-mode','select');await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(page.getByRole('heading',{name:'T9',exact:true})).toBeVisible();
  const point=page.locator('.world-pick-point');await point.focus();const before=await point.getAttribute('data-u');await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 }
 await page.screenshot({path:info.outputPath('t9-legacy-entry.png')});expect(errors).toEqual([]);
});
