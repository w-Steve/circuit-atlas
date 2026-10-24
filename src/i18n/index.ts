import {create} from 'zustand';
import messages from './en.json';
export type Language='zh'|'en';
const storedLanguage=():Language=>{try{return localStorage.getItem('circuit-atlas-language')==='en'?'en':'zh'}catch{return 'zh'}};
export const useLanguage=create<{language:Language;setLanguage:(language:Language)=>void}>(set=>({
 language:storedLanguage(),setLanguage:language=>{
  try{localStorage.setItem('circuit-atlas-language',language)}catch{/* Private browsing may deny storage. */}
  set({language});
 },
}));
export function translate(text:string,language:Language){return language==='en'?(messages as Record<string,string>)[text]??text:text}
export const t=(text:string)=>translate(text,useLanguage.getState().language);
/** Tagged messages preserve dynamic values without translating names or IDs. */
export function tr(strings:TemplateStringsArray,...values:unknown[]){
 const key=strings.reduce((s,part,i)=>s+(i?`{${i-1}}`:'')+part,'');
 return t(key).replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]));
}
export const isEnglish=()=>useLanguage.getState().language==='en';
