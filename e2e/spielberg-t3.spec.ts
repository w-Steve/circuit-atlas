import {test,expect} from '@playwright/test';
test('production T3 supports continuous source-facing seated selection',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/spielberg/zones/t3/select');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-mode','select');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const point=page.locator('.world-pick-point');await point.focus();await page.keyboard.press('ArrowRight');await expect(point).toHaveAttribute('data-u','0.52');
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('t3-eye.png')});expect(errors).toEqual([]);
});
