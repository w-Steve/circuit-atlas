import {t,tr} from "../i18n";
import {useEffect,useState} from 'react';
import {circuitRegion} from '../circuits/regions';
import {circuitPath} from '../app/navigation';
import {CircuitOutline} from '../components/CircuitOutline';
import {WorldCircuitMap} from '../components/WorldCircuitMap';
import {atlasVenues,atlasYears,CURRENT_SEASON,loadCalendars,matchesVenue,venueById,venuePath,venueYearsLabel,type CalendarRace} from '../atlas';
import './CatalogHome.css';
import {localizeVenue,raceName} from '../i18n/data';
import {isEnglish} from '../i18n';
import {LanguageSwitch} from '../components/LanguageSwitch';
export const weekendLabel=(start:string,end:string)=>`${start.slice(5).replace('-','.')} — ${end.slice(5).replace('-','.')}`;
const remembered=(key:string,fallback:string)=>{try{return sessionStorage.getItem(key)??fallback}catch{return fallback}};
export function CatalogPage(){
 const [query,setQuery]=useState(()=>remembered('atlas-query','')),[tab,setTab]=useState(()=>remembered('atlas-tab','calendar'));
 const [year,setYear]=useState(()=>{const y=Number(remembered('atlas-year','2026'));return atlasYears.includes(y)?y:CURRENT_SEASON});
 const [calendars,setCalendars]=useState<Record<string,CalendarRace[]>|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;loadCalendars().then(c=>{if(active)setCalendars(c)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[]);
 useEffect(()=>{try{sessionStorage.setItem('atlas-tab',tab);sessionStorage.setItem('atlas-year',String(year));sessionStorage.setItem('atlas-query',query)}catch{}},[tab,year,query]);
 const rows=calendars?.[year]?.filter(r=>matchesVenue(venueById.get(r.venueId)!,query))??[];
 const venues=atlasVenues.filter(v=>matchesVenue(v,query)).map(localizeVenue).sort((a,b)=>a.name.localeCompare(b.name,isEnglish()?'en':'zh-CN'));
 return <div className="catalog-shell home-with-world">
  <nav className="catalog-nav"><a href="#/circuits" className="catalog-brand"><i/>{t("赛道图鉴")}</a><div className="catalog-nav-actions"><LanguageSwitch/></div></nav>
  <header className="world-heading"><div><span className="overline">1950 — {CURRENT_SEASON} / CIRCUIT ATLAS</span><h1>{t("世界赛道")}<span>{t("每一站，都有历史。")}</span></h1></div><p>{t("从世界地图出发，")}<br/>{t("寻找曾经响起引擎声的地方。")}</p></header>
  <WorldCircuitMap/>
  <section id="circuit-collection" className="circuit-collection season-calendar" aria-label={t("赛道目录")}>
   <div className="collection-heading"><div className="atlas-collection-title"><div className="atlas-tabs" role="tablist" aria-label={t("浏览方式")} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'calendar':e.key==='End'?'atlas':tab==='calendar'?'atlas':'calendar';setTab(next);setQuery('');e.currentTarget.querySelector<HTMLButtonElement>('#tab-'+next)?.focus()}}>{[['calendar',t("按年赛历")],['atlas',t("全部图鉴")]].map(([id,label])=><button key={id} id={`tab-${id}`} role="tab" tabIndex={tab===id?0:-1} aria-selected={tab===id} aria-controls="atlas-results" onClick={()=>{setTab(id);setQuery('')}}>{label}</button>)}</div>{tab==='calendar'?<label className="atlas-year">{t("赛季")}<select aria-label={t("选择赛季")} value={year} onChange={e=>setYear(Number(e.target.value))}>{atlasYears.map(y=><option key={y} value={y}>{y}</option>)}</select></label>:null}</div><label className="catalog-search"><span>⌕</span><input aria-label={t("搜索赛道")} placeholder={t("赛道、城市或国家")} value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
   <div id="atlas-results" role="tabpanel" aria-labelledby={`tab-${tab}`}>
   {tab==='calendar'?<>
    <div className="calendar-results" aria-live="polite">{calendars?tr`${rows.length} 站`:t("正在载入赛历…")}<span>{year===CURRENT_SEASON?t("2026 赛历 · 含尚未举行的分站"):t("已举行的世界锦标赛正赛")}</span></div>
    {failed&&<p role="alert">{t("赛历未能载入。")}<button onClick={()=>location.reload()}>{t("重新载入")}</button></p>}
    <div className="circuit-grid calendar-grid">{rows.map(r=>{const v=localizeVenue(venueById.get(r.venueId)!);return <a className="circuit-card calendar-card" key={r.round} href={v.modelId?circuitPath(v.modelId):venuePath(v)} data-region={v.modelId?circuitRegion(v.modelId)?.id:undefined} data-round={r.round}>
     <div className="calendar-card-top"><span className="calendar-round">ROUND <b>{String(r.round).padStart(2,'0')}</b></span><time dateTime={r.date}>{r.start?weekendLabel(r.start,r.date):r.date.slice(5).replace('-','.')}</time></div>
     <div className="calendar-card-main"><div><span className="calendar-country">{v.country}</span><h3>{v.locality}</h3><p>{raceName(r,v)}</p></div>{v.modelId&&year===CURRENT_SEASON?<div className="card-outline"><CircuitOutline circuitId={v.modelId}/></div>:<span className="archive-card-year" aria-hidden="true">{year}</span>}</div>
     <div className="calendar-card-bottom"><span>{v.name}</span><b aria-hidden="true">↗</b></div>
     <div className="calendar-card-hover"><span>{v.modelId?t("进入现有布局观赛"):t("查看地点档案")}</span><span>{(r.lengthMetres/1000).toFixed(3)} km · {r.corners} {t("弯")}</span></div>
    </a>})}</div>
    {calendars&&rows.length===0&&<div className="no-results">{t("没有找到匹配的赛道。试试其他关键词。")}</div>}
    {year<CURRENT_SEASON&&<p className="archive-note">{t("赛历长度与弯数对应当年的比赛布局；观赛入口使用已建模的现有布局。1950–1960 年印第安纳波利斯 500 英里赛也计入当时的世界锦标赛。")}</p>}
   </>:<>
    <div className="calendar-results" aria-live="polite">{venues.length} {t("个地点")}</div>
    <div className="atlas-grid">{venues.map(v=><a className="atlas-card" key={v.id} href={venuePath(v)} data-venue={v.id}><div className="atlas-card-heading"><span>{v.country} · {v.locality}</span>{v.currentSeason&&<span className="atlas-current">{t("2026 赛历")}</span>}</div><h3>{v.name}</h3><div className="atlas-card-bottom"><span>{venueYearsLabel(v)}<small>{v.raceCount} {t("场已举行正赛")}</small></span>{v.modelId?<CircuitOutline circuitId={v.modelId}/>:<b aria-hidden="true">↗</b>}</div></a>)}</div>
    {venues.length===0&&<div className="no-results">{t("没有找到匹配的赛道。试试其他关键词。")}</div>}
   </>}
   </div>
  </section>
  <footer className="catalog-footer"><div>{t("独立非官方项目，与 Formula 1 公司无关联或认可。")}<br/>{t("历史资料：")}<a href="https://github.com/f1db/f1db/releases/tag/v2026.17.0" target="_blank" rel="noreferrer">F1DB contributors</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>{t("，已整理为地点与赛历。")} · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a><br/>{t("正赛记录截至 2026.10.11；2026 赛历核查 2026.10.23。")}</div></footer>
 </div>;
}
