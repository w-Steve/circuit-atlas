import {test,expect} from '@playwright/test';
test('single camera with persistent shutter and continuous zoom beyond 5x',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/zones/c/phone');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await expect(page.getByRole('button',{name:'PRO',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('快门速度',{exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'10×',exact:true}).click();await expect(page.getByText('240 mm',{exact:true})).toBeVisible();
  await page.getByRole('slider',{name:'连续变焦'}).fill('30');await expect(page.getByText('720 mm',{exact:true})).toBeVisible();
  await page.getByLabel('快门速度',{exact:true}).selectOption('60');await page.getByRole('button',{name:'理想跟拍',exact:true}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'上海赛车场模拟照片'});await expect(photo).toBeVisible();
  const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.focal).toBe(720);expect(meta.shutter).toBe(60);expect(meta.pan).toBe('tracking');
  await page.getByRole('button',{name:'关闭预览'}).click();await page.getByRole('button',{name:'返回肉眼',exact:true}).click();await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
  await expect(page.getByRole('slider',{name:'连续变焦'})).toHaveValue('30');await expect(page.getByLabel('快门速度',{exact:true})).toHaveValue('60');
  await page.getByRole('button',{name:'1×',exact:true}).click();await page.screenshot({path:info.outputPath('camera-portrait.png')});
  await page.setViewportSize({width:900,height:430});await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await expect(page.getByLabel('快门速度',{exact:true})).toBeInViewport();await expect(page.getByRole('slider',{name:'连续变焦'})).toBeInViewport();await expect(page.getByRole('button',{name:'拍照',exact:true})).toBeInViewport();
  await page.screenshot({path:info.outputPath('camera-landscape.png')});
});
