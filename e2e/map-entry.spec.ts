import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const venues=JSON.parse(readFileSync(new URL('../src/atlas/venues.json',import.meta.url),'utf8')) as {id:string;modelId:string|null}[];

for(const id of ['shanghai','suzuka'])test(`${id}: world re-entry resets overview, viewing return preserves it, terrain has a neutral surround`,async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`/#/circuits/${id}/map`);const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const read=async()=>JSON.parse((await canvas.getAttribute('data-map-view'))!);
 const initial=await read(),box=(await canvas.boundingBox())!;
 const rgb=await canvas.evaluate((c:HTMLCanvasElement)=>{const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d')!;ctx.drawImage(c,0,0);return [...ctx.getImageData(2,2,1,1).data].slice(0,3)});
 expect(rgb[2],'Map surround must be cool neutral, not the lit green fallback ground').toBeGreaterThan(rgb[1]);
 expect(rgb[0]).toBeLessThan(45);
 // Exercise actual orbit controls, not an injected camera transform.
 await page.mouse.move(box.x+box.width*.25,box.y+box.height*.4);await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width*.4,box.y+box.height*.48,{steps:12});await page.mouse.up({button:'right'});await page.mouse.wheel(0,-130);
 await expect.poll(async()=>JSON.stringify((await read()).position)).not.toBe(JSON.stringify(initial.position));
 // OrbitControls damps after pointer release. Record the settled pose, not a
 // point partway through inertia that continues while the picker opens.
 await expect.poll(async()=>{const p=(await read()).position;await page.waitForTimeout(150);const q=(await read()).position;return Math.hypot(...p.map((v:number,i:number)=>v-q[i]))}).toBeLessThan(.001);
 const moved=await read();
 await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.locator('.zone-list button').first().click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:/^(赛道总览|返回地图)$/}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect.poll(async()=>{const p=(await read()).position;return Math.hypot(...p.map((v:number,i:number)=>v-moved.position[i]))}).toBeLessThan(.05);
 await page.getByRole('button',{name:'返回世界地图',exact:true}).click();const world=page.locator('.world-map');await expect(world).toBeVisible();
 const venue=venues.find(v=>v.modelId===id)!,pin=page.locator(`.world-pin[data-venue="${venue.id}"]`);
 for(let i=0;i<7&&!await pin.isVisible();i++)await page.locator(`.world-cluster[data-members~="${venue.id}"]`).click();
 const zoom=await world.getAttribute('data-zoom'),pan=await world.getAttribute('data-pan');
 await pin.click();await expect(page).toHaveURL(new RegExp(`${id}/map$`));await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect.poll(async()=>{const p=(await read()).position;return Math.hypot(...p.map((v:number,i:number)=>v-initial.position[i]))}).toBeLessThan(.05);
 await page.screenshot({path:info.outputPath(`${id}-neutral-surround-fresh-entry.png`)});
 await page.getByRole('button',{name:'返回世界地图',exact:true}).click();await expect(world).toHaveAttribute('data-zoom',zoom!);await expect(world).toHaveAttribute('data-pan',pan!);
});
