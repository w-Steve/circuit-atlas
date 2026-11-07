import {it,expect} from 'vitest';
import {Box3,PerspectiveCamera,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {selectionFraming,selectionEnvelopeProjection} from '../src/camera/selectionFraming';

// Full-registry integration check: keep every vertex/aspect assertion, with an explicit total CPU budget.
it('frames the full extent of every available shared zone in portrait, tablet, desktop and short landscape',async()=>{
 for(const c of circuitRegistry.filter(c=>c.circuitId!=='shanghai')){
  const d=await loadCircuit(c.circuitId),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=createSpectators(terrainSpectatorZones(d),g);
  for(const z of m.spectatorZones){
   const points:Vector3[]=[];
   for(const s of m.zoneSurfaces.get(z.zoneId)!){
    // Check every rendered vertex, including interior dune heights, rather than
    // assuming that all selectable areas are flat-bottomed grandstands.
    const mesh=m.surfaceGeometry(s),vertices=mesh.getAttribute('position');
    for(let i=0;i<vertices.count;i++){const p=new Vector3().fromBufferAttribute(vertices,i);points.push(p,p.clone().add(new Vector3(0,s.definition.eyeHeight,0)))}mesh.dispose();
   }
   const bounds=new Box3().setFromPoints(points),direction=m.facingTarget(z.zoneId,.5,.5).sub(m.zonePoint(z.zoneId,.5,.5));
   for(const [width,height] of [[390,844],[1024,768],[1440,960],[844,390]]){
    const fit=selectionFraming(bounds,direction,width,height),camera=new PerspectiveCamera(50,width/height,1,60000);
    camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
    const p=selectionEnvelopeProjection(bounds,camera),label=`${c.circuitId}/${z.zoneId}/${width}`;
    expect(p.left,label).toBeGreaterThanOrEqual(fit.roi.left);expect(p.right,label).toBeLessThanOrEqual(fit.roi.right);
    expect(p.bottom,label).toBeGreaterThanOrEqual(fit.roi.bottom);expect(p.top,label).toBeLessThanOrEqual(fit.roi.top);
   }
  }
 }
},15000);
