import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const circuitRegistry=JSON.parse(readFileSync(new URL('../src/circuits/generated/summaries.json',import.meta.url),'utf8')) as {round:number}[];
const map=(page:any)=>page.locator('.world-map');
test('world map and calendar fit desktop, large screens and narrow phones',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of info.project.name==='desktop'?[1440,2549,792]:[390,320]){
  await page.setViewportSize({width,height:width>1800?1352:960});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.world-land path')).toHaveCount(119);await expect(page.locator('.circuit-card')).toHaveCount(23);
  const total=await page.locator('.world-pin,.world-cluster').evaluateAll(nodes=>nodes.reduce((sum,n)=>sum+Number(n.getAttribute('data-count')??1),0));expect(total).toBe(78);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:info.outputPath(`home-${width}.png`)});
  await page.locator('#circuit-collection').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`calendar-${width}.png`)});
 }
 expect(errors).toEqual([]);
});
test('map clusters expand, background pans, keyboard and buttons zoom and circuit markers navigate',async({page},info)=>{
 await page.goto('/');const surface=map(page);const box=(await surface.boundingBox())!;
 const before=await surface.getAttribute('data-zoom');if(info.project.name==='mobile')await page.locator('.world-cluster').first().tap();else await page.locator('.world-cluster').first().click();await expect(surface).not.toHaveAttribute('data-zoom',before!);
 await page.getByRole('button',{name:'恢复世界地图',exact:true}).click();await expect(surface).toHaveAttribute('data-zoom','1.000');
 await page.getByRole('button',{name:'放大世界地图',exact:true}).click();await expect(surface).toHaveAttribute('data-zoom','1.500');
 // Space away from the marker layer and the destination card.
 const start={x:box.x+box.width*.3,y:box.y+box.height*.12},end={x:start.x+50,y:start.y-30};
 expect(await page.evaluate(p=>!!document.elementFromPoint(p.x,p.y)?.closest('a,button'),start)).toBe(false);
 if(info.project.name==='mobile'){
  const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up()}
 await expect(surface).not.toHaveAttribute('data-pan','0.0,0.0');
 await surface.focus();await page.keyboard.press('+');await expect(surface).toHaveAttribute('data-zoom','2.100');await page.keyboard.press('Home');await expect(surface).toHaveAttribute('data-pan','0.0,0.0');
 // The fixed selected destination stays accessible even when markers cluster.
 await page.locator('.world-destination').click();
 await expect(page).toHaveURL(/circuits\/shanghai\/map/);await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
});
test('calendar stays in round order and search opens a real viewing area',async({page})=>{
 await page.goto('/');await expect(page.locator('.circuit-card')).toHaveCount(23);expect(await page.locator('.circuit-card').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-round'))))).toEqual(circuitRegistry.map(c=>c.round).sort((a,b)=>a-b));
 await expect(page.locator('.region-nav,.calendar-availability')).toHaveCount(0);
 await page.getByRole('textbox',{name:'搜索赛道'}).fill('上海');await expect(page.locator('.circuit-card')).toHaveCount(1);
 await page.locator('.circuit-card').click();await page.getByRole('button',{name:'A 主看台 ↗',exact:true}).click();await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
});

test('touch pinch and wheel zoom change the actual geographic transform',async({page},info)=>{
 await page.goto('/');const surface=map(page),b=(await surface.boundingBox())!,prior=await page.locator('.world-geography>g').getAttribute('transform');
 if(info.project.name==='mobile'){
  const cdp=await page.context().newCDPSession(page);const y=b.y+b.height*.45;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width*.4,y,id:1},{x:b.x+b.width*.6,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*.2,y,id:1},{x:b.x+b.width*.8,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{await surface.focus();await page.mouse.move(b.x+b.width*.55,b.y+b.height*.45);await page.mouse.wheel(0,-200)}
 await expect(page.locator('.world-geography>g')).not.toHaveAttribute('transform',prior!);expect(Number(await surface.getAttribute('data-zoom'))).toBeGreaterThan(1);
 await page.screenshot({path:info.outputPath('world-zoomed.png')});
});


test('all locations remain represented at maximum zoom and marker-origin pinches never navigate',async({page},info)=>{
 await page.goto('/');const surface=map(page);
 if(info.project.name==='mobile'){
  const marker=(await page.locator('.world-cluster').first().boundingBox())!,x=marker.x+marker.width/2,y=marker.y+marker.height/2;
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1},{x:x+18,y:y+18,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-20,y:y-15,id:1},{x:x+40,y:y+40,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  expect(Number(await surface.getAttribute('data-zoom'))).toBeGreaterThan(1);await expect(page.locator('.catalog-shell')).toBeVisible();
 }
 const plus=page.getByRole('button',{name:'放大世界地图',exact:true});
 for(let i=0;i<9&&await plus.isEnabled();i++)await plus.click();
 await expect(surface).toHaveAttribute('data-zoom','24.000');const represented=await page.locator('.world-pin,.world-cluster').evaluateAll(ns=>ns.reduce((s,n)=>s+Number(n.getAttribute('data-count')??1),0));expect(represented).toBe(78);
 await page.getByRole('button',{name:'恢复世界地图',exact:true}).click();await expect(surface).toHaveAttribute('data-zoom','1.000');
});
