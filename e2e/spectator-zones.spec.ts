import { test,expect } from "@playwright/test";
const zones=[['b','B 看台'],['e','E 看台'],['h','H 看台'],['k','K 看台'],['c','C 草地'],['f','F 草地'],['j','J 草地']];
test('every Shanghai public area supports continuous selection, local physical pass and real camera export',async({page},info)=>{
  test.setTimeout(150000);
  page.setDefaultTimeout(10000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#/circuits/shanghai/map');
  await expect(page.getByRole('button',{name:'B 看台 ↗',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('all-zones-map.png')});
  const positions:string[]=[];
  for(const [id,name] of zones){
    await page.getByRole('button',{name:'选择观察位置 ↗',exact:true}).click();
    await page.locator('.zone-list').getByRole('button',{name:`${name} ↗`,exact:true}).click();
    await expect(page).toHaveURL(new RegExp(`/zones/${id}/select$`));
    const picker=page.getByRole('slider',{name:`${name}选点`,exact:true});
    await picker.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');
    await expect(picker).toHaveAttribute('aria-valuenow','52');
    await expect(page.locator("canvas")).toHaveAttribute("data-camera-ready","true");
    const prior=await picker.getAttribute("data-u");
    const r=(await picker.boundingBox())!;
    const start={x:r.x+r.width/2,y:r.y+r.height/2},end={x:start.x+5,y:start.y};
    if(info.project.name==='mobile'){
      const touch=await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    } else {
      await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up();
    }
    await expect(picker).not.toHaveAttribute('data-u',prior!);
    await page.getByRole('button',{name:'进入此处视野 ↗'}).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
    await page.getByLabel('播放设置',{exact:true}).click();
    await page.getByRole('slider',{name:'演示速度'}).fill('340');
    await page.getByLabel('播放设置',{exact:true}).click();
    await page.getByRole('button',{name:'播放赛车经过',exact:true}).click();
    await page.evaluate(async()=>{await new Promise<void>(resolve=>{const ready=()=>{if(Number(document.querySelector('canvas')?.dataset.simulationSeconds)>=3.68)resolve();else requestAnimationFrame(ready)};requestAnimationFrame(ready)});(document.querySelector('.play-main') as HTMLButtonElement).click()});
    positions.push((await page.getByTestId('car-position').textContent())!);
    await page.screenshot({path:info.outputPath(`${id}-eye.png`)});
    await page.getByRole('button',{name:'打开手机相机'}).click();
    await page.getByRole('button',{name:'1×',exact:true}).click();
    await page.locator('.phone-settings > summary').click();
    await expect(page.locator('.frame-stats')).toContainText('画面内');
    await page.locator('.phone-settings > summary').click();
    await page.getByRole('button',{name:'3×',exact:true}).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
    await page.getByRole('button',{name:'拍照',exact:true}).click();
    const image=page.getByRole('img',{name:'上海赛车场模拟照片'});
    await expect(image).toBeVisible();
    expect(await image.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1600);
    const download=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();
    await (await download).saveAs(info.outputPath(`${id}-photo.png`));
    await page.getByRole('button',{name:'关闭预览'}).click();
    await page.getByRole('button',{name:'返回肉眼',exact:true}).click();
    await page.getByRole('button',{name:'赛道总览',exact:true}).click();
  }
  expect(new Set(positions).size).toBe(7);
  expect(errors).toEqual([]);
});
test('A platinum and deep linked grass retain their own selection state',async({page})=>{
  await page.goto('/#/circuits/shanghai/zones/a/select');
  await page.getByRole('button',{name:'铂金区域',exact:true}).click();
  await page.getByRole('button',{name:'进入此处视野 ↗'}).click();
  await expect(page.locator('.experience-title')).toContainText('铂金区域');
  await page.goto('/#/circuits/shanghai/zones/f/phone');
  await expect(page.locator('.experience-title')).toContainText('F 草地');
  await expect(page.getByRole('button',{name:'拍照',exact:true})).toBeVisible();
  await page.reload();await expect(page.locator('.experience-title')).toContainText('F 草地');
});
