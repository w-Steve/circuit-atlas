import {test,expect} from '@playwright/test';
for(const id of ['senna','prost'])test(`${id}: curved seat drag preserves map view and clamps at the edge`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/melbourne/zones/${id}/select`);
 const canvas=page.locator('canvas:visible'),point=page.locator('.world-pick-point');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const before=await point.getAttribute('data-u'),view=await canvas.getAttribute('data-selection-map-view'),box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2};
 if(info.project.name==='desktop'){
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+120,start.y-80,{steps:12});await page.mouse.up();
 }else{
  const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
  for(let i=1;i<=12;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+120*i/12,y:start.y-80*i/12,id:1}]});
  await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
 }
 await expect(point).not.toHaveAttribute('data-u',before!);expect(await canvas.getAttribute('data-selection-map-view')).toBe(view);
 for(const key of ['data-u','data-v']){const v=Number(await point.getAttribute(key));expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1)}
 await page.screenshot({path:info.outputPath('dragged-curved-bank.png')});expect(errors).toEqual([]);
});
