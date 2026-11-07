import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import source from '../src/circuits/elevation-source/regional-grids/monza-tinitaly.json';
import coverage from '../src/circuits/elevation-source/coverage.json';
import {loadCircuit} from '../src/circuits/registry';
import {terrainHeight} from '../src/circuits/elevation';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {useLanguage} from '../src/i18n';
import {sourceSummary} from '../src/i18n/data';

it('Monza retains a complete native 10m Float32 source and attribution rather than image-derived heights',()=>{
 const raw=Buffer.from(source.nativeWindow.float32Base64,'base64'),n=source.nativeWindow;
 expect(n).toMatchObject({epsg:32632,size:[163,267],pixelMetres:10,pixelIsArea:true,rowOrder:'north-to-south',dtype:'float32-le'});
 expect(source).toMatchObject({dataset:'TINITALY',version:'1.1',license:'CC-BY-4.0',units:'metres',valueScaleApplied:1});
 expect(raw.length).toBe(163*267*4);expect(createHash('sha256').update(raw).digest('hex')).toBe(n.float32Sha256);
 for(let i=0;i<raw.length;i+=4){const value=raw.readFloatLE(i);expect(value).toBeGreaterThan(160);expect(value).toBeLessThan(210)}
 expect(n.bbox[2]-n.bbox[0]).toBe(163*10);expect(n.bbox[3]-n.bbox[1]).toBe(267*10);
});

it('pixel-centre and row-order controls reproduce native metric values with no vertical scaling',()=>{
 const raw=Buffer.from(source.nativeWindow.float32Base64,'base64'),width=source.nativeWindow.size[0];
 const h=(x:number,y:number)=>raw.readFloatLE((y*width+x)*4);
 for(const c of source.projectionControls){
  const [px,py]=c.nativePixelCentreIndex,[x,y]=[Math.floor(px),Math.floor(py)],u=px-x,v=py-y;
  expect(px).toBeCloseTo((c.utm32[0]-source.nativeWindow.bbox[0])/10-.5,8);expect(py).toBeCloseTo((source.nativeWindow.bbox[3]-c.utm32[1])/10-.5,8);
  const native=(h(x,y)*(1-u)+h(x+1,y)*u)*(1-v)+(h(x,y+1)*(1-u)+h(x+1,y+1)*u)*v;
  const [col,row]=c.gridIndex;expect(Math.abs(source.grid.heights[row*257+col]-native)).toBeLessThan(.00051);
 }
});

it('runtime uses the independently sourced grid while retaining the previous dataset baseline',async()=>{
 const d=await loadCircuit('monza'),row=coverage.find(c=>c.circuitId==='monza')!;
 const raw=readFileSync(new URL('../src/circuits/elevation-source/regional-grids/monza-tinitaly.json',import.meta.url));
 expect(row).toMatchObject({dataset:'TINITALY-1.1',sampleCount:66049,runtimeApplied:true,gedtmBaseline:{sampleCount:4225}});
 expect(row.responseSha256[0]).toBe(createHash('sha256').update(raw).digest('hex'));expect(d.elevation.grid).toEqual(source.grid);
 expect(d.elevation.status).toBe('partial');expect(d.elevation.grid!.referenceAltitude).toBe(Math.min(...d.elevation.grid!.heights));
 const [w,s,e,n]=source.grid.bounds,g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 expect(g.length).toBeCloseTo(5793,3);expect(terrainHeight(d.elevation,w,s)).toBeCloseTo(source.grid.heights[0]-source.grid.referenceAltitude,7);
 expect(terrainHeight(d.elevation,e,n)).toBeCloseTo(source.grid.heights.at(-1)!-source.grid.referenceAltitude,7);
});

it('English accuracy information describes the actual regional source rather than claiming a flat datum',()=>{
 const previous=useLanguage.getState().language;useLanguage.getState().setLanguage('en');
 try{const text=sourceSummary('TINITALY 1.1 / INGV 10m区域裸地高程','elevation');expect(text).toContain('native 10m');expect(text).toContain('not a 2026');expect(text).not.toContain('horizontal datum');expect(text).not.toMatch(/[\u4e00-\u9fff]/)}
 finally{useLanguage.getState().setLanguage(previous)}
});
