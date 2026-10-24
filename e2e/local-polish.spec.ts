import {test,expect} from '@playwright/test';
import {readFileSync,readdirSync,statSync} from 'node:fs';
const records=JSON.parse(readFileSync(new URL('../src/circuits/generated/summaries.json',import.meta.url),'utf8')) as {circuitId:string}[];
for(const {circuitId:id} of records.filter(c=>c.circuitId!=='shanghai'))test(`${id}: facilities, geographic orientation and continuous spectator view`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const facility=JSON.parse(readFileSync(new URL(`../src/circuits/facilities/${id}.json`,import.meta.url),'utf8'));
 const data=JSON.parse(readFileSync(new URL(`../src/circuits/generated/${id}.json`,import.meta.url),'utf8'));
 await page.goto(`/#/circuits/${id}/map`);const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-facility-buildings',String(facility.buildings.length));
 await expect(canvas).toHaveAttribute('data-facility-lanes',String(facility.pitLanes.filter((l:any)=>!l.underground).length));
 await expect(page.locator('.map-scale')).toContainText(/\d+ (m|km)/);
 await expect(page.locator('#scene-labels button.marker').first()).toHaveAttribute('data-compact',/true|false/);
 await page.screenshot({path:info.outputPath('map.png')});
 await page.getByRole('button',{name:'ⓘ 地图说明',exact:true}).click();
 await expect(page.locator('.circuit-source-panel')).toContainText(facility.buildings.length?'P 房边界来自 OSM':'关键轮廓尚未核实');
 await page.getByRole('button',{name:'地图朝北，保留缩放',exact:true}).click();
 await expect(page.locator('.circuit-source-panel')).toHaveCount(0);
 const initial=JSON.parse((await canvas.getAttribute('data-map-view'))!);
 const b=(await canvas.boundingBox())!;
 await page.mouse.move(b.x+b.width*.63,b.y+b.height*.45);await page.mouse.down({button:'right'});await page.mouse.move(b.x+b.width*.74,b.y+b.height*.49,{steps:8});await page.mouse.up({button:'right'});
 await page.waitForTimeout(1100);
 const turned=JSON.parse((await canvas.getAttribute('data-map-view'))!);expect(turned.position).not.toEqual(initial.position);
 const distance=(v:any)=>Math.hypot(...v.position.map((x:number,i:number)=>x-v.target[i]));
 await page.getByRole('button',{name:'地图朝北，保留缩放',exact:true}).click();await page.waitForTimeout(200);
 const north=JSON.parse((await canvas.getAttribute('data-map-view'))!);expect(north.position[0]).toBeCloseTo(north.target[0],2);expect(distance(north)).toBeCloseTo(distance(turned),0);
 const zone=data.spectatorZones.find((z:any)=>z.availability==='available');
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.getByTestId(`zone-option-${zone.zoneId}`).click();await expect(page.locator('.world-pick-point')).toBeVisible();
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 if(facility.buildings.length){await page.getByText('测量',{exact:true}).click();await expect(page.getByText('P 房 · 建筑中心',{exact:true})).toBeVisible();await page.getByText('测量',{exact:true}).click()}
 await page.screenshot({path:info.outputPath('eye.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);
});

test('optional pit resources fail independently from the circuit and viewing controls',async({page})=>{
 const folder=new URL('../dist/assets/',import.meta.url);
 const file=readdirSync(folder).find(name=>name.startsWith('suzuka-')&&name.endsWith('.js')&&statSync(new URL(name,folder)).size<10000)!;expect(file).toBeDefined();
 await page.route(`**/${file}`,route=>route.abort());await page.goto('/#/circuits/suzuka/map');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-facility-buildings','0');
 await page.getByRole('button',{name:'ⓘ 地图说明',exact:true}).click();await expect(page.locator('.circuit-source-panel')).toContainText('维修区资源未能载入');
});

test('pit geometry participates in ordinary phone capture and mobile controls remain usable',async({page},info)=>{
 await page.goto('/#/circuits/silverstone/map');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.locator('.zone-list button:not([disabled])').first().click();await page.getByRole('button',{name:'进入相机 ◎',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(page.getByRole('dialog',{name:'照片预览'})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();const file=await download;await file.saveAs(info.outputPath(file.suggestedFilename()));expect(statSync((await file.path())!).size).toBeGreaterThan(20000);
 await page.getByRole('button',{name:'关闭预览'}).click();await page.screenshot({path:info.outputPath('camera.png')});
 await expect(page.getByRole('link',{name:'赛道档案：概念图、历史与统计'})).toBeVisible();
});
