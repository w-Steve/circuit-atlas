import {test,expect} from '@playwright/test';
test('paused car view stays pixel-identical after repeated shutter captures',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/zones/f/eye');
  const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.getByLabel('播放设置',{exact:true}).click();await page.getByRole('slider',{name:'演示速度'}).fill('340');await page.getByLabel('播放设置',{exact:true}).click();
  await page.getByRole('button',{name:'播放赛车经过',exact:true}).click();
  await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')?.dataset.simulationSeconds)>=3.68)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});(document.querySelector('.play-main') as HTMLButtonElement).click()});
  const position=await page.getByTestId('car-position').textContent();
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.waitForTimeout(150);
  const before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  for(const pan of ['固定镜头','理想跟拍']){
    await page.getByRole('button',{name:pan,exact:true}).click();await page.getByLabel('快门速度',{exact:true}).selectOption('60');
    await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'上海赛车场模拟照片'});await expect(photo).toBeVisible();
    const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.velocity).toBe(0);expect(meta.samples).toBe(1);
    await page.getByRole('button',{name:'关闭预览'}).click();await page.waitForTimeout(200);
    expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(before);
    expect(await page.getByTestId('car-position').textContent()).toBe(position);
  }
  await page.screenshot({path:info.outputPath('parked-after-photos.png')});
});
