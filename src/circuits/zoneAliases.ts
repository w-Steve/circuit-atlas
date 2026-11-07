import type {CircuitPackage} from './types';
/** One hop only; an alias cannot replace a real zone or open an unaccepted one. */
export function resolveSpectatorZoneId(data:CircuitPackage,id:string){
 if(data.spectatorZones.some(z=>z.zoneId===id))return id;
 const target=data.spectatorZoneAliases?.[id];
 return target&&data.spectatorZones.some(z=>z.zoneId===target&&z.availability==='available')?target:id;
}
