import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('Pro shutter and ideal panning change real exported photographs with live simulation preserved',async({page},info)=>{
  test.setTimeout(120000);page.setDefaultTimeout(15000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#/circuits/shanghai/zones/f/eye');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByLabel('播放设置',{exact:true}).click();
  await page.getByRole('slider',{name:'演示速度'}).fill('340');
  await page.getByLabel('播放设置',{exact:true}).click();
  await page.getByRole('button',{name:'打开手机相机'}).click();
  await page.getByRole('button',{name:'3×',exact:true}).click();

  await expect(page.getByLabel('快门速度',{exact:true})).toHaveValue('1000');
  await expect(page.getByLabel('快门速度',{exact:true}).locator('option')).toHaveCount(7);
  await page.screenshot({path:info.outputPath('pro-interface.png')});
  const records:Record<string,any>={};
  async function photograph(name:string,denominator:number,tracking:boolean,first=false){

    await page.getByLabel('快门速度',{exact:true}).selectOption(String(denominator));
    await page.getByRole('button',{name:tracking?'理想跟拍':'固定镜头',exact:true}).click();

    await page.getByRole('button',{name:'重置',exact:true}).click();
    await page.getByRole('button',{name:'播放赛车',exact:true}).click();
    await page.evaluate(async()=>{const canvas=document.querySelector('canvas')!;await new Promise<void>(resolve=>{const tick=()=>{const t=Number(canvas.dataset.exposurePreviewTime);if(t>=3.65&&t<5)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});(document.querySelector('button[aria-label=拍照]') as HTMLButtonElement).click()});
    const img=page.getByRole('img',{name:'上海赛车场模拟照片'});await expect(img).toBeVisible({timeout:30000});
    const metadata=JSON.parse((await img.getAttribute('data-exposure'))!);
    expect(metadata.velocity).toBeCloseTo(340/3.6,6);expect(metadata.shutter).toBe(denominator);
    expect(metadata.pan).toBe(tracking?'tracking':'fixed');expect(metadata.samples).toBeGreaterThan(1);
    const stats=await img.evaluate((image:HTMLImageElement)=>{
      const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
      const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,c.width,c.height).data,xs:number[]=[];
      for(let i=0;i<pixels.length;i+=4)if(pixels[i]>90&&pixels[i]>pixels[i+1]*1.3&&pixels[i]>pixels[i+2]*1.3)xs.push(i/4%c.width);
      xs.sort((a,b)=>a-b);
      let redPower=0,redMass=0,edgePower=0,backgroundPower=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
        const i=(y*c.width+x)*4,r=Math.max(0,pixels[i]-Math.max(pixels[i+1],pixels[i+2]));
        redPower+=r*r;redMass+=r;
        if(x){const j=i-4,prior=Math.max(0,pixels[j]-Math.max(pixels[j+1],pixels[j+2]));edgePower+=(r-prior)**2;
          if(y>=160&&y<500){const light=(pixels[i]+pixels[i+1]+pixels[i+2]-pixels[j]-pixels[j+1]-pixels[j+2])/3;backgroundPower+=light*light}}
      }
      return {contrast:redPower/Math.max(1,redMass),pixels:xs.length,width:xs[Math.floor(xs.length*.99)]-xs[Math.floor(xs.length*.01)],sharpness:edgePower/Math.max(1,redPower),backgroundSharpness:backgroundPower/(340*(c.width-1)),w:c.width,h:c.height};
    });
    expect(stats.w).toBe(1600);expect(stats.h).toBe(1200);expect(stats.pixels).toBeGreaterThan(100);
    const event=page.waitForEvent('download');await page.getByRole('link',{name:'保存 PNG ↓'}).click();
    const download=await event;expect(download.suggestedFilename()).toContain(`1-${denominator}`);await download.saveAs(info.outputPath(`${name}.png`));
    records[name]={...stats,...metadata};
    await writeFile(info.outputPath(name+'-measurements.json'),JSON.stringify(records[name],null,2));
    await test.info().attach(name+'-measurements',{body:JSON.stringify(records[name],null,2),contentType:'application/json'});
    await page.getByRole('button',{name:'关闭预览'}).click();
    // Accumulation never pauses or rewinds the live simulation.
    await expect(page.getByRole('button',{name:'暂停赛车',exact:true})).toBeVisible();
  }
  await photograph('fixed-slow',60,false,true);
  await photograph('fixed-fast',4000,false);
  await photograph('panning-slow',60,true);
  // Saturated-red bounding boxes can shrink when translucent trails cross a
  // threshold. Dense stationary foreground wire also adds sharp red cut edges.
  // Red contrast energy measures integration blur without counting those edges.
  expect(records['fixed-slow'].contrast).toBeLessThan(records['fixed-fast'].contrast*.85);
  expect(records['panning-slow'].contrast).toBeGreaterThan(records['fixed-slow'].contrast*1.15);
  expect(records['panning-slow'].backgroundSharpness).toBeLessThan(records['fixed-slow'].backgroundSharpness*.7);
  await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
  await page.getByRole('button',{name:'拍照',exact:true}).click();
  const staticImage=page.getByRole('img',{name:'上海赛车场模拟照片'});await expect(staticImage).toBeVisible();
  const paused=JSON.parse((await staticImage.getAttribute('data-exposure'))!);expect(paused.velocity).toBe(0);expect(paused.samples).toBe(1);
  const pausedUrl=await staticImage.getAttribute('src');
  await page.getByRole('button',{name:'关闭预览'}).click();
  await page.getByLabel('快门速度',{exact:true}).selectOption('4000');
  await page.getByRole('button',{name:'拍照',exact:true}).click();await expect(staticImage).toBeVisible();
  expect(await staticImage.getAttribute('src')).toBe(pausedUrl);
  await page.screenshot({path:info.outputPath('pro-result.png')});
  await test.info().attach('exposure-measurements',{body:JSON.stringify(records,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);
});
