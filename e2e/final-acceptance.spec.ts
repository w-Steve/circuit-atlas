import {returnToWorld} from './navigation-helpers';
import {test,expect} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
let server:ChildProcess,base='';
test.beforeAll(async()=>{
  server=spawn(process.execPath,['scripts/serve-static.mjs','dist','/apex/'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  base=await new Promise<string>((resolve,reject)=>{
    server.stdout!.once('data',d=>resolve(d.toString().trim()));server.once('error',reject);server.once('exit',code=>{if(code)reject(Error('Static server exited '+code))});
  });
});
test.afterAll(()=>server?.kill());
test('production subpath: catalog to B Pro photo, grass, another map and responsive deep-link refresh',async({page},info)=>{
  test.setTimeout(90000);page.setDefaultTimeout(15000);
  const errors:string[]=[],failed:string[]=[],origins=new Set<string>(),fonts:{url:string;status:number}[]=[];
  page.on('response',r=>{if(/\.(ttf|woff2?)(\?|$)/.test(r.url()))fonts.push({url:r.url(),status:r.status()})});
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));page.on('request',r=>{if(r.url().startsWith('http'))origins.add(new URL(r.url()).origin)});
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.fonts.check('600 24px "Barlow Condensed"'))).toBe(true);
  expect(fonts.some(f=>f.status===200&&f.url.startsWith(base))).toBe(true);
  const notice=await page.request.get(base+'licenses/THIRD_PARTY_NOTICES.txt');expect(notice.status()).toBe(200);expect(await notice.text()).toContain('three@');
  await page.locator('#circuit-collection').scrollIntoViewIfNeeded();await expect(page.locator('.circuit-card')).toHaveCount(23);expect(page.url()).not.toContain('#circuit-collection');
  await page.getByRole('link',{name:/ROUND 02/}).click();
  await expect(page.getByRole('button',{name:'B 看台 ↗',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
  await page.locator('.zone-list').getByRole('button',{name:'B 看台 ↗',exact:true}).click();
  const pick=page.getByRole('slider',{name:'B 看台选点',exact:true});await pick.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  const box=(await pick.boundingBox())!,prior=await pick.getAttribute('data-u');
  const x=box.x+box.width/2,y=box.y+box.height/2;
  if(info.project.name==='mobile'){
    const touch=await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+5,y,id:1}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+5,y,{steps:3});await page.mouse.up()}
  await expect(pick).not.toHaveAttribute('data-u',prior!);
  await page.getByRole('button',{name:'进入此处视野 ↗'}).click();await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByLabel('播放设置',{exact:true}).click();await page.getByRole('slider',{name:'演示速度'}).fill('340');await page.getByLabel('播放设置',{exact:true}).click();
  await page.getByRole('button',{name:'播放赛车经过',exact:true}).click();await page.waitForTimeout(1000);
  await expect(page.getByTestId('car-distance')).not.toHaveText('0.0m');
  await page.getByRole('button',{name:'打开手机相机'}).click();await page.getByRole('button',{name:'2×',exact:true}).click();
  await page.getByLabel('快门速度',{exact:true}).selectOption('125');
  await page.getByRole('button',{name:'理想跟拍',exact:true}).click();
  await page.getByRole('button',{name:'重置',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();await page.waitForTimeout(3650);
  await page.getByRole('button',{name:'拍照',exact:true}).click();
  const image=page.getByRole('img',{name:'上海赛车场模拟照片'});await expect(image).toBeVisible();
  const meta=JSON.parse((await image.getAttribute('data-exposure'))!);expect(meta.shutter).toBe(125);expect(meta.zoneId).toBe('b');
  const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();await (await event).saveAs(info.outputPath('b-pro-photo.png'));
  await page.getByRole('button',{name:'关闭预览'}).click();await page.getByRole('button',{name:'返回肉眼',exact:true}).click();await page.getByRole('button',{name:'赛道总览',exact:true}).click();
  await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();await page.locator('.zone-list').getByRole('button',{name:'F 草地 ↗',exact:true}).click();
  const grass=page.getByRole('slider',{name:'F 草地选点',exact:true});await grass.focus();await page.keyboard.press('ArrowDown');
  await page.getByRole('button',{name:'进入此处视野 ↗'}).click();await page.getByRole('button',{name:'播放赛车经过',exact:true}).click();
  await page.getByRole('button',{name:'打开手机相机'}).click();await expect(page.getByLabel('快门速度',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'重置',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();await page.waitForTimeout(3650);
  await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(image).toBeVisible();expect(JSON.parse((await image.getAttribute('data-exposure'))!).zoneId).toBe('f');
  const grassDownload=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();await (await grassDownload).saveAs(info.outputPath('grass-pro-photo.png'));
  await page.getByRole('button',{name:'关闭预览'}).click();await page.getByRole('button',{name:'返回肉眼',exact:true}).click();await returnToWorld(page);
  await page.getByRole('link',{name:/ROUND 03/}).click();await expect(page.locator('canvas:visible')).toHaveAttribute('data-map-ready','suzuka');
  if(info.project.name==='mobile'){
    const map=page.locator('canvas:visible'),r=(await map.boundingBox())!,before=await map.getAttribute('data-map-view'),touch=await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.width*.4,y:r.height*.5,id:1},{x:r.width*.6,y:r.height*.5,id:2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.width*.3,y:r.height*.45,id:1},{x:r.width*.7,y:r.height*.55,id:2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    await expect.poll(()=>map.getAttribute('data-map-view')).not.toBe(before);
  }
  for(const viewport of [{width:900,height:430},{width:320,height:720},{width:1440,height:900}]){
    await page.setViewportSize(viewport);await expect(page.locator('.experience-title')).toContainText('铃鹿赛道');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.reload();await expect(page.locator('canvas:visible')).toHaveAttribute('data-map-ready','suzuka');
  expect(origins).toEqual(new Set([new URL(base).origin]));expect(failed).toEqual([]);expect(errors).toEqual([]);
  await page.screenshot({path:info.outputPath('subpath-map.png')});
  await page.goto(base+'#/circuits/shanghai/zones/not-an-area/eye');await expect(page.getByRole('heading',{name:'找不到此赛道页面'})).toBeVisible();
});
test('an interrupted Pro exposure cancels cleanly and restores the deep-linked scene',async({page})=>{
  await page.goto(base+'#/circuits/shanghai/zones/f/phone');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'3×',exact:true}).click();
  await page.getByLabel('快门速度',{exact:true}).selectOption('60');
  await page.getByRole('button',{name:'播放赛车',exact:true}).click();await page.waitForTimeout(6100);
  await page.getByRole('button',{name:'拍照',exact:true}).click();
  await page.locator('canvas').evaluate(c=>{const gl=(c as HTMLCanvasElement).getContext('webgl2');gl!.getExtension('WEBGL_lose_context')!.loseContext()});
  await expect(page.getByRole('heading',{name:'WebGL 画面已中断'})).toBeVisible();
  await page.getByRole('button',{name:'重新加载场景'}).click();
  await expect(page.getByRole('button',{name:'拍照',exact:true})).toBeEnabled();await expect(page.locator('.experience-title')).toContainText('F 草地');
});
test('render performance, retained navigation and landscape camera',async({page},info)=>{
  test.setTimeout(45000);
  const measuredViewport=page.viewportSize();
  await page.goto(base+'#/circuits/shanghai/zones/b/eye');const canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.waitForTimeout(2200);
  const start=Number(await canvas.getAttribute('data-render-frames')),time=Date.now();await page.waitForTimeout(2000);
  const fps=(Number(await canvas.getAttribute('data-render-frames'))-start)*1000/(Date.now()-time);
  expect(fps).toBeGreaterThan(20);
  const beforeRatio=await canvas.evaluate(c=>c.width/c.getBoundingClientRect().width);
  await returnToWorld(page);await page.waitForTimeout(1000);await page.getByRole('link',{name:/ROUND 02/}).click();
  await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.waitForTimeout(2200);
  const afterRatio=await canvas.evaluate(c=>c.width/c.getBoundingClientRect().width);
  expect(afterRatio).toBeGreaterThanOrEqual(beforeRatio-.05);
  await page.getByRole('button',{name:'B 看台 ↗',exact:true}).click();await page.getByRole('button',{name:'进入相机 ◎',exact:true}).click();await page.setViewportSize({width:900,height:430});
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await expect(page.getByRole('button',{name:'拍照',exact:true})).toBeInViewport();
  await expect(page.getByRole('button',{name:'理想跟拍',exact:true})).toBeInViewport();await page.screenshot({path:info.outputPath('landscape-pro.png')});
  await writeFile(info.outputPath('performance.json'),JSON.stringify({renderCallbacksPerSecond:fps,beforeRatio,afterRatio,device:info.project.name,browser:'Edge/Chromium',measuredViewport,landscapeViewport:page.viewportSize()},null,2));
});
