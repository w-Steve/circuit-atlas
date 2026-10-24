import {test,expect} from '@playwright/test';
test('selection allows orbit without moving the viewpoint and point dragging without orbit',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/zones/b/select');
  const canvas=page.locator('canvas'),point=page.locator('.world-pick-point');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const beforePoint=await point.getAttribute('data-u'),beforeView=await canvas.getAttribute('data-selection-map-view');
  const r=(await canvas.boundingBox())!,start={x:r.width*.65,y:r.height*.3},end={x:r.width*.77,y:r.height*.35};
  if(info.project.name==='mobile'){
    const c=await page.context().newCDPSession(page);
    await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
  }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up()}
  await expect(canvas).not.toHaveAttribute('data-selection-map-view',beforeView!);
  await expect(point).toHaveAttribute('data-u',beforePoint!);
  const beforeZoom=await canvas.getAttribute('data-selection-map-view');
  if(info.project.name==='mobile'){
    const c=await page.context().newCDPSession(page);
    await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.width*.5,y:r.height*.3,id:1},{x:r.width*.7,y:r.height*.3,id:2}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.width*.45,y:r.height*.3,id:1},{x:r.width*.75,y:r.height*.3,id:2}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
  }else{await page.mouse.move(start.x,start.y);await page.mouse.wheel(0,-220)}
  await expect(canvas).not.toHaveAttribute('data-selection-map-view',beforeZoom!);
  await expect(point).toHaveAttribute('data-u',beforePoint!);

  await page.waitForTimeout(1800);
  const view=await canvas.getAttribute('data-selection-map-view');
  await point.focus();await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  const after=JSON.parse((await canvas.getAttribute('data-selection-map-view'))!),prior=JSON.parse(view!);
  expect(Math.hypot(...after.map((x:number,i:number)=>x-prior[i]))).toBeLessThan(.05);
  await page.screenshot({path:info.outputPath('selection-orbit.png')});
});
