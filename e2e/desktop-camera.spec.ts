import {test,expect} from '@playwright/test';
test('desktop camera scales controls and aligns them with the frame without overlap',async({page},info)=>{
  await page.goto('/#/circuits/shanghai/zones/a/phone');
  for(const size of [{width:2549,height:1352},{width:1920,height:1080},{width:1440,height:960},{width:1280,height:800}]){
    await page.setViewportSize(size);await expect(page.locator('canvas')).toHaveAttribute('data-camera-ready','true');
    const controls=['.camera-bar','.capture-row','.phone-playback','.zoom-presets'];
    for(const selector of controls)await expect(page.locator(selector)).toBeInViewport();
    const result=await page.evaluate(()=>{
      const rect=(s:string)=>document.querySelector(s)!.getBoundingClientRect();
      const bar=rect('.camera-bar'),capture=rect('.capture-row'),play=rect('.phone-playback'),frame=rect('.world');
      const overlap=(a:DOMRect,b:DOMRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      return {overlap:overlap(bar,capture)||overlap(capture,play)||overlap(bar,frame)||overlap(capture,frame),aligned:Math.abs(bar.left-capture.left)<2&&Math.abs(bar.left-play.left)<2,font:parseFloat(getComputedStyle(document.querySelector('.camera-bar select')!).fontSize),shutter:rect('.shutter').width};
    });
    expect(result.overlap).toBe(false);expect(result.aligned).toBe(true);expect(result.font).toBeGreaterThanOrEqual(14);expect(result.shutter).toBeGreaterThanOrEqual(96);
    await page.screenshot({path:info.outputPath(`camera-${size.width}.png`)});
  }
});
