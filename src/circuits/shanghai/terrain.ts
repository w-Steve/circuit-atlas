import type {TerrainFoundation} from '../spectatorTerrain';
import {local,foundationAltitude} from '../../data/config';

// Existing A stand, pit garage/apron and roadside safety installations use the
// same level foundation. Cut only their coarse DTM envelope, never the source.
export const shanghaiFoundations:TerrainFoundation[]=[
 {x0:-200,x1:200,z0:30,z1:85},
 {x0:-245,x1:245,z0:-58,z1:-13},
 {x0:-265,x1:245,z0:8,z1:15},
].map(({x0,x1,z0,z1})=>({base:foundationAltitude,ring:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>{const p=local(x,0,z);return {x:p[0],z:p[2]}})}));
