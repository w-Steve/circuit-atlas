import {test,expect} from '@playwright/test';

for(const id of ['monaco','baku','singapore','montreal','melbourne','yas-marina'])test(`${id}: sourced water renders and survives map gestures`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`/#/circuits/${id}/map`);const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-water-features',/^[1-9]\d*$/);
 const box=(await canvas.boundingBox())!;await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55);await page.mouse.wheel(0,-170);
 await page.waitForTimeout(350);await page.screenshot({path:info.outputPath(`${id}-water.png`)});
 expect(errors.filter(e=>!/favicon/.test(e))).toEqual([]);
});

test('corrected shared-zone boundaries still allow continuous selection and observation',async({page},info)=>{
 for(const [id,zone] of [['zandvoort','pit-grandstand'],['spa','gold-9-pole-position'],['las-vegas','t-mobile-turn-7'],['silverstone','vale'],['sepang','main-grandstand']]){
  // Sepang ticket identifiers are checked by the data suite; its pit route is
  // inspected in overview here instead of inventing a named seating region.
  await page.goto(`/#/circuits/${id}/${id==='sepang'?'map':`zones/${zone}/select`}`);
  const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
  if(id!=='sepang'){await expect(canvas).toHaveAttribute('data-selection-framing',/.+/);const b=JSON.parse((await canvas.getAttribute('data-selection-framing'))!);expect(b.left).toBeGreaterThan(-1);expect(b.right).toBeLessThan(1)}
  await page.screenshot({path:info.outputPath(`${id}-layout.png`)});
 }
});
