import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('src/circuits/europe/monaco-standing-world.json','utf8'));
test('Monaco Z deep-link respects reviewed availability',async({page})=>{
 test.skip(process.env.MONACO_STANDING_REVIEW==='1','Candidate preview intentionally bypasses availability');
 await page.goto('/#/circuits/monaco/zones/z-quai-kennedy/phone');
 if(source.zones[0].availability==='available'){
  await expect(page.locator('canvas:visible')).toHaveAttribute('data-camera-ready','true');return;
 }
 await expect(page.getByRole('heading',{name:'此观赛区域暂未开放',exact:true})).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(0);await expect(page).toHaveURL(/z-quai-kennedy\/phone$/);
});
test('Monaco Z handle dragging stays separate from map navigation',async({page},info)=>{
 test.fixme(source.zones[0].availability!=='available','Ground must be reviewed before testing the normal entry');
 await page.goto('/#/circuits/monaco/zones/z-quai-kennedy/select');const canvas=page.locator('canvas:visible'),point=page.locator('.world-pick-point');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const before=[await point.getAttribute('data-u'),await point.getAttribute('data-v')].join(','),view=await canvas.getAttribute('data-selection-map-view'),box=(await point.boundingBox())!,start={x:box.x+box.width/2,y:box.y+box.height/2};
 if(info.project.name==='desktop'){
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+14,start.y-5,{steps:8});await page.mouse.up();
 }else{
  const c=await page.context().newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
  for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+14*i/8,y:start.y-5*i/8,id:1}]});
  await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
 }
 await expect.poll(async()=>[await point.getAttribute('data-u'),await point.getAttribute('data-v')].join(',')).not.toBe(before);expect(await canvas.getAttribute('data-selection-map-view')).toBe(view);
 await page.screenshot({path:info.outputPath('dragged-ground.png')});
});
test('Monaco Z: continuous standing ground, real pass and photograph',async({page},info)=>{
 test.fixme(source.zones[0].availability!=='available'&&process.env.MONACO_STANDING_REVIEW!=='1','Explicit local candidate review only');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/circuits/monaco/zones/z-quai-kennedy/select');const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const point=page.locator('.world-pick-point'),u=await point.getAttribute('data-u');await point.press('ArrowRight');await expect(point).not.toHaveAttribute('data-u',u!);await point.press('ArrowLeft');
 await page.screenshot({path:info.outputPath('selection.png')});await page.getByRole('button',{name:'进入此处视野 ↗',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
 await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
 await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')!.dataset.exposurePreviewTime)>=6.3)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='暂停赛车')!.click()});
 await page.getByRole('button',{name:'拍照',exact:true}).click();const photo=page.getByRole('img',{name:'赛道模拟照片',exact:true});await expect(photo).toBeVisible();
 const meta=JSON.parse((await photo.getAttribute('data-exposure'))!);expect(meta.observerPosture).toBe('standing');expect(meta.eyeHeightMetres).toBeCloseTo(1.65,1);
 const red=await photo.evaluate((img:HTMLImageElement)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]>90&&a[i]>a[i+1]*1.3&&a[i]>a[i+2]*1.3)n++;return n});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓',exact:true}).click();await(await download).saveAs(info.outputPath('pass.png'));await page.screenshot({path:info.outputPath('photo.png')});
 expect(red,'Default partial-car visual regression, not every viewpoint visibility').toBeGreaterThan(100);expect(errors).toEqual([]);
});
