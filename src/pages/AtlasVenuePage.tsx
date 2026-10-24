import {t,tr} from "../i18n";
import {lazy,Suspense,useEffect,useState} from 'react';
import {loadCalendars,venueById,type CalendarRace} from '../atlas';
import {circuitPath} from '../app/navigation';
import {CircuitOutline} from '../components/CircuitOutline';
import './CatalogHome.css';
import {localizeVenue,raceName,roundLabel} from '../i18n/data';
import {isEnglish} from '../i18n';
import profiles from '../atlas/profiles.json';
const VenueAbout=lazy(()=>import('../components/VenueAbout'));
export default function AtlasVenuePage({venueId}:{venueId:string}){
 const [parent]=useState(()=>{const value=sessionStorage.getItem('atlas-detail-parent');return value?.startsWith('#/circuits/')?value:'#/circuits'});
 useEffect(()=>{sessionStorage.removeItem('atlas-detail-parent')},[]);
 const profile=(profiles as Record<string,{kind:string;direction:string;layoutId:string;layoutYear:number;lengthMetres:number;corners:number;firstDate:string|null;lastDate:string|null;layoutCount:number;previousNames:string[];sourceCommit:string}>)[venueId];
 const rawVenue=venueById.get(venueId),venue=rawVenue?localizeVenue(rawVenue):undefined,[history,setHistory]=useState<(CalendarRace&{year:number})[]|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setHistory(null);window.scrollTo(0,0);loadCalendars().then(data=>{if(active)setHistory(Object.entries(data).flatMap(([y,rows])=>rows.filter(r=>r.venueId===venueId&&(Number(y)<2026||r.date<='2026-10-11')).map(r=>({...r,year:Number(y)}))).reverse())}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[venueId]);
 if(!venue)return <main className="route-error"><h1>{t("未收录此地点")}</h1><a href="#/circuits">{t("返回赛道图鉴")}</a></main>;
 return <main className="catalog-shell home-with-world venue-detail"><nav className="catalog-nav"><a className="venue-back" href={parent}>← {parent==='#/circuits'?t("返回世界地图"):t("返回赛道")}</a></nav>
  <header className="venue-heading"><span className="overline">{venue.country} / {venue.locality}</span><h1>{venue.name}</h1><p>{venue.aliases[1]}</p>{venue.currentSeason&&<span className="atlas-current">{t("2026 赛历")}</span>}</header>
  {profile&&<section className="venue-profile">
   <figure className="venue-concept"><img src={`${import.meta.env.BASE_URL}atlas-layouts/${profile.layoutId}.svg`} alt={tr`${venue.name} ${profile.layoutYear} 年比赛布局概念图`} width="500" height="500"/><figcaption>{profile.layoutYear} {t("年比赛布局 ·")} {(profile.lengthMetres/1000).toFixed(3)} km · {profile.corners} {t("弯")}</figcaption></figure>
   <div className="venue-story"><span className="overline">{t("赛道档案")}</span><h2>{({STREET:t("城市之间的赛道"),ROAD:t("沿道路展开的赛场"),RACE:t("为竞速而生的赛场")})[profile.kind as 'STREET'|'ROAD'|'RACE']??t("世界锦标赛的一站")}</h2>
    <p>{isEnglish()?`${venue.name} is in ${venue.locality}, ${venue.country}. `:`${venue.name}位于${venue.country}的${venue.locality}。`}{profile.firstDate?tr`这里在 ${profile.firstDate} 首次举办计入世界锦标赛的正赛，截至资料快照共举办 ${venue.raceCount} 场，横跨 ${venue.years.length} 个赛季。`:t("该地点已列入 2026 赛历，资料快照中尚无已举行的锦标赛正赛。")}</p>
    <p>{profile.layoutCount>1?tr`举办记录中收录了 ${profile.layoutCount} 种比赛布局，赛道线路也在岁月中演变。`:t("举办记录中的比赛采用同一布局编号。")}{isEnglish()?` The diagram shows the ${profile.layoutYear} ${{STREET:'street',ROAD:'road',RACE:'purpose-built'}[profile.kind as 'STREET'|'ROAD'|'RACE']??''} circuit, running ${profile.direction==='CLOCKWISE'?'clockwise':profile.direction==='ANTI_CLOCKWISE'?'anticlockwise':'in mixed directions'}.`:<>{t("概念图对应")} {profile.layoutYear} {t("年的")}{({STREET:t("街道"),ROAD:t("公路"),RACE:t("专用")})[profile.kind as 'STREET'|'ROAD'|'RACE']??''}{t("赛道，")}{profile.direction==='CLOCKWISE'?t("顺时针"):profile.direction==='ANTI_CLOCKWISE'?t("逆时针"):t("混合方向")}{t("行驶。")}</>}</p>
    <dl><div><dt>{t("布局长度")}</dt><dd>{(profile.lengthMetres/1000).toFixed(3)} km</dd></div><div><dt>{t("弯道")}</dt><dd>{profile.corners}</dd></div><div><dt>{t("锦标赛布局版本")}</dt><dd>{profile.layoutCount||'—'}</dd></div></dl>
    <small>{t("概念图：F1DB / Jules Roy 与贡献者 ·")} <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{t("。仅表达线路，不代表看台、路宽或地形。")}</small>
   </div>
  </section>}
  <div className="venue-facts"><div><strong>{venue.years[0]}</strong><span>{t("首次举办锦标赛正赛")}</span></div><div><strong>{venue.years.at(-1)}</strong><span>{t("最近已举行正赛年份")}</span></div><div><strong>{venue.raceCount}</strong><span>{t("已举行正赛")}</span></div><div><strong>{venue.coordinate[1].toFixed(4)}°<br/>{venue.coordinate[0].toFixed(4)}°</strong><span>{t("纬度 / 经度（度）")}</span></div></div>
  <section className="venue-experience">{venue.modelId?<><CircuitOutline circuitId={venue.modelId}/><div><h2>{t("走进赛道")}</h2><p>{t("提供现有布局的地图与看台观赛。历史布局的弯数、长度及围挡可能不同。")}</p><a className="venue-enter" href={circuitPath(venue.modelId)}>{t("进入现有布局观赛 ↗")}</a></div></>:<div><h2>{t("地点已收录")}</h2><p>{t("这里保留真实举办记录与地理位置。历史三维赛道及看台尚未建模。")}</p></div>}</section>
  {venue.modelId&&<Suspense fallback={null}><VenueAbout circuitId={venue.modelId}/></Suspense>}
  <section className="venue-history"><h2>{t("举办记录")} <small>{venue.years.length} {t("个赛季")}</small></h2>{failed?<p role="alert">{t("举办记录载入失败，请刷新重试。")}</p>:!history?<p>{t("正在载入举办记录…")}</p>:<div className="venue-history-list">{history.map(r=><article key={`${r.year}-${r.round}`} data-layout={r.layoutId} data-race-id={`${venueId}-${r.year}-${r.round}`}><time dateTime={r.date}>{r.date}</time><div className="race-summary"><h3>{raceName(r,venue)}</h3><span>{t("比赛布局 ·")} {(r.lengthMetres/1000).toFixed(3)} km · {r.corners} {t("弯")}</span></div><span>{roundLabel(r.round)}</span></article>)}</div>}</section>
  <footer className="catalog-footer"><div>{t("历史资料：")}<a href="https://github.com/f1db/f1db/releases/tag/v2026.17.0">F1DB contributors · v2026.17.0</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{t("，整理与中译。")}<br/>{t("正赛记录截至 2026.10.11。1950–1960 年 Indianapolis 500 计入当时世界锦标赛；同一地点的不同布局在记录中分别标识。")}</div></footer>
 </main>;
}
