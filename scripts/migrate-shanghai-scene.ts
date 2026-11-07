import {writeFileSync,mkdirSync} from 'node:fs';
import {facilities as f,local,along,foundationAltitude} from '../src/data/config';
import * as g from '../src/systems/CircuitGeometry';
import raw from '../src/circuits/generated/shanghai.json';
import {shanghaiFoundations} from '../src/circuits/shanghai/terrain';
const geo=(x:number,z:number)=>[g.origin[0]+x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-z/(111320*g.calibration)] as [number,number];
const boxes:any[]=[],cylinders:any[]=[];
const box=(x:number,y:number,z:number,size:number[],color='#b5c0c3')=>boxes.push({position:local(x,y,z),rotation:Math.atan2(-along.z,along.x),size,color});
box(0,f.stand.roofHeight,f.stand.roofOffset,[390,1.2,f.stand.roofDepth],'#b5c4c8');box(0,16,82,[380,32,2],'#65767d');
for(let i=0;i<10;i++)box(-180+i*40,16,79,[1.1,32,1.1]);
box(0,.15,-22,[480,.2,13],'#5b686c');box(0,.65,-12,[450,1.3,.6]);box(0,f.pit.height/2,f.pit.offset,[f.pit.length,f.pit.height,f.pit.width],'#c2cbc9');box(0,16,-40,[355,2,30],'#53636b');
for(let i=0;i<33;i++){box(-160+i*10,3,-29.9,[8,5.5,.18],'#293941');box(-160+i*10,6.4,-29.7,[8,.5,.2],i%3===0?'#c74b40':'#95a5a6')}
for(let i=0;i<22;i++)box(-150+i*8,.24,i%2===0?-3.5:3.5,[3.5,.02,.15],'#eeeeeb');
for(let i=0;i<49;i++)box(-240+i*10,f.fence.height/2,f.fence.offset,[.12,f.fence.height,.12],'#26342f');
for(let i=0;i<f.tyres.count*f.tyres.layers;i++)cylinders.push({position:local(f.tyres.start+Math.floor(i/f.tyres.layers)*f.tyres.spacing,.3+(i%f.tyres.layers)*f.tyres.layerStep,f.tyres.offset),radius:f.tyres.radius,height:f.tyres.thickness,color:'#20282b'});
const source={url:'https://english.shanghai.gov.cn/en-SportsEvents/20260311/933bcc13c7c44363a04a036b4888a7de.html',checkedAt:'2026-10-24',method:'estimated',confidence:'low',notes:'Original Gate 0–5 authored metric facilities and A tier dimensions migrated without scale changes. Not a measured seating survey.'};
const a=raw.spectatorZones[0];
const surfaces=[['lower',32,18,3,10],['upper',55,23,17,15]].map(([tier,offset,depth,base,rise]:any)=>{
 const ring=[[-190,offset],[190,offset],[190,offset+depth],[-190,offset+depth],[-190,offset]].map(([x,z])=>{const p=local(x,0,z);return geo(p[0],p[2])});
 const front=local(0,0,0);return {surfaceId:`a-${tier}`,boundary:ring,baseHeight:foundationAltitude+base,rise,eyeHeight:1.2,rows:0,visualRows:14,viewTargetFrame:{origin:local(0,4,0),along:[along.x,along.z],length:380},tier,absoluteBase:true,fenceMode:"authored",rowDirection:[along.x,along.z],frontReference:geo(front[0],front[2])};
});
const scene={landmarks:[{label:'P 房 / PIT',measurementLabel:'P 房 · 建筑前沿中心',role:'pit',position:local(0,3,f.pit.offset+f.pit.width/2),labelPosition:local(0,23,-65)}],foundations:shanghaiFoundations,boxes,cylinders,wireMeshes:[{origin:local(0,0,0),along:[along.x,along.z],normal:[along.z,-along.x],start:-240,end:240,offset:13,height:3.5}],source,regions:[{zoneId:'a',tier:'lower',label:'下层',selectionLabel:'下层看台选点',surfaceId:'a-lower',uRange:[0,1],vRange:[0,1]},{zoneId:'a',tier:'upper',label:'上层',selectionLabel:'上层看台选点',surfaceId:'a-upper',uRange:[0,1],vRange:[0,1]},{zoneId:'a',tier:'platinum',label:'铂金区域',selectionLabel:'铂金区域选点',surfaceId:'a-upper',uRange:[.35,.65],vRange:[.32,.68]}]};
mkdirSync('src/circuits/scenes',{recursive:true});writeFileSync('src/circuits/scenes/shanghai.json',JSON.stringify({scene,spectatorZones:[{...a,surfaces,supportToTerrain:false,mapLabelPosition:local(0,40,80),passRangeMetres:[g.length-620,g.length+100]}] }));
