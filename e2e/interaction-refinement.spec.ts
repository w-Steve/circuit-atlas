import {test,expect} from '@playwright/test';

for(const [circuit,zone] of [['shanghai','a'],['silverstone','hamilton-straight-a'],['suzuka','g']])test(`${circuit}/${zone}: whole-zone selection framing`,async({page},info)=>{
 await page.goto(`/#/circuits/${circuit}/zones/${zone}/select`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(canvas).toHaveAttribute('data-selection-framing',/.+/);const b=JSON.parse((await canvas.getAttribute('data-selection-framing'))!);
 expect(b.left).toBeGreaterThan(-.99);expect(b.right).toBeLessThan(.99);expect(b.bottom).toBeGreaterThan(-.99);expect(b.top).toBeLessThan(.99);
 await page.screenshot({path:info.outputPath('whole-zone.png')});
});

test('a circuit history document scrolls past the first viewport after leaving 3D',async({page},info)=>{
 await page.goto('/#/circuits/shanghai/map');await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('link',{name:'赛道档案：概念图、历史与统计'}).click();await expect(page.locator('.venue-history-list article')).not.toHaveCount(0);
 const before=await page.evaluate(()=>scrollY);await page.locator('.venue-history-list article').last().scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(before+200);
 await expect(page.locator('.venue-history-list article').last()).toBeInViewport();await page.screenshot({path:info.outputPath('history-bottom.png')});
});

test('leaving a world pin fades its compact coordinate lock',async({page},info)=>{
 await page.goto('/');const pins=page.locator('.world-pin:visible');
 for(let i=0;i<6&&!(await pins.count());i++)await page.locator('.world-cluster[data-members~="suzuka"]').click();
 if(info.project.name==='mobile')await pins.first().focus();else await pins.first().hover();
 const lock=page.locator('.world-locator');await expect(lock).toHaveAttribute('data-visible','true');
 expect((await page.locator('.world-coordinate').boundingBox())!.width).toBeLessThanOrEqual(160);
 const world=(await page.locator('.world-map').boundingBox())!;
 if(info.project.name==='mobile')await page.locator('.world-map').focus();else await page.mouse.move(world.x+8,world.y+8);
 await expect(lock).toHaveAttribute('data-visible','false');await expect(lock).not.toBeVisible();
});
