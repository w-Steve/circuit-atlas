import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const read=(p:string)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const source=read('../src/circuits/asia/yas-hill-candidate-2026.json');
test.beforeEach(async({page})=>{
 const data=read('../src/circuits/generated/yas-marina.json');
 data.spectatorZones=data.spectatorZones.filter((z:{zoneId:string})=>z.zoneId!==source.zone.zoneId);data.spectatorZones.push(source.zone);data.spectatorZoneIds=[...data.spectatorZoneIds.filter((id:string)=>id!==source.zone.zoneId),source.zone.zoneId];data.barriers=source.barrierPackage;
 await page.route(/\/assets\/yas-marina-[^/]+\.js$/,async route=>{
  const response=await route.fetch(),body=await response.text();
  if(body.includes('trackGeometry')&&body.includes('spectatorZones'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(data)};`});
  else await route.fulfill({response});
 });
});
test('Hill candidate continuous standing selection, observation and PNG export',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/yas-marina/zones/abu-dhabi-hill/select');
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-sourced-barriers','11');
 const point=page.locator('.world-pick-point');await point.focus();
 const before=await point.getAttribute('data-u');await page.keyboard.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);
 await page.screenshot({path:info.outputPath('hill-select.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-mode','eye');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('hill-eye.png')});
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
 await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(()=>new Promise<void>(resolve=>{const f=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(f)};requestAnimationFrame(f)}));
 await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
 await page.screenshot({path:info.outputPath('hill-phone.png')});
 await page.getByRole('button',{name:'拍照',exact:true}).click();
 await expect(page.getByRole('img',{name:'赛道模拟照片',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();
 await(await download).saveAs(info.outputPath('hill-photo.png'));expect(errors).toEqual([]);
});
