import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const circuits=JSON.parse(readFileSync(new URL('../src/circuits/generated/summaries.json',import.meta.url),'utf8')) as {circuitId:string}[];
for(const {circuitId} of circuits)test(`${circuitId}: official runtime map renders and navigation fits`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/#/circuits/${circuitId}/map`);const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.locator('.back-link')).toBeInViewport({ratio:1});await expect(page.locator('.venue-info-link')).toBeInViewport({ratio:1});
 for(const button of await page.locator('.map-tools>button').all())await expect(button).toBeInViewport({ratio:1});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 const changedPixels=await canvas.evaluate(async(c:HTMLCanvasElement)=>{
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  const out=document.createElement('canvas');out.width=96;out.height=64;const ctx=out.getContext('2d')!;ctx.drawImage(c,0,0,96,64);
  const p=ctx.getImageData(0,0,96,64).data;let count=0;
  for(let i=4;i<p.length;i+=4)if(Math.abs(p[i]-p[0])+Math.abs(p[i+1]-p[1])+Math.abs(p[i+2]-p[2])>20)count++;
  return count;
 });
 expect(changedPixels,'A ready flag alone must not certify a blank canvas').toBeGreaterThan(50);
 if(['shanghai','spa','singapore'].includes(circuitId))await page.screenshot({path:info.outputPath('map.png')});
 expect(errors).toEqual([]);
});
