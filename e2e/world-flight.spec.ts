import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const venues=JSON.parse(readFileSync(new URL('../src/atlas/venues.json',import.meta.url),'utf8')) as {id:string;modelId:string|null;coordinate:number[]}[];
const shanghai=venues.find(v=>v.id==='shanghai')!;

test('red geographic lock follows the map and cloud arrival preserves the return view',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');const card=page.locator('.world-destination'),world=page.locator('.world-map');
 await card.focus();const lock=page.locator('.world-locator');await expect(lock).toHaveAttribute('data-venue','shanghai');
 await expect(page.locator('.world-coordinate')).toContainText(`${shanghai.coordinate[1].toFixed(4)}° N`);
 await expect(page.locator('.world-coordinate')).toContainText(`${shanghai.coordinate[0].toFixed(4)}° E`);
 const cross=lock.locator('.locator-cross'),position=()=>cross.evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.m41,y:m.m42}});
 await expect.poll(()=>lock.evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
 const {x,y}=await position();
 await world.focus();await page.keyboard.press('ArrowRight');
 await expect.poll(async()=>(await position()).x).toBeCloseTo(x-60,1);
 expect((await position()).y).toBeCloseTo(y,1);
 await card.focus();
 const zoom=await world.getAttribute('data-zoom'),pan=await world.getAttribute('data-pan');
 await expect.poll(()=>lock.evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
 const worldBox=(await world.boundingBox())!,labelBox=(await page.locator('.world-coordinate').boundingBox())!,pointX=worldBox.x+(await position()).x;
 expect(pointX<labelBox.x||pointX>labelBox.x+labelBox.width,'coordinate panel must not cover the locked point').toBe(true);
 await page.screenshot({path:info.outputPath('red-coordinate-lock.png')});
 if(info.project.name==='desktop')await card.click();else await card.tap();
 await expect(page.locator('.world-flight')).toBeVisible();
 await expect(page.locator('.world-flight')).toHaveAttribute('data-phase','clouds');
 await page.screenshot({path:info.outputPath('cloud-arrival.png')});
 await expect(page).toHaveURL(/shanghai\/map$/);await expect(page.locator('.world-flight')).toHaveCount(0);
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.screenshot({path:info.outputPath('arrived.png')});
 await page.getByRole('button',{name:'返回世界地图',exact:true}).click();
 await expect(world).toHaveAttribute('data-zoom',zoom!);await expect(world).toHaveAttribute('data-pan',pan!);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);
});

test('English circuit pin locks its own coordinate and reaches its own 3D model',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'选择语言',exact:true}).click();await page.getByRole('menuitemradio',{name:'English',exact:true}).click();
 const venue=venues.find(v=>v.modelId==='suzuka')!,pin=page.locator(`.world-pin[data-venue="${venue.id}"]`);
 for(let i=0;i<6&&!(await pin.isVisible());i++)await page.locator(`.world-cluster[data-members~="${venue.id}"]`).click();
 await pin.focus();await expect(page.locator('.world-locator')).toHaveAttribute('data-venue',venue.id);
 await expect(page.locator('.world-coordinate')).toContainText(`${venue.coordinate[1].toFixed(4)}° N`);
 await pin.click();await expect(page.getByRole('button',{name:'Skip animation Esc'})).toBeVisible();
 await expect(page).toHaveURL(/suzuka\/map$/);await expect(page.locator('.world-flight')).toHaveCount(0);
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-map-ready','suzuka');
 await page.screenshot({path:info.outputPath('english-suzuka-arrival.png')});
});

test('browser Back cancels arrival and a scene error remains reachable',async({page})=>{
 await page.goto('/#/circuits');await page.locator('.world-destination').click();
 await expect(page).toHaveURL(/shanghai\/map$/);await page.goBack();
 await expect(page.locator('.world-flight')).toHaveCount(0);await expect(page.locator('.world-map')).toBeVisible();
 // A fresh context isn't required: reloading clears React's successfully loaded
 // lazy module, then deliberately fail its next request.
 await page.route('**/assets/ShanghaiExperience-*.js',route=>route.abort());
 await page.reload();await page.locator('.world-destination').click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('.world-flight')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'重新加载场景',exact:true})).toBeVisible();
});

test('reduced motion bypasses flight and Escape skips without delayed navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('.world-destination').click();await expect(page).toHaveURL(/shanghai\/map$/);await expect(page.locator('.world-flight')).toHaveCount(0);
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'返回世界地图',exact:true}).click();await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.world-destination').click();await expect(page.locator('.world-flight')).toBeVisible();await page.keyboard.press('Escape');
 await expect(page.locator('.world-flight')).toHaveCount(0);await expect(page).toHaveURL(/shanghai\/map$/);
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'返回世界地图',exact:true}).click();await page.waitForTimeout(900);
 await expect(page.locator('.world-map')).toBeVisible();await expect(page.locator('.world-flight')).toHaveCount(0);
});
