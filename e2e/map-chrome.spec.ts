import {test,expect} from '@playwright/test';

test('map controls align, stack vertically and keep stand labels ahead of timing annotations',async({page},info)=>{
 await page.goto('/#/circuits/shanghai/map');
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.experience-header .source-button,.experience-header .circuit-info-toggle')).toHaveCount(0);
 const layout=await page.evaluate(()=>{
  const box=(s:string)=>document.querySelector(s)!.getBoundingClientRect().toJSON();
  return {left:box('.back-link'),right:box('.venue-info-link'),heading:box('.map-heading'),compass:box('.map-orientation'),tools:box('.map-tools'),buttons:[...document.querySelectorAll('.map-tools>button')].map(b=>b.getBoundingClientRect().toJSON())};
 });
 expect(Math.abs(layout.left.top-layout.right.top)).toBeLessThan(1);
 expect(layout.left.height).toBe(layout.right.height);
 expect(Math.abs(layout.heading.top-layout.compass.top)).toBeLessThan(1);
 expect(layout.tools.width).toBeLessThan(180);
 for(let i=1;i<layout.buttons.length;i++)expect(layout.buttons[i].top).toBeGreaterThanOrEqual(layout.buttons[i-1].bottom);
 const stands=async()=>page.locator('#scene-labels button[data-zone]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).visibility!=='hidden').map(n=>n.getAttribute('data-zone')).sort());
 const before=await stands();expect(before.length).toBeGreaterThan(0);
 await expect(page.locator('#scene-labels button[data-zone="a"]')).toHaveAttribute('data-compact','false');
 await page.getByRole('button',{name:'显示计时分段',exact:true}).click();
 await expect.poll(stands).toEqual(before);
 await page.getByRole('button',{name:'显示计时分段',exact:true}).click();
 await expect.poll(stands).toEqual(before);
 await page.screenshot({path:info.outputPath('map-chrome.png')});
 await page.locator('.venue-info-link').click();
 await expect(page.locator('.catalog-nav .catalog-brand')).toHaveCount(0);
 await expect(page.locator('.venue-back')).toHaveAttribute('href','#/circuits/shanghai/map');
 const rows=page.locator('.venue-history-list article');await expect(rows).toHaveCount(19);
 expect((await rows.first().boundingBox())!.height).toBeLessThan(90);
 await expect(rows.first()).toHaveAttribute('data-race-id','shanghai-2026-2');
 await page.locator('.venue-history').scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('compact-history.png')});
 await page.locator('.venue-about summary').click();await expect(page.locator('.venue-source-content')).toContainText('FIA');
 await page.screenshot({path:info.outputPath('archive-about.png')});
 await page.locator('.venue-back').click();await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
});
