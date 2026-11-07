import {test,expect} from '@playwright/test';
for(const language of ['zh','en'])test(`Madrid public chooser excludes invalid public placeholders (${language})`,async({page},info)=>{
 await page.addInitScript(l=>localStorage.setItem('circuit-atlas-language',l),language);await page.goto('/#/circuits/madrid/map');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:language==='en'?'Choose a viewpoint ↗':'选择观察位置 ↗',exact:true}).click();
 await expect(page.getByTestId('zone-option-stand-3')).toHaveCount(0);
 await expect(page.getByTestId('zone-option-t9t10')).toHaveCount(0);
 await expect(page.getByTestId('zone-option-t13t14')).toBeDisabled();await expect(page.getByTestId('zone-option-t13t14')).toContainText(language==='en'?'GE23 Grandstand':'GE23 看台');
 await expect(page.getByTestId('zone-option-monumental-12')).toBeDisabled();
 await expect(page.getByTestId('zone-option-monumental')).toBeEnabled();
 await expect(page.getByTestId('zone-option-stand-1')).toBeEnabled();await expect(page.getByTestId('zone-option-stand-2')).toBeEnabled();
 await page.getByTestId('zone-option-t1t3').click();await expect(page.locator('.selection h2')).toHaveText(language==='en'?'GB2 Grandstand':'GB2 看台');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('remaining-public-bank.png')});
});
test('Withdrawn old links return to the circuit map without creating a fake viewpoint',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','zh'));
 for(const id of ['stand-3','t9t10'])for(const mode of ['select','eye','phone']){
  await page.goto(`/#/circuits/madrid/zones/${id}/${mode}`);await expect(page.locator('.route-error h1')).toHaveText('找不到此观赛区域');
  await expect(page.locator('.world-pick-point')).toHaveCount(0);await page.getByRole('link',{name:'返回地图',exact:true}).click();
  await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 }
 expect(errors).toEqual([]);
});

test('Unverified hospitality-associated banks cannot open viewpoints through old links',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['monumental-12','t13t14'])for(const mode of ['select','eye','phone']){
  await page.goto(`/#/circuits/madrid/zones/${id}/${mode}`);
  await expect(page.locator('.route-error')).toBeVisible();
  await expect(page.locator('.route-error a')).toHaveAttribute('href','#/circuits/madrid/map');
  await expect(page.locator('.world-pick-point')).toHaveCount(0);
 }
 await page.screenshot({path:info.outputPath('inner-unavailable.png')});expect(errors).toEqual([]);
});
