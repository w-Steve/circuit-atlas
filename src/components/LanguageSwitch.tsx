import {useEffect,useLayoutEffect,useId,useRef,useState} from 'react';
import {useLanguage,type Language} from '../i18n';
export const plannedLanguages=[['zh-Hant','繁體中文'],['de','Deutsch'],['fr','Français'],['es','Español'],['it','Italiano'],['pt','Português'],['ja','日本語'],['ko','한국어'],['ar','العربية']] as const;
const availableLanguages=[['zh','简体中文','zh-CN'],['en','English','en']] as const;
export function LanguageSwitch(){
 const {language,setLanguage}=useLanguage(),[open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),id=useId();
 const label=language==='zh'?'选择语言':'Choose language';
 useEffect(()=>{
  if(!open)return;
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus()}};
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape)};
 },[open]);
 useLayoutEffect(()=>{if(open)menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({preventScroll:true})},[open]);
 const choose=(value:Language)=>{setLanguage(value);setOpen(false);trigger.current?.focus({preventScroll:true})};
 return <div className="language-switch" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
  <button className="language-trigger" ref={trigger} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true)}}}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></svg>
  </button>
  {open&&<div id={id} ref={menu} className="language-menu" role="menu" aria-label={label} onKeyDown={e=>{
   if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();
   const items=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]:not(:disabled)')],index=items.indexOf(document.activeElement as HTMLButtonElement);
   items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
  }}>
   {availableLanguages.map(([value,native,lang])=><button key={value} role="menuitemradio" aria-checked={language===value} tabIndex={-1} onClick={()=>choose(value)}><span className="language-check" aria-hidden="true">{language===value&&<svg viewBox="0 0 12 12"><path d="m2 6 2.5 2.5L10 3"/></svg>}</span><span lang={lang}>{native}</span></button>)}
   <div className="language-planned">{language==='zh'?'更多语言 · 筹备中':'More languages · planned'}</div>
   <div className="language-options-planned">{plannedLanguages.map(([value,native])=><button key={value} role="menuitemradio" aria-checked={false} tabIndex={-1} disabled><span className="language-check" aria-hidden="true"/><span lang={value} dir="auto">{native}</span></button>)}</div>
  </div>}
 </div>;
}
