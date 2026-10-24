import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const ids=process.env.SPECTATOR_REGION==='americas'?['miami','montreal','austin','mexico','interlagos','las-vegas']:process.env.SPECTATOR_REGION==='asia'?['melbourne','suzuka','baku','sepang','singapore','lusail','yas-marina']:['monaco','barcelona','spielberg','silverstone','spa','hungaroring','zandvoort','monza','madrid'];
test('current calendar retains all regional circuit records',async({page},info)=>{
  await page.goto('/');
  await expect(page.locator('.circuit-card[data-region="a"]')).toHaveCount(9);
  await expect(page.locator('.circuit-card[data-region="b"]')).toHaveCount(8);
  await expect(page.locator('.circuit-card[data-region="c"]')).toHaveCount(6);
  await page.screenshot({path:info.outputPath('regions.png')});
});
for(const id of ids)test(`${id}: every modeled stand selects a real view and exports a photo`,async({page},info)=>{
  test.setTimeout(240000);page.setDefaultTimeout(10000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|Invalid|Unknown/.test(m.text()))errors.push(m.text())});
  const data=JSON.parse(readFileSync(new URL(`../src/circuits/generated/${id}.json`,import.meta.url),'utf8'));
  await page.goto(`/#/circuits/${id}/map`);
  const canvas=page.locator('canvas:visible');
  await expect(canvas).toHaveAttribute('data-map-ready',id);
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.screenshot({path:info.outputPath('map.png')});
  await canvas.evaluate(c=>c.dataset.persist='same-canvas');
  const views:{zone:string;position:number[];distance:string}[]=[];
  for(const zone of data.spectatorZones.filter((z:any)=>z.availability==='available')){
    await page.evaluate(hash=>{location.hash=hash},`#/circuits/${id}/zones/${zone.zoneId}/select`);
    await expect(page.locator('.selection h2')).toHaveText(zone.name);
    const point=page.locator('.world-pick-point');
    await expect(point).toBeVisible();
    const before=await point.getAttribute('data-u');
    if(zone===data.spectatorZones.filter((z:any)=>z.availability==='available')[0]){
      await expect(canvas).toHaveAttribute('data-camera-ready','true');
      const r=(await point.boundingBox())!,start={x:r.x+r.width/2,y:r.y+r.height/2},end={x:start.x+5,y:start.y};
      if(info.project.name==='mobile'){
        const touch=await page.context().newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});
        await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
      }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up()}
      await expect(point).not.toHaveAttribute('data-u',before!);
      await page.screenshot({path:info.outputPath('selection.png')});
    }
    const beforeKeyboard=await point.getAttribute('data-u');
    await point.focus();await page.keyboard.press('ArrowRight');
    expect(await point.getAttribute('data-u')).not.toBe(beforeKeyboard);
    await page.getByRole('button',{name:'进入此处视野 ↗'}).click();
    await expect(canvas).toHaveAttribute('data-camera-ready','true');
    await expect(canvas).toHaveAttribute('data-persist','same-canvas');
    const distance=await page.getByTestId('car-distance').innerText();
    expect(parseFloat(distance)).toBeGreaterThan(0);
    expect(distance).not.toContain('NaN');
    views.push({zone:zone.zoneId,position:JSON.parse((await canvas.getAttribute('data-observer-position'))!),distance});
  }
  expect(new Set(views.map(v=>JSON.stringify(v.position))).size).toBe(data.spectatorZones.filter((z:any)=>z.availability==='available').length);
  writeFileSync(info.outputPath('views.json'),JSON.stringify(views,null,2));
  await page.screenshot({path:info.outputPath('last-stand-eye.png')});
  await page.getByRole('button',{name:'播放赛车经过',exact:true}).click();
  await page.evaluate(async()=>{await new Promise<void>(resolve=>{const tick=()=>{if(Number(document.querySelector('canvas')?.dataset.simulationSeconds)>=6.27)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});(document.querySelector('.play-main') as HTMLButtonElement).click()});
  const position=await page.getByTestId('car-position').textContent();
  await page.getByRole('button',{name:'打开手机相机'}).click();
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'3×',exact:true}).click();
  await page.getByRole('combobox',{name:'快门速度'}).selectOption('60');
  await page.getByRole('button',{name:'理想跟拍',exact:true}).click();
  await page.screenshot({path:info.outputPath('camera.png')});
  await page.getByRole('button',{name:'拍照',exact:true}).click();
  const photo=page.getByRole('dialog',{name:'照片预览'});
  await expect(photo).toBeVisible({timeout:30000});
  const metadata=JSON.parse((await photo.locator('img').getAttribute('data-exposure'))!);
  expect(metadata.shutter).toBe(60);expect(metadata.pan).toBe('tracking');expect(metadata.velocity).toBe(0);
  const download=page.waitForEvent('download');await photo.getByRole('link',{name:'保存 PNG ↓'}).click();
  const file=await download;expect(file.suggestedFilename()).toMatch(new RegExp(`^${id}-`));
  await file.saveAs(info.outputPath(file.suggestedFilename()));
  await photo.getByRole('button',{name:'关闭预览'}).click();
  expect(await page.getByTestId('car-position').textContent()).toBe(position);
  await page.getByRole('button',{name:'返回肉眼'}).click();
  await page.getByRole('button',{name:'赛道总览'}).click();
  await expect(page.locator('.zone-preview')).toBeVisible();
  await page.reload();await expect(canvas).toHaveAttribute('data-map-ready',id);
  expect(errors).toEqual([]);
});
