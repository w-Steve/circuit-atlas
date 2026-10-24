import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const summaries=JSON.parse(readFileSync(new URL('../src/circuits/generated/summaries.json',import.meta.url),'utf8')) as {circuitId:string;spectatorZoneIds:string[]}[];
const cases=[...['a','b','c'].map(zone=>({id:'shanghai',zone})),...['suzuka','spa','monaco'].map(id=>({id,zone:summaries.find(c=>c.circuitId===id)!.spectatorZoneIds[0]}))];
for(const {id,zone} of cases)test(`${id}/${zone}: selection faces the seats with track behind camera`,async({page},info)=>{
 await page.goto(`/#/circuits/${id}/zones/${zone}/select`);
 const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const facing=JSON.parse((await canvas.getAttribute('data-selection-facing'))!);
 const view=JSON.parse((await canvas.getAttribute('data-map-view'))!);
 const dx=view.position[0]-facing.center[0],dz=view.position[2]-facing.center[2];
 const alignment=(dx*facing.towardTrack[0]+dz*facing.towardTrack[2])/Math.hypot(dx,dz);
 expect(alignment).toBeGreaterThan(.999);
 facing.center.forEach((value:number,i:number)=>expect(view.target[i]).toBeCloseTo(value,3));
 await expect(page.locator('.world-pick-point')).toBeVisible();
 await page.screenshot({path:info.outputPath('track-behind-selection.png')});
});
