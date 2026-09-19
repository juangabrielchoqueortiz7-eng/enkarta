'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {useReducedMotion} from 'framer-motion';
import type {InvitationParsed} from '@/lib/types';
import {RY_ICONS,RY_ROOT,RY_TEXTS,rolyYelianaDemo,ryMedia,ryText} from '@/lib/roly-y-yeliana';
import {originalInvitationAsset} from '@/lib/invitation-assets';
import {resolveFeatures} from '@/lib/packages';
import {useCountdown,EventIcon} from './shared';
import LottieIcon from '@/components/ui/LottieIcon';
import ConfirmationForm from './ConfirmationForm';
import {resolveBlockTheme} from './blocks/theme';
import styles from './RolyYeliana.module.css';

function Carousel({images,active,seconds=1.5,className=''}:{images:string[];active:boolean;seconds?:number;className?:string}){
 const [index,setIndex]=useState(0),reduced=useReducedMotion();
 useEffect(()=>{if(!active||reduced||images.length<2)return;const timer=setInterval(()=>setIndex(i=>(i+1)%images.length),Math.max(1,seconds)*1000);return()=>clearInterval(timer);},[images.length,active,reduced,seconds]);
 if(!images.length)return null;
 return <div className={`${styles.carousel} ${className}`}>{images.map((url,i)=><img key={url+i} src={url} alt={i===index%images.length?'Roly y Yeliana':''} aria-hidden={i!==index%images.length} className={i===index%images.length?styles.active:''} loading="lazy"/>)}</div>;
}
export default function RolyYeliana({data=rolyYelianaDemo(),preview=false,demo=false,skipEntry=false,deadlinePassed=false}:{data?:InvitationParsed;preview?:boolean;demo?:boolean;skipEntry?:boolean;deadlinePassed?:boolean}){
 const cfg=data.config,s=cfg.rolyYeliana??{},features=resolveFeatures(cfg),media=ryMedia(data);
 const text=(key:keyof typeof RY_TEXTS)=>ryText(data,key),show=(key:string)=>s.sections?.[key]!==false;
 const [opened,setOpened]=useState(preview||skipEntry||cfg.entry?.enabled===false),[modal,setModal]=useState<string|null>(null),[music,setMusic]=useState(false);
 const audio=useRef<HTMLAudioElement>(null),main=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(main.current)main.current.inert=!opened||!!modal;},[opened,modal]);
 useEffect(()=>{if(preview)return;const previous=document.body.style.overflow;if(!opened||modal)document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[opened,modal,preview]);
 useEffect(()=>{if(!modal)return;close.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal(null);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[modal]);
 const names=(data.names??'').split(/\s+(?:y|&)\s+/),guest=cfg.activeGuest;
 const guestName=features.guestNames?(guest?.name??data.guest_name):null,passes=features.passes?(guest?.passes??data.guest_passes):null;
 const date=data.event_date?new Date(data.event_date.slice(0,10)+'T12:00:00'):null;
 const iso=data.event_date?.slice(0,10)+'T'+(data.ceremony_time??'00:00').slice(0,5)+':00';
 const count=useCountdown(data.event_date?iso:'1970-01-01T00:00:00');
 const calendar='https://www.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:'Boda '+data.names,dates:iso.replace(/[-:]/g,'')+'/'+(data.event_date??'').replace(/-/g,'')+'T230000',location:data.ceremony_place??''});
 const icon=(name:string,key:string,size=85,colors?:Record<string,string>,speed?:number)=>{
  const source=originalInvitationAsset(cfg.sectionIcons?.[key]||name),palette=colors??cfg.sectionIconColors?.[key];
  return <div className={styles.icon} data-default-color={key!=='gallery' && (!palette || !Object.keys(palette).length) || undefined} style={{color:cfg.iconColor??cfg.theme?.line??'#83917b',width:size*(cfg.iconScale??1),height:size*(cfg.iconScale??1)}}>{source.endsWith('.json')?<LottieIcon icon={source} size={size*(cfg.iconScale??1)} colors={palette&&Object.keys(palette).length?palette:key==='gallery'?undefined:{'#000000':cfg.iconColor??'#83917b','#33cccc':cfg.iconColor??'#83917b','#00cccc':cfg.iconColor??'#83917b'}} speed={speed??cfg.sectionIconSpeeds?.[key]??1}/>:<EventIcon name={source} stroke={cfg.iconColor??'#83917b'} className="w-full h-full"/>}</div>;
 };
 const button=(label:string,url?:string|null)=>((demo||preview)&&label!==text('maps')||!url)?<button className={styles.button} onClick={()=>setModal(label)}>{label}</button>:<a className={styles.button} href={url} target="_blank" rel="noopener noreferrer">{label}</a>;
 const map=(address:string|null)=>address?.startsWith('https://')?address:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address??'');
 const portrait=(key:string,images:string[],cls:string)=>show(key)&&<Carousel className={cls} images={images} active={opened&&!preview} seconds={s.slideSeconds}/>;
 const panel=(children:ReactNode)=> <div className={styles.giftOption}>{children}</div>;
 const theme={'--ry-bg':cfg.theme?.bg??'#eff0eb','--ry-green':cfg.theme?.primary??'#4e5f49','--ry-ink':cfg.theme?.text??'#5d6623','--ry-line':cfg.theme?.line??'#83917b','--ry-width':(cfg.tokens?.contentWidth??1140)+'px','--ry-background':`url("${s.backgroundImage??RY_ROOT+'jairo-y-GabrielaRecurso-47cuerpo-1-copia.webp'}")`} as CSSProperties;
 return <div className={styles.scope}><div className={styles.page} style={theme}>
  {features.music&&cfg.musicUrl&&!preview&&<audio ref={audio} src={originalInvitationAsset(cfg.musicUrl)} loop preload="none" onPlay={()=>setMusic(true)} onPause={()=>setMusic(false)}/>}
  {!opened&&<div className={styles.entry} role="dialog" aria-modal="true" aria-label="Abrir invitación"><p>{text('news')}</p><h1>{text('headline')}</h1><div className={styles.newsDate}>{date ? `${date.toLocaleDateString('es',{weekday:'long'}).toUpperCase()},${date.getDate()} DE ${date.toLocaleDateString('es',{month:'long'}).toUpperCase()}, ${date.getFullYear()}` : ''}</div><button className={styles.button} onClick={()=>{setOpened(true);void audio.current?.play().catch(()=>{});requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}}>{text('entry')}</button></div>}
  <main ref={main} aria-hidden={!opened||!!modal}>
   <section className={styles.hero} style={{backgroundImage:`url("${data.cover_image_url??''}")`}}><h1 ref={heading} tabIndex={-1} className={styles.monogram} aria-label={data.names??undefined}><span>{names[0]?.[0]}</span><span>{names[1]?.[0]}</span></h1></section>
   {show('guests')&&<section className={styles.guests}><div className={styles.heartRule}><i/>♥<i/></div>{guestName&&<h2>{guestName}</h2>}{!!passes&&<><p>{text('reserved')}</p><h2>{passes} {passes===1?'Pase':'Pases'}</h2><p>{text('honor')}</p></>}</section>}
   {show('family')&&<section className={styles.family}><p>{cfg.blessing||text('family')}</p><div className={styles.parents}>{[[text('groom'),data.parents_groom],[text('bride'),data.parents_bride]].map(([label,list],i)=><div key={i}><h2>{label as string}</h2><p>{(list as string[]).join('\n')}</p></div>)}</div></section>}
   {portrait('firstPortrait',media.first,styles.firstPortrait)}
   {show('names')&&<section className={styles.names}><h2>{text('us')}</h2><p>{names[0]}</p><em>&amp;</em><p>{names[1]}</p></section>}
   {show('date')&&<section className={styles.date}><p>{text('dateIntro')}</p><div className={styles.dateRow}><span>{date?.toLocaleDateString('es',{weekday:'long'}).toUpperCase()}</span><strong>{date?.getDate()}</strong><span>{date?.toLocaleDateString('es',{month:'long'}).toUpperCase()}</span></div><div className={styles.countdown}><p>{text('remaining')}</p><div>{[['Días',count.days],['Hrs',count.hours],['Mins',count.mins],['Segs',count.secs]].map(([label,value])=><span key={label}><b>{String(value).padStart(2,'0')}</b><small>{label}</small></span>)}</div>{features.calendar&&<a className={styles.calendar} href={calendar} target="_blank" rel="noopener noreferrer">{text('calendar')}</a>}</div></section>}
   {portrait('secondPortrait',media.second,styles.secondPortrait)}
   {show('venues')&&<section className={styles.venues}>{[{label:text('civil'),place:data.ceremony_place,time:data.ceremony_time,address:data.ceremony_address,source:RY_ICONS.civil,key:'ceremony'},{label:text('religious'),place:data.reception_place,time:data.reception_time,address:data.reception_address,source:RY_ICONS.church,key:'reception'}].filter(v=>v.place).map(v=><div key={v.key}>{icon(v.source,v.key,100)}<h2>{v.label}</h2><p>{v.place}</p><div className={styles.venueActions}><span className={styles.time}>{v.time?new Date('2000-01-01T'+v.time.slice(0,5)).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):''}</span>{button(text('maps'),map(v.address))}</div></div>)}</section>}
   {show('dress')&&<section className={styles.dress}><img src={s.dressImage??RY_ROOT+'Recurso-1vestimenta-dress.svg'} alt=""/><h2>{text('dress')}</h2><p>{data.dress_code}</p><p>{text('dressDetail')}</p><p>{text('dressNote')}</p></section>}
   {portrait('thirdPortrait',media.third,styles.thirdPortrait)}
   {show('program')&&<section className={styles.program}><h2>{text('program')}</h2><div className={styles.itinerary}>{data.itinerary.map((step,i)=><div key={i}>{icon(step.icon||RY_ICONS.civil,'itinerary-'+i,75,step.iconColors,step.iconSpeed)}<div className={styles.eventText}><h3>{step.time}</h3><p>{step.label}</p>{step.place&&<p>{step.place}</p>}{step.note&&<p>{step.note}</p>}</div></div>)}</div></section>}
   {show('gift')&&<section className={styles.gift}><div className={styles.giftCard}>{icon(RY_ICONS.gift,'gift',110)}<h2>{text('gift')}</h2><p>{data.gift_message}</p><div className={styles.giftOptions}>{cfg.giftQrUrl&&panel(<><h2>{text('qr')}</h2><img className={styles.qr} src={cfg.giftQrUrl} alt="Código QR para regalo"/></>)}{panel(<><img className={styles.registry} src={s.registryImage??RY_ROOT+'Novios-multicenter-2.webp'} alt="Novios Multicenter"/>{button(cfg.giftRegistryLabel||text('contact'),cfg.giftRegistryUrl)}</>)}</div>{data.bank_account&&<p>{data.bank_account}</p>}<p>{cfg.giftOther||text('otherGift')}</p></div></section>}
   {show('rsvp')&&<section className={styles.rsvp}><p>{text('punctuality')}</p><h2>{text('rsvp')}</h2><button className={styles.button} onClick={()=>setModal('rsvp')}>{text('confirm')}</button></section>}
   {show('details')&&<section className={styles.details}>{data.no_kids&&<div>{icon(RY_ICONS.noKids,'noKids',80)}<h2>{text('adults')}</h2><p>{text('adultsNote')}</p></div>}{features.photoSharing&&<div>{icon(RY_ICONS.photo,'gallery',85)}<p>{text('share')}</p>{button(text('shareButton'),data.gallery_url)}</div>}</section>}
   {show('verse')&&<section className={styles.verse}>{icon(RY_ICONS.couple,'closing',80)}<p>{text('verse')}</p></section>}
   {portrait('closingPortrait',media.closing,styles.closingPortrait)}
   <footer className={styles.footer}><span>Enkarta</span><p>¿Deseas una invitación para tu evento? <a href="/contacto/whatsapp?placement=invitation_footer">Contáctanos</a></p></footer>
  </main>
  {opened&&cfg.musicUrl&&features.music&&!preview&&<button className={styles.music} aria-label={music?'Pausar música':'Reproducir música'} onClick={()=>{if(music)audio.current?.pause();else void audio.current?.play().catch(()=>{});}}>♫</button>}
  {modal&&<div className={styles.modal} role="dialog" aria-modal="true" aria-label={modal==='rsvp'?text('rsvp'):modal}><div><button ref={close} className={styles.close} onClick={()=>setModal(null)} aria-label="Cerrar">×</button>{modal==='rsvp'&&features.smartRsvp?<ConfirmationForm slug={data.slug} guest={guest} guestName={guestName??undefined} maxPasses={passes??undefined} theme={resolveBlockTheme(cfg.theme)} demo={demo||preview} deadlinePassed={deadlinePassed}/>:modal==='rsvp'&&!demo&&!preview&&data.phone_whatsapp?<a className={styles.button} href={'https://wa.me/'+data.phone_whatsapp.replace(/\D/g,'')}>{text('confirm')}</a>:<><h2>{modal==='rsvp'?text('rsvp'):modal}</h2><p>Esta es una invitación de muestra.</p></>}</div></div>}
 </div></div>;
}
