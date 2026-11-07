import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {cutPublicGround} from '../src/circuits/publicGroundCut';

it('removes only duplicate coarse terrain inside a public footprint, preserving outside heights and attributes',async()=>{
 const d=structuredClone(await loadCircuit('suzuka')),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),sx=111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,sz=111320*g.calibration;
 const geo=(x:number,z:number):[number,number]=>[g.origin[0]+x/sx,g.origin[1]-z/sz];
 const z=structuredClone(d.spectatorZones[0]);z.zoneId='cut-fixture';z.kind='general-admission';z.availability='available';z.surfaces=[{surfaceId:'cut',boundary:[[3,3],[7,3],[7,7],[3,7],[3,3]].map(p=>geo(...p as [number,number])),baseHeight:0,rise:0,eyeHeight:1.2,rows:0,terrainFollow:true}];d.spectatorZones=[z];
 const vertices=[0,0,0,10,10,0,10,30,10,0,20,10],colors=[0,0,0,1,0,0,1,1,0,0,1,0],uvs=[0,0,1,0,1,1,0,1],original=vertices.slice();
 const result=cutPublicGround(d,g,vertices,[0,1,2,0,2,3],colors,uvs);let area=0;
 for(let i=0;i<result.length;i+=3){const [a,b,c]=result.slice(i,i+3).map(j=>vertices.slice(j*3,j*3+3));area+=Math.abs((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))/2}
 expect(area).toBeCloseTo(84,6);expect(vertices.slice(0,12)).toEqual(original);
 for(let i=0;i<vertices.length/3;i++){const [x,y,z]=vertices.slice(i*3,i*3+3);expect(y).toBeCloseTo(x+2*z,7);expect(colors[i*3]).toBeCloseTo(x/10,7);expect(colors[i*3+1]).toBeCloseTo(z/10,7);expect(uvs[i*2]).toBeCloseTo(x/10,7);expect(uvs[i*2+1]).toBeCloseTo(z/10,7)}
 // Withheld candidates never remove visible terrain or expose an empty hole.
 d.spectatorZones[0].availability='preparing';const indices=[0,1,2,0,2,3];expect(cutPublicGround(d,g,[],indices,[],[])).toBe(indices);
});
