import {test,expect} from '@playwright/test';

test('Americas, Asia and Shanghai retain independent camera and paused-car state',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/las-vegas/zones/main/select');
 const point=page.locator('.world-pick-point');await expect(point).toBeVisible();
 await point.focus();await page.keyboard.press('ArrowRight');
 const u=await point.getAttribute('data-u');
 await page.getByRole('button',{name:'进入相机 ◎'}).click();
 await page.getByRole('button',{name:'10×',exact:true}).click();
 await page.getByRole('combobox',{name:'快门速度'}).selectOption('125');
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
 // Phone playback updates separately from the 10 Hz telemetry. Wait for the
 // paused HUD before recording the position that must survive circuit changes.
 await expect(page.getByTestId('sim-status')).toHaveText('已暂停');
 const parked=await page.getByTestId('car-position').textContent();
 await page.evaluate(()=>location.hash='#/circuits/lusail/zones/main/select');
 await expect(point).toHaveAttribute('data-u','0.5');
 await point.focus();await page.keyboard.press('ArrowLeft');
 await page.getByRole('button',{name:'进入相机 ◎'}).click();
 await expect(page.getByRole('combobox',{name:'快门速度'})).toHaveValue('1000');
 await page.evaluate(()=>location.hash='#/circuits/shanghai/zones/a/select');
 await expect(page.locator('.selection h2')).toContainText('A');
 await page.evaluate(()=>location.hash='#/circuits/las-vegas/zones/main/phone');
 await expect(page.getByRole('combobox',{name:'快门速度'})).toHaveValue('125');
 await expect(page.locator('.zoom-presets button.active')).toHaveText('10×');
 await expect(page.getByTestId('car-position')).toHaveText(parked!);
 await page.evaluate(()=>location.hash='#/circuits/las-vegas/zones/main/select');
 await expect(point).toHaveAttribute('data-u',u!);
 await page.screenshot({path:info.outputPath('restored-american-view.png')});
 expect(errors).toEqual([]);
});

test('failed American footprint remains disabled and its direct link cannot create a fictitious view',async({page})=>{
 await page.goto('/#/circuits/montreal/map');
 await page.getByRole('button',{name:'选择观察位置 ↗'}).click();
 await expect(page.getByTestId('zone-option-grandstand-16')).toBeDisabled();
 await page.evaluate(()=>location.hash='#/circuits/montreal/zones/grandstand-16/phone');
 await expect(page.locator('.route-error')).toContainText('暂未开放');
 await expect(page.locator('canvas:visible')).toHaveCount(0);
 await page.getByRole('link',{name:'返回地图'}).click();
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-map-ready','montreal');
});

 test('Mexico corrected6B provides the outside observer',async({page},info)=>{
  await page.goto('/#/circuits/mexico/zones/grada-6b/select');
  const canvas=page.locator('canvas:visible');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const point=page.locator('.world-pick-point');await point.focus();await page.keyboard.press('ArrowRight');
  await expect(point).toHaveAttribute('data-u','0.52');
  await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-camera-mode','eye');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.screenshot({path:info.outputPath('mexico6b-corrected-eye.png')});
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
  await page.getByRole('button',{name:'播放赛车',exact:true}).click();
  await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
  await page.getByRole('button',{name:'拍照',exact:true}).click();
  await expect(page.getByRole('img',{name:'赛道模拟照片',exact:true})).toBeVisible();
  const download=page.waitForEvent('download');
  await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();
  await(await download).saveAs(info.outputPath('mexico6b-photo.png'));
 });
