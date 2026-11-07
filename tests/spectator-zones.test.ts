import { describe,it,expect } from "vitest";
import { DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3 } from "three";
import { spectatorZones,zoneSurfaces,zonePoint,surfacePoint,surfaceGeometry,selectionAt,zonePassCenter } from "../src/circuits/shanghai/spectators";
import { observer,validSelection,lookTarget } from "../src/systems/GrandstandGeometry";
import { VehicleSimulation } from "../src/systems/VehicleSimulation";
import {createAppStore} from "../src/store";
const useApp=createAppStore();
import { prepareLocalPass } from "../src/systems/PassController";
import { passStart,passEnd } from "../src/systems/VehicleSimulation";
import packageData from "../src/circuits/shanghai";
describe('2026 Shanghai shared spectator surfaces',()=>{
  it('contains exactly the official public areas and excludes historical L / VIP clubs',()=>{
    expect(spectatorZones.map(z=>z.zoneId)).toEqual(['a','b','e','h','k','c','f','j']);
    expect(spectatorZones.every(z=>z.openingSource?.confidence==='high')).toBe(true);
    expect(spectatorZones.find(z=>z.zoneId==='c')?.source.method).toBe('estimated');
    expect(spectatorZones.every(z=>z.surfaceSource?.method==='estimated')).toBe(true);
    expect(packageData.spectatorZones.map(z=>z.zoneId)).toEqual(spectatorZones.map(z=>z.zoneId));
    expect(packageData.corners).toHaveLength(16);
  });
  for(const zone of spectatorZones.filter(z=>z.zoneId!=='a')) it(`${zone.zoneId}: continuous position stays on its actual meshed polygon and eye height`,()=>{
    const all=zoneSurfaces.get(zone.zoneId)!;
    for(const surface of all){
      const geometry=surfaceGeometry(surface),mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
      for(const u of [.03,.2,.5,.8,.97])for(const v of [.06,.37,.83]){
        const p=surfacePoint(surface,u,v,true);
        const ray=new Raycaster(p.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0));
        const hit=ray.intersectObject(mesh)[0];
        expect(hit,`${surface.definition.surfaceId} ${u}/${v}`).toBeDefined();
        expect(p.y-hit.point.y).toBeCloseTo(surface.definition.eyeHeight,2);
        const selection=selectionAt(surface,p);
        expect(validSelection(selection)).toBe(true);
        expect(observer(selection).distanceTo(p)).toBeLessThan(.03);
      }
      geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
    }
    expect(zonePoint(zone.zoneId,.1,.2).distanceTo(zonePoint(zone.zoneId,.9,.8))).toBeGreaterThan(15);
  });
  it('different areas have different physical positions and local passes at unchanged metres/second',()=>{
    const areas=spectatorZones.filter(z=>z.zoneId!=='a');
    const centers=areas.map(z=>zonePoint(z.zoneId,.5,.5));
    centers.forEach((p,i)=>centers.slice(i+1).forEach(q=>expect(p.distanceTo(q)).toBeGreaterThan(25)));
    for(const z of areas){
      const center=zonePassCenter(z.zoneId),v=new VehicleSimulation();v.setPassRange(center-350,center+450);v.play();v.advance(1);
      expect(v.distance-(center-350)).toBeCloseTo(200/3.6,6);
      v.replay();expect(v.distance).toBe(center-350);
      const eye=zonePoint(z.zoneId,.5,.5);expect(lookTarget({zoneId:z.zoneId,tier:'lower',u:.5,v:.5}).distanceTo(eye)).toBeGreaterThan(8);
    }
  });
  it('preserves area selection and heading when switching back, and validates invalid area/tier',()=>{
    const app=useApp.getState();app.chooseZone('b');app.select({zoneId:'b',tier:'lower',u:.23,v:.62});app.look(.3,-.1);
    const previous=useApp.getState();app.chooseZone('f');app.chooseZone('b');
    expect(useApp.getState().selection).toEqual(previous.selection);expect(useApp.getState().heading).toBe(previous.heading);
    expect(validSelection({zoneId:'missing',tier:'lower',u:.5,v:.5})).toBe(false);
    expect(validSelection({zoneId:'b',tier:'upper',u:.5,v:.5})).toBe(false);
    app.chooseZone('a');
  });
  it('platinum uses the estimated central upper subset without moving old upper/lower points',()=>{
    const platinum=observer({tier:'platinum',u:0,v:0});
    const upper=observer({tier:'upper',u:.35,v:.32});
    expect(platinum.distanceTo(upper)).toBeLessThan(1e-8);
  });
  it('centers a deliberate new pass on the selected observer, preserving paused/running car positions',()=>{
    const selection={zoneId:'b',tier:'lower' as const,u:.81,v:.62};
    simulation.replay();prepareLocalPass(selection,simulation);
    const center=simulation.rangeStart+350;
    expect(Math.abs(center-zonePassCenter('b'))).toBeGreaterThan(5);
    simulation.play();simulation.advance(1);const before=simulation.distance;
    prepareLocalPass({...selection,u:.2},simulation);expect(simulation.distance).toBe(before);
    simulation.pause();prepareLocalPass({...selection,u:.1},simulation);expect(simulation.distance).toBe(before);
    simulation.setPassRange(passStart,passEnd);
  });
});

const simulation=new VehicleSimulation();
