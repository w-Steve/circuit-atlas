import {t} from "../i18n";
import {shortBack} from '../i18n/data';
import {atlasVenues,venuePath} from '../atlas';
import {navigate} from '../app/navigation';
import {useCircuit,useCircuitStore} from '../app/CircuitContext';

export function ExperienceBack(){
  const useApp=useCircuitStore();
 const {mode,setMode}=useApp();
 const label=mode==='phone'?t("返回观赛"):mode==='eye'?t("返回选点"):mode==='select'?t("返回赛道地图"):t("返回世界地图");
 return <button className="back-link" aria-label={label} onClick={()=>mode==='overview'?navigate('#/circuits'):setMode(mode==='phone'?'eye':mode==='eye'?'select':'overview')}>← <span>{shortBack(mode)}</span></button>;
}
export function VenueInfoLink(){
  const useApp=useCircuitStore();
 const circuitId=useApp(s=>s.circuitId),venue=atlasVenues.find(v=>v.modelId===circuitId);
 if(!venue)return null;
 return <a className="venue-info-link" href={venuePath(venue)} onClick={()=>sessionStorage.setItem('atlas-detail-parent',location.hash)} aria-label={t("赛道档案：概念图、历史与统计")}>{t("赛道档案 ↗")}</a>;
}
