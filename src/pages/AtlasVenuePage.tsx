import {useEffect,useState} from 'react';
import {atlasVenues,loadCalendars,venueById,type CalendarRace} from '../atlas';
import {circuitPath} from '../app/navigation';
import {CircuitOutline} from '../components/CircuitOutline';
import './CatalogHome.css';
export default function AtlasVenuePage({venueId}:{venueId:string}){
 const venue=venueById.get(venueId),[history,setHistory]=useState<(CalendarRace&{year:number})[]|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setHistory(null);window.scrollTo(0,0);loadCalendars().then(data=>{if(active)setHistory(Object.entries(data).flatMap(([y,rows])=>rows.filter(r=>r.venueId===venueId&&(Number(y)<2026||r.date<='2026-10-11')).map(r=>({...r,year:Number(y)}))).reverse())}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[venueId]);
 if(!venue)return <main className="route-error"><h1>未收录此地点</h1><a href="#/circuits">返回赛道图鉴</a></main>;
 return <main className="catalog-shell home-with-world venue-detail"><nav className="catalog-nav"><a href="#/circuits" className="catalog-brand"><i/>赛道图鉴</a><a href="#/circuits">← 返回世界地图</a></nav>
  <header className="venue-heading"><span className="overline">{venue.country} / {venue.locality}</span><h1>{venue.name}</h1><p>{venue.aliases[1]}</p>{venue.currentSeason&&<span className="atlas-current">2026 赛历</span>}</header>
  <div className="venue-facts"><div><strong>{venue.years[0]}</strong><span>首次举办锦标赛正赛</span></div><div><strong>{venue.years.at(-1)}</strong><span>最近已举行正赛年份</span></div><div><strong>{venue.raceCount}</strong><span>已举行正赛</span></div><div><strong>{venue.coordinate[1].toFixed(4)}°<br/>{venue.coordinate[0].toFixed(4)}°</strong><span>纬度 / 经度（度）</span></div></div>
  <section className="venue-experience">{venue.modelId?<><CircuitOutline circuitId={venue.modelId}/><div><h2>走进赛道</h2><p>提供现有布局的地图与看台观赛。历史布局的弯数、长度及围挡可能不同。</p><a className="venue-enter" href={circuitPath(venue.modelId)}>进入现有布局观赛 ↗</a></div></>:<div><h2>地点已收录</h2><p>这里保留真实举办记录与地理位置。历史三维赛道及看台尚未建模。</p></div>}</section>
  <section className="venue-history"><h2>举办记录 <small>{venue.years.length} 个赛季</small></h2>{failed?<p role="alert">举办记录载入失败，请刷新重试。</p>:!history?<p>正在载入举办记录…</p>:<div className="venue-history-list">{history.map(r=><article key={`${r.year}-${r.round}`} data-layout={r.layoutId}><time dateTime={r.date}>{r.date}</time><div><h3>{r.name}</h3><span>比赛布局 · {(r.lengthMetres/1000).toFixed(3)} km · {r.corners} 弯</span></div><span>第 {r.round} 站</span></article>)}</div>}</section>
  <footer className="catalog-footer"><span>{atlasVenues.length} 个地点</span><div>历史资料：<a href="https://github.com/f1db/f1db/releases/tag/v2026.17.0">F1DB contributors · v2026.17.0</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>，整理与中译。<br/>正赛记录截至 2026.10.11。1950–1960 年 Indianapolis 500 计入当时世界锦标赛；同一地点的不同布局在记录中分别标识。</div></footer>
 </main>;
}
