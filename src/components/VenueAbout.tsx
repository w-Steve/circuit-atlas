import {useEffect,useState} from 'react';
import {loadCircuit} from '../circuits/registry';
import type {CircuitPackage} from '../circuits/types';
import {SourceInfo} from '../systems/SourceInfo';
import {TimingReference} from './TimingLayer';
import {sourceSummary} from '../i18n/data';
import {t} from '../i18n';

/** Accuracy and provenance live in the archive, away from map navigation. */
export default function VenueAbout({circuitId}:{circuitId:string}){
 const [data,setData]=useState<CircuitPackage>(),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;loadCircuit(circuitId).then(value=>{if(active)setData(value)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[circuitId]);
 return <details className="venue-about"><summary>{t('关于地图与模拟')}</summary>
  {failed?<p role="alert">{t('赛道数据未能载入')}</p>:!data?<p>{t('正在载入赛道…')}</p>:circuitId==='shanghai'?<SourceInfo embedded/>:<div className="venue-source-content">
   <p>{t('连续选点、真实比例。看台边界来自公开地图配准或OSM；高度、坡度与围网为估计，不提供具体座位视野保证。')}</p>
   <p>{sourceSummary(data.elevation.notes,'elevation')}</p>
   {data.facilities&&<p>{sourceSummary(data.facilities.notes,'facilities')}</p>}
   <TimingReference source={data.timing}/>
   {data.dataSources.map((source,i)=><p key={`${source.url}-${i}`}><a href={source.url} target="_blank" rel="noreferrer">{i===0?t('赛事资料'):t('中心线来源')} ↗</a></p>)}
   <p><a href={`${import.meta.env.BASE_URL}licenses/THIRD_PARTY_NOTICES.txt`} target="_blank" rel="noreferrer">{t('组件与字体许可 ↗')}</a></p>
  </div>}
 </details>;
}
