import {returnToWorld} from './navigation-helpers';
import {test,expect} from '@playwright/test';

test('Europe and Shanghai retain independent viewpoint, camera and parked car state',async({page})=>{
  test.setTimeout(80000);page.setDefaultTimeout(12000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#/circuits/shanghai/zones/b/select');
  await page.locator('.world-pick-point').focus();await page.keyboard.press('ArrowRight');
  const shanghaiU=await page.locator('.world-pick-point').getAttribute('data-u');
  await page.getByRole('button',{name:'进入此处视野 ↗'}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'播放赛车经过',exact:true}).click();
  await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-simulation-seconds'))).toBeGreaterThan(.4);
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  const parked=await page.getByTestId('car-position').textContent();
  await page.getByRole('button',{name:'打开手机相机'}).click();
  await page.getByRole('button',{name:'5×',exact:true}).click();
  await page.getByRole('combobox',{name:'快门速度'}).selectOption('125');
  await returnToWorld(page);
  await page.locator('.circuit-card[data-region="a"]').filter({hasText:'银石赛道'}).click();
  await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
  await page.getByTestId('zone-option-copse-a').click();
  await page.getByRole('button',{name:'进入相机 ◎'}).click();
  await page.getByRole('button',{name:'20×',exact:true}).click();
  await page.getByRole('combobox',{name:'快门速度'}).selectOption('60');
  await returnToWorld(page);
  await page.locator('.circuit-card[data-region="b"]').filter({hasText:'上海国际赛车场'}).click();
  await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
  await page.locator('.zone-list').getByRole('button',{name:'B 看台 ↗',exact:true}).click();
  await expect(page.locator('.world-pick-point')).toHaveAttribute('data-u',shanghaiU!);
  await page.getByRole('button',{name:'进入相机 ◎'}).click();
  await expect(page.getByRole('combobox',{name:'快门速度'})).toHaveValue('125');
  await expect(page.locator('.zoom-presets button.active')).toHaveText('5×');
  await expect(page.getByTestId('car-position')).toHaveText(parked!);
  expect(errors).toEqual([]);
});

test('failed European data and invalid stand links recover without breaking other circuits',async({page})=>{
  await page.route('**/madrid-*.js',r=>r.abort());
  await page.goto('/#/circuits/madrid/map');
  await expect(page.getByRole('heading',{name:'赛道数据未能载入'})).toBeVisible();
  await page.getByRole('link',{name:'返回赛道集合',exact:true}).click();
  await expect(page.locator('.circuit-card')).toHaveCount(23);
  await page.goto('/#/circuits/monza/zones/not-a-real-stand/eye');
  await expect(page.getByRole('heading',{name:'找不到此观赛区域'})).toBeVisible();
  await page.getByRole('link',{name:'返回地图',exact:true}).click();
  await expect(page.getByRole('button',{name:'选择观察位置 ↗',exact:true})).toBeVisible();
});
