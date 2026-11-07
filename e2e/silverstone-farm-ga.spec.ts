import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync(new URL('../src/circuits/europe/silverstone-farm-ga-2026.json',import.meta.url),'utf8'));
test.beforeEach(async({page})=>{
 if(!process.env.SILVERSTONE_FARM_GA_CANDIDATE)return;
 const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/silverstone.json',import.meta.url),'utf8'));
 data.spectatorZones=data.spectatorZones.filter((z:{zoneId:string})=>z.zoneId!==source.zone.zoneId).map((z:{zoneId:string})=>z.zoneId==='farm-curve'?source.stand:z);data.spectatorZones.push({...source.zone,availability:'available'});
 await page.route(/\/assets\/silverstone-[^/]+\.js$/,async route=>{const response=await route.fetch(),body=await response.text();if(body.includes('trackGeometry')&&body.includes('spectatorZones'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(data)};`});else if(body.includes('farm-fence-359218994')&&body.includes('coordinates'))await route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify({...source.barrierLayer,availability:'available'})};`});else await route.fulfill({response})});
});
test('Farm GA supports continuous ground selection, standing photography and download with native barriers',async({page},info)=>{
 const started=Date.now();await page.goto(`/#/circuits/silverstone/zones/${source.zone.zoneId}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');expect(JSON.parse((await canvas.getAttribute('data-sourced-barrier-ids'))??'[]')).toEqual(expect.arrayContaining(source.zone.requiredBarrierIds));
 const readyMilliseconds=Date.now()-started;
 const frameIntervals=await page.evaluate(async()=>new Promise<number[]>(resolve=>{const times:number[]=[];let previous=performance.now();const frame=(now:number)=>{times.push(now-previous);previous=now;if(times.length===45)resolve(times.slice(5).sort((a,b)=>a-b));else requestAnimationFrame(frame)};requestAnimationFrame(frame)}));
 const point=page.locator('.world-pick-point'),before=await point.getAttribute('data-u');await point.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',before!);await point.press('ArrowLeft');
 const start=(await point.boundingBox())!,x=start.x+start.width/2,y=start.y+start.height/2;
 if(info.project.name==='desktop'){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y,{steps:8});await page.mouse.up()}
 else{const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12*i/8,y,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
 await expect(point).not.toHaveAttribute('data-u',before!);await page.screenshot({path:info.outputPath('ground-selection.png')});
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'1×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.zoneId).toBe(source.zone.zoneId);expect(meta.observerPosture).toBe('standing');expect(meta.eyeHeightMetres).toBeCloseTo(1.65,2);
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('ground-pass.png'));writeFileSync(info.outputPath('exposure.json'),JSON.stringify({meta,flowMilliseconds:Date.now()-started,readyMilliseconds,frameMedianMilliseconds:frameIntervals[Math.floor(frameIntervals.length/2)],frameP95Milliseconds:frameIntervals[Math.floor(frameIntervals.length*.95)]},null,2));await page.screenshot({path:info.outputPath('ground-photo.png')});
});
test('English distinguishes ordinary GA admission from grandstand access',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));await page.goto(`/#/circuits/silverstone/zones/${source.zone.zoneId}/select`);await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.selection-admission')).toHaveText('General Admission · approximate boundary · no grandstand access');
});
test('missing Farm fence layer cannot produce an unobstructed GA substitute',async({page})=>{
 let failed=false;await page.route(/\/assets\/silverstone-farm-[^/]+\.js$/,async route=>{failed=true;await route.abort('failed')});
 await page.goto('/#/circuits/silverstone/zones/ga-farm-curve/phone');await expect(page.getByRole('heading',{name:'赛道数据未能载入',exact:true})).toBeVisible();expect(failed).toBe(true);await expect(page.locator('canvas')).toHaveCount(0);
});
test('Farm seating remains seated with the same native foreground fences',async({page},info)=>{
 await page.goto('/#/circuits/silverstone/zones/farm-curve/phone');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.observerPosture).toBe('seated');expect(meta.eyeHeightMetres).toBeCloseTo(1.2,2);const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('seated-regression.png'));
});
test('Farm GA is reachable from the overview area chooser',async({page})=>{
 await page.goto('/#/circuits/silverstone/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-map-ready','silverstone');await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.getByTestId('zone-option-ga-farm-curve').click();await expect(page).toHaveURL(/\/zones\/ga-farm-curve\/select$/);await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.selection-admission')).toContainText('近似范围');
});
