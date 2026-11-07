import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const retainedRuntime=JSON.parse(readFileSync(new URL('../src/circuits/generated/silverstone.json',import.meta.url),'utf8'));
const runtimeEA=retainedRuntime.elevation.source.url.includes('13787b9a-26a4-4775-8523-806d13af58fc');
test.beforeEach(async({page})=>{
 if(!process.env.SILVERSTONE_VILLAGE_A_CANDIDATE&&!process.env.SILVERSTONE_EA_CANDIDATE&&!process.env.SILVERSTONE_COPSE_D_STRIP)return;
 const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/silverstone.json',import.meta.url),'utf8')),candidate=JSON.parse(readFileSync(new URL('../src/circuits/europe/silverstone-village-a-2026.json',import.meta.url),'utf8')).zone;
 candidate.availability='available';data.spectatorZones=[...data.spectatorZones.filter((z:{zoneId:string})=>z.zoneId!==candidate.zoneId),candidate];data.spectatorZoneIds=[...new Set([...data.spectatorZoneIds,candidate.zoneId])];
 if(process.env.SILVERSTONE_COPSE_D_STRIP){
  const source=JSON.parse(readFileSync(new URL('../src/circuits/europe/silverstone-copse-d-datum-2026.json',import.meta.url),'utf8'));
  Object.assign(data.spectatorZones.find((z:{zoneId:string})=>z.zoneId===source.zoneId).surfaces[0],{rowStrip:source.rowStrip,rowBearing:source.rowBearing});
 }
 if(process.env.SILVERSTONE_EA_CANDIDATE){
  const terrain=JSON.parse(readFileSync(new URL('../src/circuits/elevation-source/candidates/silverstone-ea-dtm.json',import.meta.url),'utf8'));
  data.elevation={...data.elevation,grid:terrain.grid};
  if(process.env.SILVERSTONE_COPSE_D_FRONT_DATUM){
   const datum=JSON.parse(readFileSync(new URL('../src/circuits/europe/silverstone-copse-d-datum-2026.json',import.meta.url),'utf8'));
   data.spectatorZones.find((z:{zoneId:string})=>z.zoneId===datum.zoneId).surfaces[0].groundReference=datum.groundReference;
  }
 }
 const facilities=JSON.parse(readFileSync(new URL('../src/circuits/facilities/silverstone.json',import.meta.url),'utf8'));
 if(process.env.SILVERSTONE_EA_FACILITIES){facilities.pitLanes.forEach((l:{terrainMeshSpacingMetres?:number})=>l.terrainMeshSpacingMetres=2);facilities.buildings.forEach((b:{foundationToTerrain?:boolean})=>b.foundationToTerrain=true)}
 await page.route(/\/assets\/silverstone-[^/]+\.js$/,async route=>{const response=await route.fetch(),body=await response.text();if(body.includes('trackGeometry')&&body.includes('spectatorZones'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(data)};`});else if(process.env.SILVERSTONE_EA_FACILITIES&&body.includes('pitLanes')&&body.includes('buildings'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(facilities)};`});else await route.fulfill({response})});
});
const source={zones:['village-a'].map(zoneId=>({zoneId}))};
for(const zone of source.zones)test(`Silverstone source regression ${zone.zoneId}: candidate source bank, real pass and diagnostic photo`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/silverstone/zones/${zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 if(process.env.SILVERSTONE_EA_CANDIDATE)await expect(canvas).toHaveAttribute('data-terrain-samples','66049');
 if(process.env.SILVERSTONE_EA_FACILITIES||runtimeEA)await expect.poll(async()=>Number(await canvas.getAttribute('data-facility-triangles'))).toBeGreaterThan(40000);
 const point=page.locator('.world-pick-point'),before=Number(await point.getAttribute('data-u')),key=before>.5?'ArrowLeft':'ArrowRight';await point.press(key);await expect.poll(async()=>Number(await point.getAttribute('data-u'))).not.toBe(before);await point.press(key==='ArrowLeft'?'ArrowRight':'ArrowLeft');
 const pickBefore=await point.getAttribute('data-u'),mapBefore=await canvas.getAttribute('data-selection-map-view'),box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2};
 if(info.project.name==='desktop'){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+18,start.y-7,{steps:8});await page.mouse.up()}
 else{const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+18*i/8,y:start.y-7*i/8,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
 await expect(point).not.toHaveAttribute('data-u',pickBefore!);expect(await canvas.getAttribute('data-selection-map-view')).toBe(mapBefore);
 await page.screenshot({path:info.outputPath('ground-selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(zone.zoneId);expect(meta.focal).toBe(72);expect(meta.observerPosture).toBe('seated');expect(meta.eyeHeightMetres).toBeCloseTo(1.2,1);
 //3x photography at the selected VillageA point; real fences remain in the render.
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]>90&&a[i]>a[i+1]*1.3&&a[i]>a[i+2]*1.3)n++;return n});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('ground-pass.png'));await page.screenshot({path:info.outputPath('ground-photo.png')});await info.attach('standing-metrics',{body:JSON.stringify({id:zone.zoneId,red,meta}),contentType:'application/json'});
 writeFileSync(info.outputPath('exposure.json'),JSON.stringify({red,meta},null,2));
 expect(errors).toEqual([]);expect(red,'Default pass diagnostic, not every-point visibility certification').toBeGreaterThan(100);
});

