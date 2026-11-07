import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('unknown and withheld areas keep their error route rather than entering an unrelated stand',async({page})=>{
 // A is now correctly open in the real data. Exercise unaccepted data explicitly
 // so this protection keeps working when the genuine annual inventory is complete.
 const fixture=JSON.parse(readFileSync(new URL('../src/circuits/generated/monaco.json',import.meta.url),'utf8'));
 fixture.spectatorZones.find((z:{zoneId:string})=>z.zoneId==='a-sainte-devote').availability='preparing';
 fixture.spectatorZoneIds=fixture.spectatorZoneIds.filter((id:string)=>id!=='a-sainte-devote');let injected=false;
 await page.route(/\/assets\/monaco-[^/]+\.js$/,async route=>{
  const response=await route.fetch(),body=await response.text();
  if(body.includes('trackGeometry')&&body.includes('spectatorZones')){injected=true;await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(fixture)};`})}
  else await route.fulfill({response});
 });
 for(const [path,title] of [['monaco/zones/a-sainte-devote/phone','此观赛区域暂未开放'],['monza/zones/not-a-real-stand/eye','找不到此观赛区域']]){
  await page.goto(`/#/circuits/${path}`);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page).toHaveURL(new RegExp(path+'$'));await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link',{name:'返回地图',exact:true}).click();await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 }
 expect(injected).toBe(true);
});

test('secondary timing markers disappear when zoomed out and return only at close scale',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['shanghai','suzuka','monaco']){
  await page.goto(`/#/circuits/${id}/map`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-scene-engine','shared');
  const r=(await canvas.boundingBox())!;await page.mouse.move(r.x+r.width*.6,r.y+r.height*.45);for(let i=0;i<50&&await canvas.getAttribute('data-timing-sectors-visible')!=='false';i++){await page.mouse.wheel(0,350);await page.waitForTimeout(60)}
  await expect(canvas).toHaveAttribute('data-timing-sectors-visible','false');await expect(page.locator('[data-timing-mark]')).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`${id}-distant.png`)});
  for(let i=0;i<60&&await canvas.getAttribute('data-timing-sectors-visible')!=='true';i++){await page.mouse.wheel(0,-350);await page.waitForTimeout(60)}
  await expect(canvas).toHaveAttribute('data-timing-sectors-visible','true');expect(await page.locator('[data-timing-mark]').count()).toBeGreaterThanOrEqual(3);
  await page.screenshot({path:info.outputPath(`${id}-close.png`)});
 }
 expect(errors).toEqual([]);
});
test('circuit switches retain independent photo settings, parked simulation and tier selection',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/shanghai/zones/a/select');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'上层',exact:true}).click();await page.getByRole('slider',{name:'上层看台选点',exact:true}).press('ArrowRight');
 await page.getByRole('button',{name:'进入相机 ◎',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'10×',exact:true}).click();await page.getByLabel('快门速度',{exact:true}).selectOption('125');
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();await expect.poll(async()=>Number(await canvas.getAttribute('data-simulation-seconds'))).toBeGreaterThan(.3);await page.getByRole('button',{name:'暂停赛车',exact:true}).click();await expect(page.getByTestId('sim-status')).toHaveText('已暂停');
 const parked=await page.getByTestId('car-position').textContent();
 for(const id of ['suzuka','silverstone']){
  await page.evaluate(id=>location.hash=`#/circuits/${id}/map`,id);await expect(canvas).toHaveAttribute('data-map-ready',id);await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await expect(page.locator('canvas')).toHaveCount(1);
 }
 // Shanghai has been evicted from the two-model cache; session data still survives.
 await page.evaluate(()=>location.hash='#/circuits/shanghai/zones/a/phone');await expect(canvas).toHaveAttribute('data-map-ready','shanghai');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.getByRole('slider',{name:'连续变焦',exact:true})).toHaveValue('10');await expect(page.getByLabel('快门速度',{exact:true})).toHaveValue('125');await expect(page.locator('.experience-title')).toContainText('上层');
 await expect(page.getByTestId('car-position')).toHaveText(parked!);await expect(page.getByTestId('sim-status')).toHaveText('已暂停');
 await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('img',{name:'上海赛车场模拟照片',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('restored-upper-photo.png')});expect(errors).toEqual([]);
});
