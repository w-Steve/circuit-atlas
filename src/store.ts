import { navigate, circuitPath } from "./app/navigation";
import { create } from "zustand";
import type { PanMode } from "./camera/Exposure";
import type { SpectatorTier } from './circuits/types';
export type Mode = "overview" | "select" | "eye" | "phone";
export type Selection = { tier: SpectatorTier; u: number; v: number;zoneId?:string };
export interface State {
  timingVisible:boolean;
  setTimingVisible:(value:boolean)=>void;
  terrainColored:boolean;
  setTerrainColored:(value:boolean)=>void;
  circuitId:string;
  activateCircuit:(id:string,defaultZone?:string)=>void;
  shutterSpeed:number;
  panMode:PanMode;
  setShutterSpeed:(denominator:number)=>void;
  setPanMode:(mode:PanMode)=>void;
  zoom: number;
  setZoom: (z: number) => void;
  mode: Mode;
  selection: Selection;
  heading: number;
  pitch: number;
  resetView: number;
  setMode: (m: Mode) => void;
  select: (s: Selection) => void;
  chooseZone: (zoneId:string) => void;
  look: (dx: number, dy: number) => void;
  home: () => void;
}
export function createAppStore(circuitId="shanghai",defaultZone="a",defaultSelection?:(circuitId:string,zoneId:string)=>Selection|undefined){
const rememberedZones = new Map<string,{selection:Selection;heading:number;pitch:number}>();
const rememberedCircuits=new Map<string,{selection:Selection;heading:number;pitch:number;zoom:number;shutterSpeed:number;panMode:PanMode}>();
const store=create<State>((set,get) => ({
  timingVisible:true,
  setTimingVisible:timingVisible=>set({timingVisible}),
  terrainColored:true,
  setTerrainColored:terrainColored=>set({terrainColored}),
  circuitId,
  activateCircuit:(circuitId,defaultZone='a')=>{
    const previous=get();if(previous.circuitId===circuitId)return;
    rememberedCircuits.set(previous.circuitId,{selection:previous.selection,heading:previous.heading,pitch:previous.pitch,zoom:previous.zoom,shutterSpeed:previous.shutterSpeed,panMode:previous.panMode});
    set({circuitId,...(rememberedCircuits.get(circuitId)??{selection:defaultSelection?.(circuitId,defaultZone)??{zoneId:defaultZone,tier:'lower',u:.5,v:.5},heading:0,pitch:0,zoom:1,shutterSpeed:1000,panMode:'fixed'})});
  },
  shutterSpeed:1000,panMode:'fixed',
  setShutterSpeed:shutterSpeed=>{if([60,125,250,500,1000,2000,4000].includes(shutterSpeed))set({shutterSpeed})},
  setPanMode:panMode=>set({panMode}),
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(30, Number.isFinite(zoom)?zoom:1)) }),
  mode: "overview",
  selection: defaultSelection?.(circuitId,defaultZone)??{ zoneId:defaultZone,tier: "lower", u: 0.5, v: 0.5 },
  heading: 0,
  pitch: 0,
  resetView: 0,
  setMode: (mode) => {
    set({ mode });
    if (
      typeof window !== "undefined" &&
      location.hash.startsWith(`#/circuits/${get().circuitId}/`)
    )
      navigate(circuitPath(get().circuitId, mode,get().selection.zoneId??'a'), true);
  },
  select: (selection) =>
    set({
      selection: {
        ...selection,
        u: Math.max(0, Math.min(1, selection.u)),
        v: Math.max(0, Math.min(1, selection.v)),
      },
    }),
  chooseZone: (zoneId) => {
    const previous=get();if((previous.selection.zoneId??'a')===zoneId)return;
    rememberedZones.set(previous.circuitId+':'+(previous.selection.zoneId??'a'),{selection:previous.selection,heading:previous.heading,pitch:previous.pitch});
    set(rememberedZones.get(get().circuitId+':'+zoneId)??{selection:defaultSelection?.(get().circuitId,zoneId)??{zoneId,tier:'lower',u:.5,v:.5},heading:0,pitch:0});
  },
  look: (dx, dy) =>
    set((s) => ({
      heading: s.heading + dx,
      pitch: Math.max(-1.1, Math.min(1.1, s.pitch + dy)),
    })),
  home: () =>
    set((s) => ({ heading: 0, pitch: 0, resetView: s.resetView + 1 })),
}));

return Object.assign(store,{
  captureMemory:()=>({zones:[...rememberedZones],circuits:[...rememberedCircuits]}),
  restoreMemory:(memory:{zones:[string,{selection:Selection;heading:number;pitch:number}][];circuits:[string,{selection:Selection;heading:number;pitch:number;zoom:number;shutterSpeed:number;panMode:PanMode}][]})=>{
    rememberedZones.clear();rememberedCircuits.clear();for(const [key,value] of memory.zones)rememberedZones.set(key,value);for(const [key,value] of memory.circuits)rememberedCircuits.set(key,value);
  },
});
}