test('EA facility terrain overview and Hamilton straight diagnostic',async({page},info)=>{
 test.skip(!process.env.SILVERSTONE_EA_FACILITIES&&!runtimeEA,'EA facility review');
 const started=Date.now();
 await page.goto('/#/circuits/silverstone/map');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-terrain-samples','66049');
 await expect.poll(async()=>Number(await canvas.getAttribute('data-facility-triangles'))).toBeGreaterThan(40000);
 const readyMilliseconds=Date.now()-started;
 const frameTimes=await page.evaluate(()=>new Promise<number[]>(resolve=>{const samples:number[]=[];let previous=performance.now();const next=(now:number)=>{samples.push(now-previous);previous=now;if(samples.length===61)resolve(samples.slice(1));else requestAnimationFrame(next)};requestAnimationFrame(next)}));
 const sorted=frameTimes.slice().sort((a,b)=>a-b);
 writeFileSync(info.outputPath('render-performance.json'),JSON.stringify({device:info.project.name,readyMilliseconds,frames:frameTimes.length,medianFrameMilliseconds:sorted[30],p95FrameMilliseconds:sorted[57],facilityTriangles:await canvas.getAttribute('data-facility-triangles'),limitations:'Local headless Edge, device emulation; not real phone GPU or Safari certification.'},null,2));
 await page.screenshot({path:info.outputPath('ea-overview.png')});
 await page.goto('/#/circuits/silverstone/zones/hamilton-straight-a/select');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('ea-hamilton-eye.png')});
});

test('Copse D front-row terrain diagnostic',async({page},info)=>{
 await page.goto('/#/circuits/silverstone/zones/copse-d/select');
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-terrain-samples',String(process.env.SILVERSTONE_EA_CANDIDATE?66049:retainedRuntime.elevation.grid.size**2));
 const point=page.locator('.world-pick-point');
 for(let i=0;i<50;i++)await point.press('ArrowLeft');
 for(let i=0;i<20;i++)await point.press('ArrowDown');
 await expect(point).toHaveAttribute('data-u','0');await expect(point).toHaveAttribute('data-v','0');
 await page.screenshot({path:info.outputPath('copse-d-selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('copse-d-eye.png')});
});

test('English entry exposes the sourced VillageA',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));await page.goto('/#/circuits/silverstone/map');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();await page.getByTestId('zone-option-village-a').click();
 await expect(page.locator('.selection h2')).toHaveText('Village A');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath('english-village-a.png')});

});
