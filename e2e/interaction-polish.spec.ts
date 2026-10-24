import {test,expect} from '@playwright/test';

test('hover wheel zooms immediately and world view survives entering and leaving a circuit',async({page},info)=>{
 await page.goto('/');const world=page.locator('.world-map');await expect(world).toBeVisible();
 const b=(await world.boundingBox())!;await page.mouse.move(b.x+b.width*.6,b.y+b.height*.5);
 expect(await world.evaluate(e=>document.activeElement===e)).toBe(false);
 await page.mouse.wheel(0,-380);await expect.poll(async()=>Number(await world.getAttribute('data-zoom'))).toBeGreaterThan(1);
 const view=await world.getAttribute('data-zoom'),pan=await world.getAttribute('data-pan');
 await page.locator('.world-destination').click();await expect(page.locator('canvas:visible')).toBeVisible();
 await page.getByRole('button',{name:'返回世界地图',exact:true}).click();
 await expect(world).toHaveAttribute('data-zoom',view!);await expect(world).toHaveAttribute('data-pan',pan!);
 await page.screenshot({path:info.outputPath('remembered-world.png')});
});

test('contextual back, smooth return, map memory and readable camera stage',async({page},info)=>{
 await page.goto('/#/circuits/shanghai/map');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const b=(await canvas.boundingBox())!;await page.mouse.move(b.x+b.width*.58,b.y+b.height*.45);await page.mouse.down({button:'right'});await page.mouse.move(b.x+b.width*.68,b.y+b.height*.49,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(1200);
 const original=JSON.parse((await canvas.getAttribute('data-map-view'))!);
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.locator('.zone-list button').filter({hasText:'B 看台'}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const facing=JSON.parse((await canvas.getAttribute('data-selection-facing'))!),selectionView=JSON.parse((await canvas.getAttribute('data-map-view'))!);
 expect((selectionView.position[0]-facing.center[0])*facing.towardTrack[0]+(selectionView.position[2]-facing.center[2])*facing.towardTrack[2]).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('stand-selection.png')});
 await page.getByRole('button',{name:'进入相机 ◎',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 expect(await page.locator('.camera-bar select').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
 expect(await page.locator('.phone-playback button').first().evaluate(e=>getComputedStyle(e).textAlign)).toBe('center');
 await page.screenshot({path:info.outputPath('camera.png')});
 await page.getByRole('button',{name:'返回观赛',exact:true}).click();await expect(page).toHaveURL(/\/eye$/);
 await page.getByRole('button',{name:'返回选点',exact:true}).click();await expect(page).toHaveURL(/\/select$/);await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'返回赛道地图',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const restored=JSON.parse((await canvas.getAttribute('data-map-view'))!);
 original.position.forEach((x:number,i:number)=>expect(restored.position[i]).toBeCloseTo(x,0));
 expect(await canvas.evaluate(e=>{const event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});return !e.dispatchEvent(event)})).toBe(true);
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.world')!).userSelect)).toBe('none');
 await page.getByRole('link',{name:'赛道档案：概念图、历史与统计'}).click();await expect(page.locator('.venue-concept img')).toBeVisible();
 await page.getByRole('link',{name:'← 返回赛道',exact:true}).click();await expect(page).toHaveURL(/shanghai\/map$/);
});

test('historic unmodeled venue has a real concept, history and statistics',async({page},info)=>{
 await page.goto('/#/atlas/adelaide');const image=page.locator('.venue-concept img');await expect(image).toBeVisible();
 await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);
 await expect(page.locator('.venue-story')).toContainText('1985-11-03');await expect(page.locator('.venue-facts')).toContainText('11');
 await expect(page.getByRole('link',{name:'进入现有布局观赛 ↗'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.screenshot({path:info.outputPath('historic-profile.png'),fullPage:true});
});

test('wide screen camera controls share a command column with comfortable text',async({page},info)=>{
 if(info.project.name==='mobile')test.skip();
 await page.setViewportSize({width:2560,height:1352});await page.goto('/#/circuits/shanghai/zones/a/phone');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 const bar=(await page.locator('.camera-bar').boundingBox())!,play=(await page.locator('.phone-playback').boundingBox())!;
 expect(play.x+play.width/2).toBeCloseTo(bar.x+bar.width/2,0);
 expect(await page.locator('.camera-bar select').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(18);
 await page.screenshot({path:info.outputPath('wide-camera.png')});
});

test('touching a map label still selects that stand after gesture forwarding',async({page},info)=>{
 if(info.project.name!=='mobile')test.skip();
 await page.goto('/#/circuits/suzuka/map');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const marker=page.locator('#scene-labels button.marker:visible').first(),zone=await marker.getAttribute('data-zone');
 await marker.tap();await expect(page).toHaveURL(new RegExp(`/zones/${zone}/select$`));await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.world-pick-point')).toBeVisible();
});
