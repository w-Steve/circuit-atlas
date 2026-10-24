import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('world-to-Suzuka flight records frame times through actual WebGL readiness',async({page},info)=>{
 await page.goto('/');
 const pin=page.locator('.world-pin[data-venue="suzuka"]');
 for(let i=0;i<6&&!(await pin.isVisible());i++)await page.locator('.world-cluster[data-members~="suzuka"]').click();
 await pin.focus();
 await page.evaluate(()=>{
  const w=window as typeof window&{motion:any};
  const state=w.motion={frames:[] as {ms:number;phase:string}[],tasks:[] as number[],running:true};let last=performance.now();
  const observer=new PerformanceObserver(list=>state.tasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({entryTypes:['longtask']});state.stop=()=>observer.disconnect();
  const frame=(now:number)=>{if(!state.running)return;state.frames.push({ms:now-last,phase:document.querySelector('.world-flight')?.getAttribute('data-phase')??'outside'});last=now;requestAnimationFrame(frame)};
  requestAnimationFrame(frame);
 });
 await pin.click();await expect(page.locator('.world-flight')).toBeVisible();await expect(page).toHaveURL(/suzuka\/map$/);
 await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');await expect(page.locator('.world-flight')).toHaveCount(0);
 const result=await page.evaluate(()=>{
  const s=(window as any).motion;s.running=false;s.stop();
  const frames=s.frames.filter((f:any)=>f.phase!=='outside'),sorted=frames.map((f:any)=>f.ms).sort((a:number,b:number)=>a-b);
  return {samples:frames.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),longTasks:s.tasks,frames};
 });
 expect(result.samples).toBeGreaterThan(4);
 const file=info.outputPath('flight-frame-times.json');await writeFile(file,JSON.stringify({device:info.project.name,...result},null,2));
 await info.attach('flight-frame-times.json',{path:file,contentType:'application/json'});
});

test('switching stands retains the canvas and moves continuously from its current pose',async({page},info)=>{
 await page.goto('/#/circuits/shanghai/zones/b/select');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await canvas.evaluate(e=>e.setAttribute('data-same-canvas','yes'));
 const start=JSON.parse((await canvas.getAttribute('data-map-view'))!).position;
 await page.evaluate(()=>{
  const w=window as any;w.standMotion=[];w.watchStandMotion=true;
  const frame=()=>{if(!w.watchStandMotion)return;const view=document.querySelector('canvas')?.getAttribute('data-rendered-camera');if(view)w.standMotion.push(JSON.parse(view).position);requestAnimationFrame(frame)};
  requestAnimationFrame(frame);location.hash='#/circuits/shanghai/zones/k/select';
 });
 await expect(canvas).toHaveAttribute('data-same-canvas','yes');await expect(canvas).toHaveAttribute('data-camera-ready','false');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const finish=JSON.parse((await canvas.getAttribute('data-map-view'))!).position;
 const distance=Math.hypot(...finish.map((p:number,i:number)=>p-start[i]));expect(distance).toBeGreaterThan(100);
 const frames:number[][]=await page.evaluate(()=>{const w=window as any;w.watchStandMotion=false;return w.standMotion});
 const moving=frames.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-frames[i][j]))).filter(d=>d>.01);
 expect(moving.length).toBeGreaterThan(5);expect(Math.max(...moving)/distance).toBeLessThan(.2);
 await expect(canvas).toHaveAttribute('data-selection-framing',/.+/);
 await page.screenshot({path:info.outputPath('switched-stand.png')});
});
