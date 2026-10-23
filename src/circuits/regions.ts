export const circuitRegions = [
  {id:'a',name:'A. 欧洲',circuits:['monaco','barcelona','spielberg','silverstone','spa','hungaroring','zandvoort','monza','madrid']},
  {id:'b',name:'B. 亚洲和大洋洲',circuits:['melbourne','shanghai','suzuka','baku','sepang','singapore','lusail','yas-marina']},
  {id:'c',name:'C. 美洲',circuits:['miami','montreal','austin','mexico','interlagos','las-vegas']},
] as const;
export const europeanCircuits:readonly string[]=circuitRegions[0].circuits;
export const circuitRegion=(id:string)=>circuitRegions.find(group=>(group.circuits as readonly string[]).includes(id));

export const asiaPacificCircuits:readonly string[]=circuitRegions[1].circuits;

export const americanCircuits:readonly string[]=circuitRegions[2].circuits;
