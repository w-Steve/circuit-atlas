import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('Suzuka GSI terrain stays at true scale with stable map controls and processed-source credit',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/suzuka/map');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-terrain-samples','103041');
 await expect(page.getByRole('link',{name:'国土地理院地形（加工）',exact:true})).toHaveAttribute('href','https://maps.gsi.go.jp/development/ichiran.html');
 const toggle=page.locator('.terrain-toggle');await expect(canvas).toHaveAttribute('data-terrain-colored','true');
 await toggle.click();await expect(canvas).toHaveAttribute('data-terrain-colored','false');await toggle.click();await expect(canvas).toHaveAttribute('data-terrain-colored','true');
 await page.screenshot({path:info.outputPath('suzuka-gsi-overview.png')});
 const sample=await canvas.evaluate(async el=>{const c=el as HTMLCanvasElement,times:number[]=[];let previous=performance.now();await new Promise<void>(resolve=>{const frame=()=>{const now=performance.now();times.push(now-previous);previous=now;if(times.length===120)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});return {frames:times.length,meanFrameMs:times.reduce((a,b)=>a+b,0)/times.length,p95FrameMs:[...times].sort((a,b)=>a-b)[Math.floor(times.length*.95)],renderFps:c.dataset.renderFps,sceneDrawCalls:c.dataset.sceneDrawCalls}});
 await writeFile(info.outputPath('map-performance.json'),JSON.stringify(sample,null,2));
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.getByTestId('zone-option-g').click();
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-terrain-colored','false');await expect(page.locator('.world-pick-point')).toBeInViewport();
 await page.screenshot({path:info.outputPath('suzuka-gsi-selected-g.png')});expect(errors).toEqual([]);
 const credit=await page.request.get('/licenses/GSI-PDL-1.0.txt');expect(credit.ok()).toBe(true);expect(await credit.text()).toContain('Geospatial Information Authority of Japan');
});

test('English Suzuka archive explains mixed GSI resolution without a flat-terrain fallback',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/atlas/suzuka');const about=page.locator('.venue-about');await about.locator('summary').click();
 await expect(about.getByText(/Processed GSI elevation tiles/)).toBeVisible();await expect(about).toContainText('native 5m');await expect(about).toContainText('10m');
 await expect(about.getByRole('link',{name:'Terrain source ↗',exact:true})).toHaveAttribute('href','https://maps.gsi.go.jp/development/ichiran.html');
 await expect(about).not.toContainText('a horizontal datum is used');await page.screenshot({path:info.outputPath('suzuka-english-source.png')});
});

test('Monza regional terrain renders at true scale in overview and viewpoint selection',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/monza/map');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-terrain-samples','66049');
 const toggle=page.locator('.terrain-toggle');await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(canvas).toHaveAttribute('data-terrain-colored','true');
 await toggle.click();await expect(canvas).toHaveAttribute('data-terrain-colored','false');
 await toggle.click();await expect(canvas).toHaveAttribute('data-terrain-colored','true');
 await page.screenshot({path:info.outputPath('monza-regional-topography.png')});
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.getByTestId('zone-option-prato-prima-variante').click();
 await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-terrain-colored','false');
 await expect(page.locator('.world-pick-point')).toBeInViewport();await expect(canvas).toHaveAttribute('data-terrain-samples','66049');
 await page.screenshot({path:info.outputPath('monza-regional-selected-ground.png')});expect(errors).toEqual([]);
});

test('English archive identifies the regional elevation source and its limits',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/atlas/monza');const about=page.locator('.venue-about');await about.locator('summary').click();
 await expect(about.getByText(/Regional TINITALY 1.1 \/ INGV/)).toBeVisible();
 await expect(about.getByRole('link',{name:'Terrain source ↗',exact:true})).toHaveAttribute('href','https://doi.org/10.13127/tinitaly/1.1');
 await expect(about).not.toContainText('a horizontal datum is used');await page.screenshot({path:info.outputPath('monza-english-source.png')});
});
