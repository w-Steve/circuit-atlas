import {test,expect} from '@playwright/test';

test('world-map content stays in document flow and both catalog tabs remain unobscured',async({page},info)=>{
 const widths=info.project.name==='desktop'?[2552,1800,1799,1920,3200,1440]:info.project.name==='tablet'?[1024,749]:[390,320];
 for(const width of widths){
  await page.setViewportSize({width,height:width>1800?1274:960});await page.goto('/');
  await expect(page.locator('.world-destination')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{
   const rect=(s:string)=>document.querySelector(s)!.getBoundingClientRect();
   return {parentBottom:rect('.world-explorer').bottom,cardBottom:rect('.world-destination').bottom,tabsTop:rect('.atlas-tabs').top};
  });
  expect(layout.parentBottom-layout.cardBottom,`World-map parent must contain its destination card at ${width}px`).toBeGreaterThanOrEqual(-1);
  expect(layout.tabsTop-layout.cardBottom,`Catalog tabs need visible spacing after the map at ${width}px`).toBeGreaterThanOrEqual(24);
  for(const [name,count,selector] of [['全部图鉴',78,'.atlas-card'],['按年赛历',23,'.circuit-card']] as const){
   const tab=page.getByRole('tab',{name,exact:true});await tab.scrollIntoViewIfNeeded();
   expect(await tab.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}),`${name} must receive the pointer at ${width}px`).toBe(true);
   await tab.click();await expect(tab).toHaveAttribute('aria-selected','true');await expect(page.locator(selector)).toHaveCount(count);
  }
  await page.screenshot({path:info.outputPath(`catalog-flow-${width}.png`)});
 }
});
