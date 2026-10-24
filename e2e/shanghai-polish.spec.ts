import {test,expect} from '@playwright/test';
test('Shanghai labels avoid headings and each other when zoomed out; menus dismiss naturally',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/map');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  const canvas=page.locator('canvas'),box=(await canvas.boundingBox())!;
  await page.mouse.move(box.width*.7,box.height*.4);await page.mouse.wheel(0,1500);await page.waitForTimeout(500);
  const collisions=await page.evaluate(()=>{
    const labels=Array.from(document.querySelectorAll('#scene-labels .marker,.corner-label')).filter(n=>getComputedStyle(n).visibility!=='hidden').map(n=>n.getBoundingClientRect());
    const title=document.querySelector('.map-heading')!.getBoundingClientRect();
    const overlap=(a:DOMRect,b:DOMRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    return labels.some((r,i)=>overlap(r,title)||labels.slice(i+1).some(b=>overlap(r,b)));
  });expect(collisions).toBe(false);
  await page.screenshot({path:info.outputPath('map-zoomed-out.png')});
  const zones=page.getByRole('button',{name:'选择观察位置 ↗',exact:true});await zones.click();await expect(zones).toHaveAttribute('aria-expanded','true');
  await page.mouse.click(12,150);await expect(zones).toHaveAttribute('aria-expanded','false');
  await zones.click();await page.keyboard.press('Escape');await expect(zones).toHaveAttribute('aria-expanded','false');
  await page.goto('/#/circuits/shanghai/zones/k/eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.getByLabel('播放设置',{exact:true}).click();await expect(page.locator('.speed-menu')).toHaveAttribute('open','');
  await page.getByText('测量',{exact:true}).click();await expect(page.locator('.speed-menu')).not.toHaveAttribute('open','');
  await page.keyboard.press('Escape');await expect(page.locator('.measure-menu')).not.toHaveAttribute('open','');
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
  await expect(page.getByRole('button',{name:'PRO',exact:true})).toHaveCount(0);await page.mouse.click(8,90);
  await expect(page.getByLabel('快门速度',{exact:true})).toBeVisible();
  await page.locator('.phone-settings summary').click();await expect(page.locator('.phone-settings')).toHaveAttribute('open','');
  await page.mouse.click(8,90);await expect(page.locator('.phone-settings')).not.toHaveAttribute('open','');
  await page.screenshot({path:info.outputPath('camera-clean.png')});
});
