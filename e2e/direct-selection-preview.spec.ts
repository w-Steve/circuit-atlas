import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('world point replaces duplicated selection UI and offers equal view/camera entry',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/map');
  await expect(page.locator('.mode-nav')).toHaveCount(0);
  await page.getByRole('button',{name:'B 看台 ↗',exact:true}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await expect(page.locator('.pick-surface')).toHaveCount(0);
  const point=page.getByRole('slider',{name:'B 看台选点',exact:true});
  await expect(point).toBeVisible();await expect(page.getByRole('button',{name:'进入此处视野 ↗'})).toBeVisible();
  await expect(page.getByRole('button',{name:'进入相机 ◎'})).toBeVisible();
  await page.screenshot({path:info.outputPath('direct-point.png')});
  await point.focus();await page.keyboard.press('ArrowRight');await expect(point).toHaveAttribute('aria-valuenow','52');
  await page.getByRole('button',{name:'进入相机 ◎'}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByRole('button',{name:'返回肉眼',exact:true}).click();
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();
  await expect(page).toHaveURL(/\/zones\/b\/phone$/);
  await page.goto('/#/circuits/shanghai/zones/a/select');
  await page.getByRole('button',{name:'上层',exact:true}).click();
  for(const viewport of [{width:792,height:871},{width:320,height:720}]){
    await page.setViewportSize(viewport);
    await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
    const exposed=await page.locator('.world-pick-point').evaluate(el=>{const r=el.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.world-pick-point')});
    expect(exposed).toBe(true);
    await page.screenshot({path:info.outputPath(`a-direct-point-${viewport.width}.png`)});
  }
});

test('live viewfinder actually integrates slow shutter and panning pixels',async({page},info)=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
  await page.goto('/#/circuits/shanghai/zones/f/eye');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
  await page.getByLabel('播放设置',{exact:true}).click();await page.getByRole('slider',{name:'演示速度'}).fill('340');await page.getByLabel('播放设置',{exact:true}).click();
  await page.getByRole('button',{name:'打开手机相机',exact:true}).click();await page.getByRole('button',{name:'3×',exact:true}).click();

  const records:Record<string,{edge:number;contrast:number;bg:number;red:number;frame:string}>={};
  for(const [name,shutter,pan] of [['slow','60','固定镜头'],['fast','4000','固定镜头'],['panning','60','理想跟拍']]){

    await page.getByLabel('快门速度',{exact:true}).selectOption(shutter);await page.getByRole('button',{name:pan,exact:true}).click();
    await page.getByRole('button',{name:'重置',exact:true}).click();await page.getByRole('button',{name:'播放赛车',exact:true}).click();
    records[name]=await page.locator('canvas').evaluate(async(canvas:HTMLCanvasElement)=>{
      await new Promise<void>(resolve=>{const ready=()=>{const t=Number(canvas.dataset.exposurePreviewTime);if(t>=3.65&&t<5)resolve();else requestAnimationFrame(ready)};requestAnimationFrame(ready)});
      const c=document.createElement('canvas');c.width=1600;c.height=1200;const ctx=c.getContext('2d')!;ctx.drawImage(canvas,0,0,1600,1200);
      const a=ctx.getImageData(0,0,1600,1200).data;let red=0,mass=0,edge=0,bg=0;
      for(let y=0;y<1200;y++)for(let x=1;x<1600;x++){
        const i=(y*1600+x)*4,j=i-4,r=Math.max(0,a[i]-Math.max(a[i+1],a[i+2])),p=Math.max(0,a[j]-Math.max(a[j+1],a[j+2]));
        red+=r*r;mass+=r;edge+=(r-p)**2;
        if(y>=160&&y<500)bg+=((a[i]+a[i+1]+a[i+2]-a[j]-a[j+1]-a[j+2])/3)**2;
      }
      return {red,contrast:red/Math.max(1,mass),edge:edge/Math.max(1,red),bg:bg/(340*1599),frame:c.toDataURL('image/png')};
    });
    await writeFile(info.outputPath('preview-'+name+'.png'),Buffer.from(records[name].frame.split(',')[1],'base64'));
    expect(records[name].red).toBeGreaterThan(10000);
  }
  expect(records.slow.contrast).toBeLessThan(records.fast.contrast*.85);
  expect(records.panning.contrast).toBeGreaterThan(records.slow.contrast*1.15);
  expect(records.panning.bg).toBeLessThan(records.slow.bg*.7);
  await page.getByRole('button',{name:'暂停赛车',exact:true}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-exposure-preview-samples','1');
  await writeFile(info.outputPath('preview-measurements.json'),JSON.stringify(Object.fromEntries(Object.entries(records).map(([k,{frame,...v}])=>[k,v])),null,2));
  expect(errors).toEqual([]);
});
