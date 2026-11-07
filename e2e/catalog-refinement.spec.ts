import {test,expect} from '@playwright/test';

test('catalog keeps the map clear and language choices truthful at each screen size',async({page},info)=>{
 const sizes=info.project.name==='desktop'?[[749,871],[1440,960]]:info.project.name==='tablet'?[[1024,768]]:[[390,844],[320,720]];
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});await page.goto('/#/circuits');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.catalog-nav a.text-link')).toHaveCount(0);
  await expect(page.locator('.catalog-footer>b,.catalog-footer>span')).toHaveCount(0);
  await expect(page.locator('.world-mouse-hint,.world-touch-hint,.world-map-foot')).toHaveCount(0);
  await expect(page.locator('.circuit-card')).toHaveCount(23);
  const trigger=page.locator('.language-trigger');await expect(trigger.locator('svg')).toHaveCount(1);await trigger.click();
  const triggerBox=(await trigger.boundingBox())!;expect(triggerBox.width).toBeGreaterThanOrEqual(44);expect(triggerBox.height).toBeGreaterThanOrEqual(44);
  expect(triggerBox.x+triggerBox.width).toBeLessThanOrEqual(width);
  const menu=page.getByRole('menu');const choices=await menu.getByRole('menuitemradio').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent?.trim(),disabled:(n as HTMLButtonElement).disabled})));
  const menuBox=(await menu.boundingBox())!;expect(menuBox.x).toBeGreaterThanOrEqual(0);expect(menuBox.x+menuBox.width).toBeLessThanOrEqual(width);expect(menuBox.y+menuBox.height).toBeLessThanOrEqual(height);
  expect(choices.filter(c=>!c.disabled).map(c=>c.text)).toEqual(['简体中文','English']);expect(choices.filter(c=>c.disabled).length).toBeGreaterThanOrEqual(8);
  await menu.getByRole('menuitemradio',{name:'简体中文',exact:true}).click();await expect(menu).toHaveCount(0);
  await trigger.click();await expect(menu.getByRole('menuitemradio',{name:'简体中文',exact:true})).toHaveAttribute('aria-checked','true');
  await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.click();await page.locator('.world-heading h1').click({position:{x:4,y:4}});await expect(menu).toHaveCount(0);
  const layout=await page.evaluate(()=>{
   const viewport=document.querySelector('.world-map-viewport')!.getBoundingClientRect(),card=document.querySelector('.world-destination')!.getBoundingClientRect();
   const icons=[...document.querySelectorAll('.world-map-tools button')].map(b=>{const a=b.getBoundingClientRect(),s=b.querySelector('svg')!.getBoundingClientRect();return Math.hypot((a.left+a.right-s.left-s.right)/2,(a.top+a.bottom-s.top-s.bottom)/2)});
   return {gap:card.top-viewport.bottom,cardHeight:card.height,icons,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  expect(layout.gap).toBeGreaterThanOrEqual(-.5);expect(layout.cardHeight).toBeLessThanOrEqual(110);expect(layout.overflow).toBe(false);
  for(const delta of layout.icons)expect(delta).toBeLessThan(1.1);
  const map=page.locator('.world-map');await page.locator('.world-map-tools button').first().click();const zoom=await map.getAttribute('data-zoom'),pan=await map.getAttribute('data-pan');
  await trigger.click();await page.keyboard.press('End');await expect(menu.getByRole('menuitemradio',{name:'English',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await expect(menu).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(map).toHaveAttribute('data-zoom',zoom!);await expect(map).toHaveAttribute('data-pan',pan!);
  await page.reload();await trigger.click();await expect(menu.getByRole('menuitemradio',{name:'English',exact:true})).toHaveAttribute('aria-checked','true');
  await page.screenshot({path:info.outputPath(`language-${width}.png`)});await page.keyboard.press('Escape');
  await page.screenshot({path:info.outputPath(`catalog-${width}.png`)});
  await page.locator('.atlas-tabs').scrollIntoViewIfNeeded();
  const clearTabs=await page.locator('.atlas-tabs [role="tab"]').evaluateAll(nodes=>nodes.every(node=>{
   const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  }));expect(clearTabs).toBe(true);
  await page.locator('#tab-atlas').click();await expect(page.locator('.atlas-card')).toHaveCount(78);
  await page.locator('#tab-calendar').click();await expect(page.locator('.circuit-card')).toHaveCount(23);
  await page.screenshot({path:info.outputPath(`calendar-clear-${width}.png`)});
 }
 expect(errors).toEqual([]);
});
