import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import source from '../src/circuits/elevation-source/regional-grids/suzuka-gsi.json';
import coverage from '../src/circuits/elevation-source/coverage.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {terrainHeight} from '../src/circuits/elevation';

const raw=inflateSync(Buffer.from(source.nativeWindow.float32ZlibBase64,'base64'));
const width=source.nativeWindow.size[0],height=source.nativeWindow.size[1];
const h=(x:number,y:number)=>raw.readFloatLE((y*width+x)*4);

it('retains complete signed-metric GSI samples, explicit fallback provenance and source credits',()=>{
 expect(source).toMatchObject({dataset:'GSI-DEM',license:'PDL-1.0',units:'metres',encodingScaleMetres:.01});
 expect(source.tiles.filter(t=>t.layer==='dem5a_png')).toHaveLength(9);expect(source.tiles.filter(t=>t.layer==='dem_png')).toHaveLength(4);
 expect(raw.length).toBe(598*385*4);expect(createHash('sha256').update(raw).digest('hex')).toBe(source.nativeWindow.float32Sha256);
 let minimum=Infinity,maximum=-Infinity;for(let i=0;i<raw.length;i+=4){const value=raw.readFloatLE(i);expect(Number.isFinite(value)).toBe(true);minimum=Math.min(minimum,value);maximum=Math.max(maximum,value)}
 expect(minimum).toBeCloseTo(6.98,3);expect(maximum).toBeCloseTo(75.41,3);
 const mask=inflateSync(Buffer.from(source.nativeWindow.fallbackMaskZlibBase64,'base64'));let bits=0;
 for(const b of mask)for(let i=0;i<8;i++)bits+=(b>>i)&1;
 expect(bits).toBe(2785);expect(source.outputFallbackContributedSamples).toBe(1437);expect(source.grid.resolutionMetres).toBe(10);
 for(const c of source.pngControls){const [r,g,b]=c.rgb;expect(Math.abs(h(...c.nativeIndex as [number,number])-(65536*r+256*g+b)/100)).toBeLessThan(.00001)}
});

it('Web-Mercator pixel centres and geographic row order reproduce the reviewed GSI grid',async()=>{
 for(const c of source.projectionControls){
  const [lon,lat]=c.coordinate,scale=2**15*256,[x0,y0]=source.nativeWindow.pixelOrigin;
  const px=(lon+180)/360*scale-.5-x0,py=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*scale-.5-y0;
  expect(px).toBeCloseTo(c.nativePixelCentreIndex[0],6);expect(py).toBeCloseTo(c.nativePixelCentreIndex[1],6);
  const x=Math.floor(px),y=Math.floor(py),u=px-x,v=py-y;
  const native=(h(x,y)*(1-u)+h(x+1,y)*u)*(1-v)+(h(x,y+1)*(1-u)+h(x+1,y+1)*u)*v;
  expect(Math.abs(source.grid.heights[c.gridIndex[1]*321+c.gridIndex[0]]-native)).toBeLessThan(.00051);
 }
 const d=await loadCircuit('suzuka'),row=coverage.find(c=>c.circuitId==='suzuka')!;
 expect(d.elevation.grid).toEqual(source.grid);expect(d.elevation.attribution).toEqual(source.attribution);expect(row.dataset).toBe('GSI-DEM5A-10B');
 const bytes=readFileSync(new URL('../src/circuits/elevation-source/regional-grids/suzuka-gsi.json',import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.responseSha256[0]);
});

it('earth-bank profiles follow independent ground anchors, retain eyes and remain invariant to a datum offset',async()=>{
 const d=await loadCircuit('suzuka'),a=createCircuitContext(d),b=createCircuitContext({...d,elevation:{...d.elevation,grid:{...d.elevation.grid!,heights:d.elevation.grid!.heights.map(v=>v+20)}}});
 for(const bank of a.spectators.zoneSurfaces.get('g')!){
  const f=bank.definition.groundReference!.coordinate,r=bank.definition.terrainRiseReference!.coordinate;
  expect(bank.definition.baseHeight).toBeCloseTo(terrainHeight(d.elevation,...f)+.1,8);
  expect(bank.definition.rise).toBeCloseTo(terrainHeight(d.elevation,...r)-terrainHeight(d.elevation,...f),8);
  expect(bank.definition.eyeHeight).toBe(1.2);const shifted=b.spectators.zoneSurfaces.get('g')!.find(s=>s.definition.surfaceId===bank.definition.surfaceId)!;
  expect(shifted.definition.rise).toBeCloseTo(bank.definition.rise,8);expect(shifted.definition.baseHeight-bank.definition.baseHeight).toBeCloseTo(20,8);
 }
});
