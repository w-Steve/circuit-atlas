import {test,expect} from '@playwright/test';
for(const language of ['zh','en'])test(`B profile gate stays closed in ${language}`,async({page},info)=>{
 await page.addInitScript(l=>localStorage.setItem('circuit-atlas-language',l),language);
 await page.goto('/#/circuits/monaco/map');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:language==='en'?'Choose a viewpoint ↗':'选择观察位置 ↗',exact:true}).click();
 const b=page.getByTestId('zone-option-b-casino');await expect(b).toBeDisabled();await b.scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath(`b-closed-${language}.png`)});
 await page.goto('/#/circuits/monaco/zones/b-casino/eye');
 await expect(page.locator('.route-error')).toBeVisible();await expect(page.locator('.world-pick-point')).toHaveCount(0);
 const back=page.locator('.route-error a');await expect(back).toHaveAttribute('href','#/circuits/monaco/map');await back.click();
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
});
