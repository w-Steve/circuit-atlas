import {test,expect,Page} from '@playwright/test';
const read=async(page:Page)=>JSON.parse((await page.locator('canvas:visible').getAttribute('data-map-view'))!);
const pixels=async(page:Page)=>{
 const png=await page.locator('canvas:visible').screenshot({style:'#scene-labels,.corner-overlay{visibility:hidden!important}'});
 return page.evaluate(async source=>{
  const image=new Image();image.src=source;await image.decode();
  const small=document.createElement('canvas');small.width=180;small.height=120;
  const context=small.getContext('2d')!;context.drawImage(image,0,0,180,120);return Array.from(context.getImageData(0,0,180,120).data);
 },'data:image/png;base64,'+png.toString('base64'));
};
const delta=(a:number[],b:number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
const offset=(v:{position:number[];target:number[]})=>v.position.map((x,i)=>x-v.target[i]);
for(const id of ['shanghai','monaco','suzuka','miami','interlagos'])test(`${id}: map pan, orbit, wheel and WASD change the rendered scene`,async({page},info)=>{
  test.skip(info.project.name!=='desktop','Mouse and keyboard contract; touch covered by selection-orbit.');
  await page.goto(`/#/circuits/${id}/map`);
  const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-map-view',/.+/);
  await page.waitForTimeout(600);
  const box=(await canvas.boundingBox())!,x=box.x+box.width*.7,y=box.y+box.height*.4;
  const settle=async()=>{
    await expect.poll(async()=>{const a=await read(page);await page.waitForTimeout(100);const b=await read(page);return delta(a.target,b.target)+delta(a.position,b.position)},{timeout:15000}).toBeLessThan(.01);
  };
  const drag=async(button:'left'|'right')=>{await page.mouse.move(x,y);await page.mouse.down({button});await page.mouse.move(x+70,y+25,{steps:12});await page.mouse.up({button});await settle()};
  const before=await read(page),image=await pixels(page);
  await drag('left');const pan=await read(page);
  expect(delta(pan.target,before.target)).toBeGreaterThan(5);
  expect(delta(offset(pan),offset(before))).toBeLessThan(.1);
  const moved=await pixels(page);expect(moved.reduce((sum,v,i)=>sum+Math.abs(v-image[i]),0)/image.length).toBeGreaterThan(.2);
  await drag('right');const orbit=await read(page);
  expect(delta(orbit.target,pan.target)).toBeLessThan(.1);
  expect(delta(offset(orbit),offset(pan))).toBeGreaterThan(5);
  await page.mouse.move(x,y);await page.mouse.wheel(0,-200);await page.waitForTimeout(700);
  const zoom=await read(page);expect(delta(zoom.position,zoom.target)).toBeLessThan(delta(orbit.position,orbit.target));
  await page.keyboard.down('KeyW');await page.waitForTimeout(300);await page.keyboard.up('KeyW');
  const keys=await read(page);expect(delta(keys.target,zoom.target)).toBeGreaterThan(5);
  expect(delta(offset(keys),offset(zoom))).toBeLessThan(.1);
  await page.screenshot({path:info.outputPath('map-controls.png')});
});

test('returning from a phone frame restores map projection and controls after resize',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/zones/b/phone');const canvas=page.locator('canvas:visible');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.evaluate(()=>location.hash='#/circuits/shanghai/map');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.setViewportSize({width:info.project.name==='desktop'?1000:420,height:1000});
  await expect.poll(async()=>JSON.parse((await canvas.getAttribute('data-rendered-camera'))!).aspect).toBeCloseTo(info.project.name==='desktop'?1:.42,2);
  const before=await pixels(page);await page.keyboard.down('KeyD');await page.waitForTimeout(350);await page.keyboard.up('KeyD');
  const after=await pixels(page);expect(after.reduce((sum,v,i)=>sum+Math.abs(v-before[i]),0)/before.length).toBeGreaterThan(.1);
  await page.screenshot({path:info.outputPath('returned-map.png')});
});

test('failed seating geometry is disabled in lists and rejected through deep links',async({page})=>{
  await page.goto('/#/circuits/monaco/map');await page.getByRole('button',{name:'选择观察位置 ↗'}).click();
  await expect(page.getByTestId('zone-option-m-piscine')).toBeDisabled();
  await page.evaluate(()=>location.hash='#/circuits/monaco/zones/m-piscine/eye');
  await expect(page.locator('.route-error')).toContainText('暂未开放');
  await expect(page.locator('.world-pick-point')).toHaveCount(0);
});
