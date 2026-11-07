import {test,expect} from '@playwright/test';
test('moving keyboard focus to the viewpoint slider cancels an already held pan key',async({page})=>{
 await page.goto('/#/circuits/shanghai/zones/a/select');const canvas=page.locator('canvas:visible');
 await expect(canvas).toHaveAttribute('data-camera-ready','true');
 const read=async()=>JSON.parse((await canvas.getAttribute('data-map-view'))!).target as number[];
 await expect.poll(async()=>{const a=await read();await page.waitForTimeout(100);const b=await read();return Math.hypot(...a.map((v,i)=>v-b[i]))}).toBeLessThan(.01);
 await page.locator('.experience-header a').first().focus();const before=await read();
 await page.keyboard.down('KeyD');
 try{
  await expect.poll(async()=>{const a=await read();return Math.hypot(...a.map((v,i)=>v-before[i]))}).toBeGreaterThan(1);
  const slider=page.locator('.world-pick-point');await slider.focus();await expect(slider).toBeFocused();
  await page.waitForTimeout(200);const focused=await read();await page.waitForTimeout(350);const after=await read();
  expect(Math.hypot(...focused.map((v,i)=>v-after[i])),'A held map key must stop when the viewpoint control receives focus').toBeLessThan(.01);
 }finally{await page.keyboard.up('KeyD')}
 const slider=page.locator('.world-pick-point'),prior=await slider.getAttribute('data-u');await page.keyboard.press('ArrowRight');await expect(slider).not.toHaveAttribute('data-u',prior!);
 await page.locator('.experience-header a').first().focus();const resumed=await read();await page.keyboard.down('KeyD');
 try{await expect.poll(async()=>{const a=await read();return Math.hypot(...a.map((v,i)=>v-resumed[i]))}).toBeGreaterThan(1)}finally{await page.keyboard.up('KeyD')}
});
