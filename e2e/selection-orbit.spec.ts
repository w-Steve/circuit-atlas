import {test,expect} from '@playwright/test';
test('selection permits map gestures without moving the viewpoint and keyboard selection without map motion',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/zones/b/select');
  const canvas=page.locator('canvas'),point=page.locator('.world-pick-point');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const read=async()=>JSON.parse((await canvas.getAttribute('data-map-view'))!);
  const distance=(a:number[],b:number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
  const offset=(view:any)=>view.position.map((v:number,i:number)=>v-view.target[i]);
  const settle=async()=>expect.poll(async()=>{const a=await read();await page.waitForTimeout(100);const b=await read();return distance(a.position,b.position)+distance(a.target,b.target)}).toBeLessThan(.01);
  await settle();
  const initial=await read();
  const beforePoint=await point.getAttribute('data-u'),beforeView=await canvas.getAttribute('data-selection-map-view');
  const r=(await canvas.boundingBox())!,start={x:r.width*.65,y:r.height*.3},end={x:r.width*.77,y:r.height*.35};
  if(info.project.name!=='desktop'){
    const c=await page.context().newCDPSession(page);
    await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
  }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up()}
  await expect(canvas).not.toHaveAttribute('data-selection-map-view',beforeView!);
  await settle();
  const moved=await read();
  if(info.project.name==='desktop'){
   expect(distance(moved.target,initial.target)).toBeGreaterThan(.1);expect(distance(offset(moved),offset(initial))).toBeLessThan(.1);
   await page.mouse.move(start.x,start.y);await page.mouse.down({button:'right'});await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up({button:'right'});
   await settle();
   const rotated=await read();expect(distance(rotated.target,moved.target)).toBeLessThan(.1);expect(distance(offset(rotated),offset(moved))).toBeGreaterThan(.1);
  }else{
   expect(distance(moved.target,initial.target)).toBeLessThan(.1);expect(distance(offset(moved),offset(initial))).toBeGreaterThan(.1);
  }
  await expect(point).toHaveAttribute('data-u',beforePoint!);
  const beforeZoom=await canvas.getAttribute('data-selection-map-view');
  const zoomStart=await read();
  if(info.project.name!=='desktop'){
    const c=await page.context().newCDPSession(page);
    await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.width*.5,y:r.height*.3,id:1},{x:r.width*.7,y:r.height*.3,id:2}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.width*.45,y:r.height*.3,id:1},{x:r.width*.75,y:r.height*.3,id:2}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
  }else{await page.mouse.move(start.x,start.y);await page.mouse.wheel(0,-220)}
  await expect(canvas).not.toHaveAttribute('data-selection-map-view',beforeZoom!);
  await settle();
  const zoomed=await read();expect(distance(zoomed.position,zoomed.target)).toBeLessThan(distance(zoomStart.position,zoomStart.target));
  await expect(point).toHaveAttribute('data-u',beforePoint!);

  await settle();
  const view=await canvas.getAttribute('data-selection-map-view');
  await point.focus();await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  const after=JSON.parse((await canvas.getAttribute('data-selection-map-view'))!),prior=JSON.parse(view!);
  expect(Math.hypot(...after.map((x:number,i:number)=>x-prior[i]))).toBeLessThan(.05);
  await page.screenshot({path:info.outputPath('selection-orbit.png')});
});
