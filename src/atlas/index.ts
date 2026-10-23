import data from './venues.json';
export interface AtlasVenue {
 id:string; name:string; locality:string; country:string; aliases:string[];
 coordinate:number[]; years:number[]; raceCount:number; modelId:string|null; currentSeason:boolean;
}
export interface CalendarRace {
 venueId:string; round:number; date:string; start?:string; name:string;
 layoutId?:string; lengthMetres:number; corners:number;
}
export const atlasVenues:readonly AtlasVenue[]=data;
export const venueById=new Map(atlasVenues.map(v=>[v.id,v]));
export const CURRENT_SEASON=2026;
export const atlasYears=Array.from({length:77},(_,i)=>CURRENT_SEASON-i);
export const venuePath=(venue:AtlasVenue)=>`#/atlas/${encodeURIComponent(venue.id)}`;
export const venueYearsLabel=(v:AtlasVenue)=>v.years[0]===v.years.at(-1)?String(v.years[0]):`${v.years[0]} — ${v.years.at(-1)}`;
export const matchesVenue=(v:AtlasVenue,query:string)=>
 [v.name,v.locality,v.country,...v.aliases].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
 .includes(query.trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());
let calendarPromise:Promise<Record<string,CalendarRace[]>>|undefined;
export function loadCalendars(){
 return calendarPromise??=import('./calendars.json').then(m=>m.default as Record<string,CalendarRace[]>);
}
