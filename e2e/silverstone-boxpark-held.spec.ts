import {test,expect} from '@playwright/test';
test('unverified Boxpark views stay closed through camera deep links and the map menu',async({page},info)=>{
 for(const id of ['the-loop','boxpark-hangar']){
  await page.goto(`/#/circuits/silverstone/zones/${id}/phone`);
  await expect(page.getByRole('heading',{name:'此观赛区域暂未开放',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'拍照',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'返回地图',exact:true}).click();
  await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
  await page.getByTestId(`zone-option-${id}`).scrollIntoViewIfNeeded();
  await expect(page.getByTestId(`zone-option-${id}`)).toBeDisabled();
  await expect(page.getByRole('heading',{name:'WebGL 画面已中断',exact:true})).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`${id}-menu.png`)});
 }
});

test('real active WebGL context loss still shows recovery and reload restores the scene',async({page})=>{
 await page.goto('/#/circuits/silverstone/map');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const supported=await canvas.evaluate((c:HTMLCanvasElement)=>{const gl=c.getContext('webgl2')??c.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true});
 expect(supported).toBe(true);await expect(page.getByRole('heading',{name:'WebGL 画面已中断',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'重新加载场景',exact:true}).click();await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await expect(page.getByRole('heading',{name:'WebGL 画面已中断',exact:true})).toHaveCount(0);
});
