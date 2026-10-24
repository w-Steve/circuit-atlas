import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {useWorldFlight,formatCoordinate,type WorldFlight as Flight} from '../app/worldFlight';
import {navigate} from '../app/navigation';
import {t} from '../i18n';
import './WorldFlight.css';

function FlightSequence({flight}:{flight:Flight}){
 const [phase,setPhase]=useState<'depart'|'clouds'|'reveal'>('depart'),skipRef=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let done=false,frame=0,departure=0,revealTimer=0;
  const started=performance.now();
  const finish=()=>{
   if(done)return;done=true;useWorldFlight.getState().clear();
   if(flight.keyboard)requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.back-link')?.focus());
  };
  const reveal=()=>{if(done)return;setPhase('reveal');revealTimer=window.setTimeout(finish,750)};
  const go=()=>{
   if(done)return;setPhase('clouds');navigate(flight.href);
   const arrived=performance.now();
   const check=()=>{
    if(done)return;
    // Wait for the actual scene, not only its JS chunk. Error UI is also a
    // legitimate destination; never leave a loading veil covering it forever.
    const ready=Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas')).some(c=>c.getClientRects().length>0&&c.dataset.cameraReady==='true'&&c.dataset.gpuReady!=='false');
    const error=document.querySelector('.route-error,[role="alert"]');
    if(performance.now()-arrived>250&&(ready||error||performance.now()-started>6500))reveal();
    else frame=requestAnimationFrame(check);
   };
   frame=requestAnimationFrame(check);
  };
  departure=window.setTimeout(go,650);
  skipRef.current=()=>{clearTimeout(departure);cancelAnimationFrame(frame);navigate(flight.href);finish()};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();skipRef.current()}};
  const changed=()=>{if(location.hash!==flight.href)finish()};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const reduce=()=>{if(reduced.matches)skipRef.current()};
  window.addEventListener('keydown',escape);window.addEventListener('hashchange',changed);reduced.addEventListener('change',reduce);
  return()=>{done=true;clearTimeout(departure);clearTimeout(revealTimer);cancelAnimationFrame(frame);window.removeEventListener('keydown',escape);window.removeEventListener('hashchange',changed);reduced.removeEventListener('change',reduce)};
 },[flight]);
 const style={'--flight-x':`${flight.origin.x*100}%`,'--flight-y':`${flight.origin.y*100}%`} as CSSProperties;
 return <div className={`world-flight flight-${phase}`} style={style} data-phase={phase}>
  <div className="flight-vignette"/>
  <div className="flight-cloud cloud-far"/><div className="flight-cloud cloud-near"/><div className="flight-cloud cloud-low"/>
  <div className="flight-destination" role="status" aria-live="polite"><span className="flight-cross">＋</span><strong>{flight.name}</strong><span>{formatCoordinate(flight.coordinate[1],'N','S')} <i>/</i> {formatCoordinate(flight.coordinate[0],'E','W')}</span></div>
  <button className="flight-skip" onClick={()=>skipRef.current()}>{t('跳过动画')} <span>Esc</span></button>
 </div>;
}
export function WorldFlight(){const flight=useWorldFlight(s=>s.flight);return flight?<FlightSequence key={flight.id} flight={flight}/>:null}
