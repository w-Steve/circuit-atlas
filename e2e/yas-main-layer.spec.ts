import {test,expect} from '@playwright/test';
test('Yas rejects the incorrect Main bank while South still opens',async({page},info)=>{
 await page.goto('/#/circuits/yas-marina/zones/main/select');
 await expect(page.locator('.route-error')).toContainText('暂未开放');
 await page.goto('/#/circuits/yas-marina/zones/south/select');
 const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-mode','eye');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('south-preserved.png')});
});
