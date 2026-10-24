import {test,expect} from '@playwright/test';
test('historical seasons, searchable atlas, venue deep links and existing simulation work',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('.circuit-card')).toHaveCount(23);
 await expect(page.locator('.catalog-nav')).not.toContainText('APEX');
 await expect(page.locator('.catalog-nav')).not.toContainText('观赛 · 摄影');
 await expect(page.locator('.world-legend')).toHaveText('2026 赛历');
 for(let i=0;i<3&&!await page.locator('.world-pin').count();i++)await page.getByRole('button',{name:'放大世界地图',exact:true}).click();
 await expect(page.locator('.world-pin span').first()).toHaveText('•');
 await page.getByRole('button',{name:'恢复世界地图',exact:true}).click();
 await page.getByRole('combobox',{name:'选择赛季'}).selectOption('1950');await expect(page.locator('.circuit-card')).toHaveCount(7);
 await expect(page.locator('.calendar-grid')).toContainText('布雷姆加滕');
 await expect(page.locator('.calendar-grid .card-outline')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('calendar-1950.png'),fullPage:true});
 await page.locator('.circuit-card').filter({hasText:'布雷姆加滕'}).click();
 await expect(page).toHaveURL(/atlas\/bremgarten/);await expect(page.locator('.venue-history-list article')).toHaveCount(5);
 await expect(page.locator('canvas')).toHaveCount(0);await expect(page.locator('.venue-experience')).toContainText('尚未建模');
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.getByRole('link',{name:'← 返回世界地图',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'选择赛季'})).toHaveValue('1950');
 await page.getByRole('combobox',{name:'选择赛季'}).selectOption('2020');await expect(page.locator('.circuit-card')).toHaveCount(17);
 await expect(page.locator('.circuit-card').filter({hasText:'银石'})).toHaveCount(2);
 await page.getByRole('tab',{name:'全部图鉴'}).click();await expect(page.locator('.atlas-card')).toHaveCount(78);
 await expect(page.locator('.atlas-card .atlas-current')).toHaveCount(23);
 await page.getByRole('textbox',{name:'搜索赛道'}).fill('纽北');await expect(page.locator('.atlas-card')).toHaveCount(1);await page.locator('.atlas-card').click();
 await expect(page.locator('.venue-heading h1')).toHaveText('纽博格林赛道');await expect(page.locator('.venue-history-list article')).toHaveCount(41);
 await expect(page.locator('.venue-history-list')).toContainText('22.835 km');
 await page.reload();await expect(page.locator('.venue-history-list article')).toHaveCount(41);
 await page.screenshot({path:info.outputPath('nurburgring-detail.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.getByRole('link',{name:'← 返回世界地图',exact:true}).click();
 await expect(page.getByRole('tab',{name:'全部图鉴'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('textbox',{name:'搜索赛道'})).toHaveValue('纽北');
 await page.getByRole('textbox',{name:'搜索赛道'}).fill('上海');await page.locator('.atlas-card').click();
 await expect(page.locator('.venue-heading h1')).toHaveText('上海国际赛车场');
 await page.getByRole('link',{name:'进入现有布局观赛 ↗',exact:true}).click();
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 expect(errors).toEqual([]);
});

test('all 77 year selections load, and atlas search handles aliases and empty results',async({page},info)=>{
 await page.goto('/');const select=page.getByRole('combobox',{name:'选择赛季'});
 for(let year=1950;year<=2026;year++){
  await select.selectOption(String(year));await expect(page.locator('.circuit-card').first()).toBeVisible();
  const rounds=await page.locator('.circuit-card').evaluateAll(ns=>ns.map(n=>Number(n.getAttribute('data-round'))));
  expect(rounds).toEqual(Array.from({length:rounds.length},(_,i)=>i+1));
 }
 await page.getByRole('tab',{name:'全部图鉴'}).click();
 await page.getByRole('textbox',{name:'搜索赛道'}).fill('nurburgring');await expect(page.locator('.atlas-card')).toHaveCount(1);
 await page.getByRole('textbox',{name:'搜索赛道'}).fill('无此地点');await expect(page.getByText('没有找到匹配的赛道。试试其他关键词。',{exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'搜索赛道'}).fill('');await expect(page.locator('.atlas-card')).toHaveCount(78);
 for(const width of info.project.name==='desktop'?[1440,2549,792]:[390,320]){
  await page.setViewportSize({width,height:960});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath(`atlas-home-${width}.png`)});
  await page.locator('#circuit-collection').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`atlas-collection-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 }
});

test('deeply zoomed nearby sites offer a usable chooser, dismissed outside and by Escape',async({page})=>{
 await page.goto('/');const surface=page.locator('.world-map');
 for(let i=0;i<6;i++){
  const cluster=page.locator('.world-cluster[data-members~=zeltweg]');
  if(await cluster.count())await cluster.click();else await page.getByRole('button',{name:'放大世界地图',exact:true}).click();
  if(await surface.getAttribute('data-zoom')==='24.000')break;
 }
 await expect(surface).toHaveAttribute('data-zoom','24.000');
 const cluster=page.locator('.world-cluster[data-members~=zeltweg]');
 await expect(cluster).toBeVisible();await cluster.click();
 const panel=page.getByRole('region',{name:'相邻赛道地点'});await expect(panel).toBeVisible();expect(await panel.getByRole('link').count()).toBeGreaterThan(1);
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
 await cluster.click();await expect(panel).toBeVisible();await page.getByRole('button',{name:'恢复世界地图',exact:true}).click();await expect(panel).toHaveCount(0);
});

test('unknown atlas record recovers and failed calendars report a reload action',async({page})=>{
 await page.goto('/#/atlas/not-a-real-venue');await expect(page.getByRole('heading',{name:'未收录此地点'})).toBeVisible();await page.getByRole('link',{name:'返回赛道图鉴'}).click();await expect(page.locator('.circuit-card')).toHaveCount(23);
 await page.route('**/calendars-*.js',route=>route.abort());await page.reload();await expect(page.getByRole('alert')).toContainText('赛历未能载入');
 await page.unroute('**/calendars-*.js');await page.getByRole('button',{name:'重新载入',exact:true}).click();await expect(page.locator('.circuit-card')).toHaveCount(23);
});
