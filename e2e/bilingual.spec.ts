import {test,expect} from '@playwright/test';
for(const device of [{name:'computer',width:1440,height:960,touch:false},{name:'tablet',width:1024,height:768,touch:true},{name:'phone',width:390,height:844,touch:true}]){
 test(`${device.name}: language switch, English viewing and camera, retained locale`,async({browser},info)=>{
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch,isMobile:device.name==='phone'}),page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:4173/');await page.getByRole('button',{name:'选择语言',exact:true}).click();await page.getByRole('menuitemradio',{name:'English',exact:true}).click();
   await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.catalog-brand')).toHaveText('Circuit Atlas');
   await expect(page.locator('.world-destination')).toContainText('Shanghai');
   await page.screenshot({path:info.outputPath(`${device.name}-english-home.png`)});
   const homeText=await page.locator('.catalog-shell').evaluate(e=>{const clone=e.cloneNode(true) as HTMLElement;clone.querySelector('.language-switch')?.remove();return clone.textContent});
   expect(homeText).not.toMatch(/[\u4e00-\u9fff]/);
   await page.getByRole('textbox',{name:'Search circuits',exact:true}).fill('Shanghai');await page.locator('.circuit-card').click();
   const canvas=page.locator('canvas:visible');await expect(canvas).toHaveAttribute('data-camera-ready','true');
   await page.getByRole('button',{name:'Choose a viewpoint ↗',exact:true}).click();await page.locator('.zone-list').getByRole('button',{name:'Grandstand B ↗',exact:true}).click();
   await expect(canvas).toHaveAttribute('data-camera-ready','true');await page.screenshot({path:info.outputPath(`${device.name}-english-selection.png`)});
   await page.getByRole('button',{name:'Open camera ◎',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
   await expect(page.getByRole('combobox',{name:'Shutter speed',exact:true})).toBeVisible();
   await page.getByRole('combobox',{name:'Shutter speed',exact:true}).selectOption('250');await page.getByRole('button',{name:'Ideal panning',exact:true}).click();await expect(page.getByRole('button',{name:'Ideal panning',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(page.getByRole('button',{name:'Ideal panning',exact:true})).toHaveCSS('background-color','rgb(238, 233, 223)');
   await expect(page.getByRole('button',{name:'Ideal panning',exact:true})).toHaveCSS('color','rgb(24, 32, 27)');
   for(const viewport of device.name==='computer'?[{width:1440,height:960},{width:2549,height:1352},{width:1200,height:760}]:[{width:device.width,height:device.height}]){
   await page.setViewportSize(viewport);
   const parameterLayout=await page.locator('.camera-bar').evaluate(bar=>{
    const r=bar.getBoundingClientRect();return [...bar.querySelectorAll('button')].every(button=>{
     const b=button.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom;
    });
   });expect(parameterLayout).toBe(true);
   }
   await page.setViewportSize({width:device.width,height:device.height});
   if(device.name==='phone')for(const viewport of [{width:320,height:720},{width:900,height:430}]){
    await page.setViewportSize(viewport);await expect(page.getByRole('button',{name:'Ideal panning',exact:true})).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'Take photo',exact:true})).toBeInViewport({ratio:1});
    await page.screenshot({path:info.outputPath(`english-camera-${viewport.width}.png`)});
   }
   await page.setViewportSize({width:device.width,height:device.height});
   await page.screenshot({path:info.outputPath(`${device.name}-english-camera.png`)});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
   await page.getByRole('button',{name:'Take photo',exact:true}).click();await expect(page.getByRole('dialog',{name:'Photo preview'})).toBeVisible();
   await expect(page.getByRole('link',{name:'Save PNG ↓',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close preview',exact:true}).click();
   await page.getByRole('button',{name:'Back to viewing',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-ready','true');
   for(const button of await page.locator('.view-tools button').all())await expect(button).toBeInViewport({ratio:1});
   await page.getByText('Measurements',{exact:true}).click();await expect(page.getByText('Pit building · Front center',{exact:true})).toBeVisible();await page.getByText('Measurements',{exact:true}).click();
   await page.screenshot({path:info.outputPath(`${device.name}-english-eye.png`)});
   await page.getByRole('link',{name:'Circuit profile: layout, history and statistics',exact:true}).click();await expect(page.locator('.venue-heading h1')).toHaveText('Shanghai International Circuit');
   expect(await page.locator('.venue-story').innerText()).not.toMatch(/[\u4e00-\u9fff]/);
   await page.goto('http://127.0.0.1:4173/');await expect(page.locator('html')).toHaveAttribute('lang','en');
   await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');await page.getByRole('button',{name:'Choose language',exact:true}).click();await page.getByRole('menuitemradio',{name:'简体中文',exact:true}).click();
   await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}
