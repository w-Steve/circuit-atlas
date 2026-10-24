import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PerspectiveCamera,Vector3} from 'three';
import {createCircuitGeometry} from '../src/circuits/geometry';
import type {CircuitPackage} from '../src/circuits/types';
const summaries=JSON.parse(readFileSync(new URL('../src/circuits/generated/summaries.json',import.meta.url),'utf8')) as {circuitId:string}[];
for(const {circuitId:id} of summaries)test(`${id}: sourced timing lines and three sectors are interactive in the actual map`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`/#/circuits/${id}/map`);
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');await expect(canvas).toHaveAttribute('data-timing-marks',/.+/);
 const marks=JSON.parse((await canvas.getAttribute('data-timing-marks'))!);expect(marks.splits).toHaveLength(2);expect(marks.start).toBeGreaterThanOrEqual(0);expect(marks.control).toBeGreaterThanOrEqual(0);
 const toggle=page.getByRole('button',{name:'显示计时分段',exact:true});await expect(toggle).toHaveAttribute('aria-pressed','true');
 for(const n of [1,2,3])await expect(toggle.getByText(`S${n}`,{exact:true})).toBeVisible();
 await expect(page.locator('[data-timing-mark]')).toHaveCount(['monaco','interlagos'].includes(id)?3:4);
 const palette=async()=>canvas.evaluate((c:HTMLCanvasElement)=>{const a=document.createElement('canvas');a.width=c.width;a.height=c.height;const ctx=a.getContext('2d')!;ctx.drawImage(c,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data,result=[0,0,0];for(let i=0;i<p.length;i+=4){const [r,g,b]=[p[i],p[i+1],p[i+2]];if(r>g*1.07&&g>b*1.15)result[0]++;if(g>r*1.1&&b>r*1.1&&g>=b&&g-b<10)result[1]++;if(r>g*1.2&&g>b*1.02)result[2]++}return result});
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const on=await palette();
 const collisions=await page.evaluate(()=>{
  const visible=(e:Element)=>getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0;
  const markers=Array.from(document.querySelectorAll('#scene-labels .marker')).filter(visible),tags=Array.from(document.querySelectorAll('[data-timing-mark]')).filter(visible);
  return tags.flatMap(tag=>markers.flatMap(marker=>{const a=tag.getBoundingClientRect(),b=marker.getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2?[`${tag.getAttribute('data-timing-mark')}/${marker.getAttribute('data-zone')??marker.textContent}`]:[]}));
 });expect(collisions,'Timing tags must not cover grandstand or pit labels').toEqual([]);
 if(id==='singapore'){
  const data=JSON.parse(readFileSync(new URL('../src/circuits/generated/singapore.json',import.meta.url),'utf8')) as CircuitPackage,g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
  const bounds=(await canvas.boundingBox())!,view=JSON.parse((await canvas.getAttribute('data-map-view'))!),camera=new PerspectiveCamera(50,bounds.width/bounds.height,5,60000);camera.position.fromArray(view.position);camera.lookAt(new Vector3().fromArray(view.target));camera.updateMatrixWorld(true);
  for(const distance of [3075,3120,3175]){
   const p=g.at(distance).add(new Vector3(0,.22,0)).project(camera);expect(Math.abs(p.x)).toBeLessThan(.95);expect(Math.abs(p.y)).toBeLessThan(.95);
   const color=await canvas.evaluate((c:HTMLCanvasElement,p)=>{const a=document.createElement('canvas');a.width=c.width;a.height=c.height;const ctx=a.getContext('2d')!;ctx.drawImage(c,0,0);return [...ctx.getImageData(Math.round((p.x+1)*c.width/2),Math.round((1-p.y)*c.height/2),1,1).data].slice(0,3)},{x:p.x,y:p.y});
   expect(color[2]>color[1]*1.07&&color[2]>color[0]*1.2,`Bridge at ${distance} must show road, not blue reservoir: ${color}`).toBe(false);
  }
 }
 await page.screenshot({path:info.outputPath(`${id}-timing-map.png`)});
 await toggle.click();await expect(canvas).toHaveAttribute('data-timing-sectors-visible','false');await expect(page.locator('[data-timing-mark]')).toHaveCount(0);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const off=await palette();
 for(let i=0;i<3;i++)expect(on[i]-off[i],`Sector ${i+1} must change actual rendered pixels (${on} -> ${off}), not only the legend`).toBeGreaterThan(15);
 await toggle.click();await expect(canvas).toHaveAttribute('data-timing-sectors-visible','true');expect(errors).toEqual([]);
});
test('history footer keeps source credits without a venue-count label',async({page},info)=>{
 await page.goto('/#/atlas/adelaide');const footer=page.locator('.catalog-footer');await footer.scrollIntoViewIfNeeded();await expect(footer).not.toContainText('78');await expect(footer).toContainText('CC BY 4.0');await page.screenshot({path:info.outputPath('history-footer.png')});
});
test('English timing controls disclose the prior-season reference rather than claiming current verification',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('circuit-atlas-language','en'));
 await page.goto('/#/circuits/yas-marina/map');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await expect(page.getByRole('button',{name:'Show timing sectors',exact:true})).toBeVisible();
 expect((await page.locator('.timing-tag').allTextContents()).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
 await page.locator('.venue-info-link').click();await page.locator('.venue-about summary').click();await expect(page.locator('.venue-source-content')).toContainText('2025');await expect(page.getByRole('link',{name:'FIA timing reference ↗',exact:true})).toBeVisible();
});
