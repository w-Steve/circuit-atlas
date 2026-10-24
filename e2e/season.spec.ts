import {returnToWorld} from './navigation-helpers';
import {europeanCircuits} from '../src/circuits/regions';
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const summaries = JSON.parse(readFileSync(new URL('../src/circuits/generated/summaries.json',import.meta.url),'utf8')) as {circuitId:string;cornerCount:number;mapAvailability:string}[];
test('independent circuit maps load on demand and retain real interaction',async({page},info)=>{
  page.setDefaultTimeout(15000);
  const loaded:string[]=[];page.on('request',r=>loaded.push(r.url()));
  await page.goto('/');
  await expect(page.locator('.circuit-card')).toHaveCount(23);
  const paths=await page.locator('.card-outline path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
  expect(new Set(paths).size).toBe(23);
  expect(loaded.some(url=>/\/suzuka-[^/]+\.js/.test(url))).toBe(false);
  await page.screenshot({path:info.outputPath('season-catalog.png'),fullPage:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const {circuitId:id,cornerCount} of summaries.filter(c=>c.mapAvailability==='available'&&c.circuitId!=='shanghai')){
    await page.goto(`/#/circuits/${id}/map`);
    await expect(page.locator('canvas')).toHaveAttribute('data-map-ready',id);
    await expect(page.locator('.corner-label')).toHaveCount(cornerCount);
    await expect(page.locator('.corner-label:visible').first()).toBeVisible();
    await page.screenshot({path:info.outputPath(`${id}.png`)});
    const box=(await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.width*.5,box.height*.5);
    await page.mouse.down();await page.mouse.move(box.width*.6,box.height*.65,{steps:8});await page.mouse.up();
    await page.getByRole('button',{name:'恢复鸟瞰角度'}).click();
    await page.getByRole('button',{name:'ⓘ 地图说明'}).click();
    if(JSON.parse(readFileSync(new URL(`../src/circuits/generated/${id}.json`,import.meta.url),'utf8')).simulationAvailability==='available'){await expect(page.getByText('地图与精度',{exact:true})).toBeVisible();await expect(page.locator('.zone-preview')).toBeVisible();}
    else await expect(page.getByText('当前仅提供地图浏览，没有可用的观赛区域。')).toBeVisible();
    if(id==='spa'){
      await page.getByRole('button',{name:'高度配色 · 5m 等高线',exact:true}).click();
      await expect(page.getByRole('button',{name:'显示高度配色'})).toHaveAttribute('aria-pressed','false');
      await page.screenshot({path:info.outputPath('spa-enhanced.png')});
    }
  }
  await page.goto('/#/circuits/madrid/map');
  await expect(page.locator('canvas')).toHaveAttribute('data-map-ready','madrid');
  await expect(page.locator('.corner-label')).toHaveCount(22);
  expect(errors).toEqual([]);
});
test('one failed circuit package has a recoverable page without breaking the catalog',async({page})=>{
  await page.route('**/suzuka-*.js',r=>r.abort());
  await page.goto('/#/circuits/suzuka/map');
  await expect(page.getByRole('heading',{name:'赛道数据未能载入'})).toBeVisible();
  await page.getByRole('link',{name:'返回赛道集合',exact:true}).click();
  await expect(page.locator('.circuit-card')).toHaveCount(23);
  await page.getByRole('link',{name:/ROUND 03/}).click();
  await expect(page.getByRole('heading',{name:'赛道数据未能载入'})).toBeVisible();
});
test('fresh catalog entry resets map orbit and context loss offers recovery',async({page})=>{
  await page.goto('/#/circuits/spa/map');
  const canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-map-ready','spa');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const initial=await canvas.getAttribute('data-map-view');
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.width*.45,box.height*.45);await page.mouse.down();await page.mouse.move(box.width*.65,box.height*.6,{steps:12});await page.mouse.up();
  await page.waitForTimeout(600);
  const changed=await canvas.getAttribute('data-map-view');expect(changed).not.toBe(initial);
  await returnToWorld(page);
  await page.locator('.circuit-card').filter({hasText:'斯帕－弗朗科尔尚赛道'}).click();
  await expect(canvas).toHaveAttribute('data-map-ready','spa');
  await expect(canvas).toHaveAttribute('data-camera-ready','true');
  const restored=JSON.parse((await canvas.getAttribute('data-map-view'))!);
  const previous=JSON.parse(initial!);
  restored.position.forEach((n:number,i:number)=>expect(n).toBeCloseTo(previous.position[i],0));
  await canvas.evaluate(c=>{
    const gl=(c as HTMLCanvasElement).getContext('webgl2');
    gl!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.getByRole('heading',{name:'地图画面已中断'})).toBeVisible();
  await expect(page.getByRole('button',{name:'重新加载地图'})).toBeEnabled();
});
