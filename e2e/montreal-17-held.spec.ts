import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {CircuitPackage} from '../src/circuits/types';
const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/montreal.json',import.meta.url),'utf8')) as CircuitPackage;
test('Unaccepted17 addition cannot be opened through a camera deep link or map menu',async({page},info)=>{
 const held=structuredClone(data);held.spectatorZones.find(z=>z.zoneId==='grandstand-17')!.availability='preparing';held.spectatorZoneIds=held.spectatorZoneIds.filter(id=>id!=='grandstand-17');let injected=false;
 await page.route(/\/assets\/montreal-[^/]+\.js$/,async route=>{
  const response=await route.fetch(),body=await response.text();
  if(body.includes('trackGeometry')&&body.includes('spectatorZones')){injected=true;await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(held)};`})}
  else await route.fulfill({response});
 });
 await page.goto('/#/circuits/montreal/zones/grandstand-17/phone');
 await expect(page.getByRole('heading',{name:'此观赛区域暂未开放',exact:true})).toBeVisible();
 expect(injected).toBe(true);
 await expect(page.getByRole('button',{name:'拍照',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'返回地图',exact:true}).click();
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
 await page.getByTestId('zone-option-grandstand-17').scrollIntoViewIfNeeded();
 await expect(page.getByTestId('zone-option-grandstand-17')).toBeDisabled();
 await page.screenshot({path:info.outputPath('33-held-map.png')});
});
