import {atlasVenues,type AtlasVenue,type CalendarRace} from '../atlas';
import {isEnglish,t} from './index';
const modeled=new Map(atlasVenues.filter(v=>v.modelId).map(v=>[v.modelId!,v]));
export function localizeVenue<T extends AtlasVenue>(v:T):T{
 return isEnglish()?{...v,name:v.aliases[1],locality:v.aliases[2],country:v.aliases[4]}:v;
}
export const circuitName=(id:string,fallback:string)=>isEnglish()?modeled.get(id)?.aliases[1]??fallback:fallback;
export const circuitLocation=(id:string,fallback:string)=>isEnglish()?modeled.get(id)?.aliases[2]??fallback:fallback;
export const circuitCountry=(id:string,fallback:string)=>isEnglish()?modeled.get(id)?.aliases[4]??fallback:fallback;
const grandPrix:Record<string,string>={melbourne:'Australian Grand Prix',shanghai:'Chinese Grand Prix',suzuka:'Japanese Grand Prix',miami:'Miami Grand Prix',montreal:'Canadian Grand Prix',monaco:'Monaco Grand Prix',barcelona:'Barcelona-Catalunya Grand Prix',spielberg:'Austrian Grand Prix',silverstone:'British Grand Prix',spa:'Belgian Grand Prix',hungaroring:'Hungarian Grand Prix',zandvoort:'Dutch Grand Prix',monza:'Italian Grand Prix',madrid:'Spanish Grand Prix',baku:'Azerbaijan Grand Prix',sepang:'Bahrain Grand Prix in Malaysia',singapore:'Singapore Grand Prix',austin:'United States Grand Prix',mexico:'Mexico City Grand Prix',interlagos:'São Paulo Grand Prix','las-vegas':'Las Vegas Grand Prix',lusail:'Qatar Grand Prix','yas-marina':'Abu Dhabi Grand Prix'};
export function raceName(r:CalendarRace,v:AtlasVenue){return isEnglish()&&/[\u4e00-\u9fff]/.test(r.name)?grandPrix[v.modelId??'']??`${v.locality} Grand Prix`:r.name}
const zones:Record<string,string>={'GA1 普通观赛区':'General Admission 1','GA2 普通观赛区':'General Admission 2','S 家庭看台':'Family Grandstand S','A 主看台':'Main Grandstand A','主直道南段':'Main straight south','主直道中段':'Main straight center','主直道北段':'Main straight north','高速弯看台':'High-speed corner stand','北区入口看台':'North section entry stand','北区组合弯看台':'North corner complex stand','T11 内侧看台':'T11 inside stand','Monumental 外侧看台':'Monumental outside stand','Monumental 内侧看台':'Monumental inside stand'};
export function zoneName(name:string){
 if(!isEnglish())return name;
 return zones[name]??name.replace(/^(.*?) 看台$/,'Grandstand $1').replace(/^(.*?) 草地$/,'Grass $1');
}
export function sourceSummary(notes:string,kind:'stand'|'elevation'|'facilities'){
 if(!isEnglish())return notes;
 if(kind==='stand')return 'The recorded source defines the viewing-area footprint. Seating height, rows and slope are model estimates; inspect the linked source for its publication year and boundaries.';
 if(kind==='elevation')return notes.includes('GEDTM30')?'Regional GEDTM30 v1.2 bare-earth terrain estimate (~30m), interpolated at true vertical scale. This predicted dataset is not a survey of the road, stands, bridges or tunnels.':notes.includes('SRTM')?'Regional SRTM90m terrain, interpolated at true vertical scale. This dataset cannot resolve curbs, stand foundations, bridges or tunnels.':'No reliable point-by-point elevation is available for this model; a horizontal datum is used. This does not imply that the venue is flat.';
 return notes.includes('未能载入')?'Pit resources could not load. The circuit remains usable; reload to retry.':notes.includes('关键轮廓尚未核实')?'Pit lane positions are recorded, but no verified pit-building footprint is available. Nearby ordinary buildings are not substituted.':'Pit-building footprints derive from OSM. Untagged heights and 7m lane widths are estimates; garage facade panels are schematic. Underground lane sections are not rendered as surface roads.';
}
export const roundLabel=(round:number)=>isEnglish()?`Round ${round}`:`第 ${round} 站`;
export const shortBack=(mode:string)=>isEnglish()?({phone:'Viewing',eye:'Viewpoint',select:'Circuit map',overview:'World map'}[mode]??'Back'):t({phone:'返回观赛',eye:'返回选点',select:'返回赛道地图',overview:'返回世界地图'}[mode]??'返回').replace('返回','');
