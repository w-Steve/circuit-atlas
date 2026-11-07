import {expect,test} from '@playwright/test';
test('rapid archive and map navigation leaves no orphaned shader readiness callbacks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack??e.message));
 await page.goto('/#/circuits/shanghai/map');
 for(let i=0;i<4;i++){
  await page.locator('.venue-info-link').click();await expect(page.locator('.venue-back')).toBeVisible();await page.locator('.venue-back').click();await expect(page.locator('canvas:visible')).toBeVisible();
 }
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');expect(errors).toEqual([]);
});
