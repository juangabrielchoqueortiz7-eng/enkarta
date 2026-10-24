'use client';

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { BuilderConfig, InvitationParsed } from '@/lib/types';
import { OPERA_ASSETS as A, operaDate, operaNames } from '@/lib/opera';
import { OPERA_ENTRY_ASSETS, OPERA_MEDIA as M, OPERA_ORIGINALS as originals } from '@/lib/opera-assets';
import { useOperaReveals } from '@/lib/use-opera-reveals';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { resolveFeatures } from '@/lib/packages';
import { paradiseReferenceClock, paradiseReferenceMaps } from '@/lib/paradise-reference';
import { ParadiseReferenceCarousel, paradiseReferenceHref as safeHref } from './ParadiseReferenceSections';
import { emitInvitationAnalytics } from './InvitationAnalytics';
import ParadiseReferenceMusic, { startParadiseReferenceMusic } from './ParadiseReferenceMusic';
import OperaOriginalIcon from './OperaOriginalIcon';
import styles from './Opera.module.css';

const PreviewMode = createContext(false);

function operaTheme(c: BuilderConfig): CSSProperties {
  return { '--op-accent': c.theme?.primary || '#f7e0a5', '--op-dark': c.theme?.primaryDeep || '#17150f', '--op-paper': c.theme?.bg || '#090909', '--op-ink': c.theme?.text || '#f7e0a5', '--op-on-accent': c.theme?.onPrimary || '#090909', '--op-marble': 'url("'+M.background.localPath+'")', '--op-left-leaves': 'url("'+M.foliageLeft.localPath+'")', '--op-right-leaves': 'url("'+M.foliageRight.localPath+'")' } as CSSProperties;
}

/** Archived paper and wax seal; the opening gesture owns the guest's audio choice. */
export function OperaEntry({ data, children, label }: { data: InvitationParsed; children: ReactNode; label?: string }) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const active = useRef(false), opening = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = useRef<HTMLDivElement>(null), gate = useRef<HTMLDivElement>(null);
  const buttonLabel = label ?? data.config.entry?.label ?? 'Abrir nuestra invitación';
  const names = operaNames(data.names), date = operaDate(data.event_date);
  const hasMusic = resolveFeatures(data.config).music && !!safeHref(data.config.musicUrl);
  const opened = phase === 'open';
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (timer.current !== null) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    const node = content.current;
    if (opened) {
      node?.removeAttribute('inert');
      const target = node?.querySelector<HTMLElement>('h1') ?? node;
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
      // Notify motion only after React committed the open, interactive document.
      window.dispatchEvent(new CustomEvent('enkarta:enter'));
    } else {
      node?.setAttribute('inert', '');
      gate.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
    return () => node?.removeAttribute('inert');
  }, [opened]);
  useEffect(() => {
    if (opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [opened]);
  const enter = (withMusic: boolean) => {
    if (!active.current || opening.current) return;
    opening.current = true;
    if (withMusic && hasMusic) startParadiseReferenceMusic(content.current);
    emitInvitationAnalytics('entry_open');
    setPhase('opening');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || connection?.saveData;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!active.current) return;
      setPhase('open');
    }, reduced ? 0 : 800);
  };
  return <>
    <div ref={content} aria-hidden={!opened}>{children}</div>
    {!opened && <div ref={gate} className={styles.entry} style={operaTheme(data.config)} data-opera-entry={phase} role="dialog" aria-modal="true" aria-label="Abrir invitación" aria-busy={phase === 'opening'} onKeyDown={event => {
      if (event.key === 'Tab') {
        const buttons = Array.from(gate.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (!buttons.length) return;
        event.preventDefault();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
      if (event.key === 'Escape') { event.preventDefault(); enter(false); }
    }}>
      <div className={styles.entryIdentity}><p>{[names.first,names.second].filter(Boolean).join(" y ")}</p>{date && <time dateTime={date.iso}>{date.entryLine}</time>}</div>
      <div className={styles.envelope} data-opera-envelope aria-hidden="true">
        <div className={styles.envelopeLeft} data-opera-entry-panel="left" style={{ backgroundImage: `url("${OPERA_ENTRY_ASSETS.left}")` }} />
        <div className={styles.envelopeRight} data-opera-entry-panel="right" style={{ backgroundImage: `url("${OPERA_ENTRY_ASSETS.right}")` }} />
      </div>
      <button className={styles.sealButton} type="button" onClick={() => enter(true)} aria-label={buttonLabel || 'Abrir invitación'} aria-disabled={phase === 'opening'}>
        <span className={styles.entryLabel}>{phase === 'opening' ? 'Abriendo invitación…' : buttonLabel}</span>
        <svg className={styles.entryArrow} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 2 5 5 5-5M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <img src={OPERA_ENTRY_ASSETS.seal} width={344} height={344} alt="" loading="eager" decoding="async" draggable={false} data-opera-entry-seal />
      </button>
      {hasMusic && <button className={styles.entrySilent} type="button" onClick={() => enter(false)} aria-disabled={phase === 'opening'}>Abrir sin música</button>}
    </div>}
  </>;
}

function Icon({ role, config, sectionKey, size = 100, ink, src, colors, speed, className }: {
  role: keyof typeof originals; config: BuilderConfig; sectionKey?: string; size?: number; ink?: string;
  src?: string; colors?: Record<string,string>; speed?: number; className?: string;
}) {
  const preview = useContext(PreviewMode);
  return <OperaOriginalIcon role={role} config={config} sectionKey={sectionKey} size={size} ink={ink} src={src} colors={colors} speed={speed} className={className} active={!preview}  />;
}

function Divider() { return <img className={styles.divider} src={M.divider.localPath} width={196} height={20} alt="" aria-hidden="true" loading="lazy" decoding="async" />; }
const Rsvp = createContext<ReactNode>(null);
export function OperaRsvpProvider({ form, children }: { form: ReactNode; children: ReactNode }) { return <Rsvp.Provider value={form}>{children}</Rsvp.Provider>; }
function RsvpAction({ demo }: { demo: boolean }) {
  const form = useContext(Rsvp), [explain,setExplain] = useState(false);
  if (form) return <details className={styles.rsvpDetails}><summary className={styles.button}>Confirmar mi asistencia</summary><div className={styles.rsvpForm}>{form}</div></details>;
  if (demo) return <><button className={styles.button} type="button" onClick={() => setExplain(true)}>Confirmar mi asistencia</button>{explain && <p className={styles.notice} role="status">Estás viendo una muestra. No se envió ninguna confirmación.</p>}</>;
  return <p className={styles.notice}>Solicita a los anfitriones el enlace de confirmación de tu invitación.</p>;
}

function Countdown({ data }: { data: InvitationParsed }) {
  const date = operaDate(data.event_date), time = paradiseReferenceClock(data.ceremony_time) || paradiseReferenceClock(data.reception_time);
  const until = date ? Date.parse(`${date.iso}T${time ? time.slice(0,5) : '00:00'}:00-04:00`) : NaN;
  const [now,setNow] = useState<number|null>(null), media = useMediaPreferences();
  useEffect(() => { if (!media.pageVisible || !Number.isFinite(until)) return; setNow(Date.now()); const timer=setInterval(()=>setNow(Date.now()),1000); return()=>clearInterval(timer); },[until,media.pageVisible]);
  if (!date) return null;
  const remaining=now === null ? null : Math.max(0,Math.floor((until-now)/1000));
  const values=remaining===null ? ['—','—','—','—'] : [Math.floor(remaining/86400),Math.floor(remaining/3600)%24,Math.floor(remaining/60)%60,remaining%60].map(value=>String(value).padStart(2,'0'));
  return <div className={styles.countdown} role="timer" aria-label="Tiempo restante para nuestra boda">{values.map((value,i)=><div key={i}><span>{value}</span><small>{['Días','Horas','Minutos','Segundos'][i]}</small></div>)}</div>;
}

function Venue({ config, role, title, time, place, address }: { config: BuilderConfig; role: 'ceremony'|'reception'; title: string; time?: string|null; place?: string|null; address?: string|null }) {
  const map=paradiseReferenceMaps(place || null,address || null);
  return <article className={styles.venue}><Icon role={role} sectionKey={role} config={config} size={120} /><h3>{title}</h3>{time && <time>{paradiseReferenceClock(time)}</time>}{place && <p className={styles.place}>{place}</p>}{address && <p>{address}</p>}{map && <a className={styles.button} href={map} target="_blank" rel="noopener noreferrer">Ver ubicación</a>}</article>;
}

function Gifts({ data }: { data: InvitationParsed }) {
  const c=data.config, accounts=c.giftAccounts?.filter(account=>account.account.trim()), bank=data.bank_account?.trim();
  const registry=safeHref(c.giftRegistryUrl), [status,setStatus]=useState(''), generation=useRef(0), signature=JSON.stringify([bank,accounts]);
  useEffect(()=>{const invalidate=()=>{generation.current++;};invalidate();setStatus('');return invalidate;},[signature]);
  const copy=async(text:string)=>{const request=generation.current;try{await navigator.clipboard.writeText(text);if(request===generation.current)setStatus('Datos copiados.');}catch{if(request===generation.current)setStatus('No se pudo copiar. Selecciona los datos para copiarlos.');}};
  if (!data.gift_message && !bank && !accounts?.length && !registry) return null;
  return <section className={styles.gifts} data-opera-section="gifts"><Icon role="gift" sectionKey="gift" config={c} size={110}/><h2>Un detalle con cariño</h2>{data.gift_message && <p>{data.gift_message}</p>}<Icon role="envelopes" config={c} size={110}/>{bank && <div className={styles.account}><p>{bank}</p><button type="button" className={styles.textButton} onClick={()=>{void copy(bank);}}>Copiar datos</button></div>}{accounts?.map((account,i)=><div className={styles.account} key={i}><h3>{account.name}</h3><p>{account.account}</p><button type="button" className={styles.textButton} onClick={()=>{void copy(account.account);}}>Copiar cuenta</button></div>)}{registry && <a className={styles.button} href={registry} target="_blank" rel="noopener noreferrer">{c.giftRegistryLabel ?? 'Ver mesa de regalos'}</a>}<p role="status" className={styles.copyStatus}>{status}</p></section>;
}

export default function Opera({ data,preview=false,skipEntry=false,demo=false }: { data: InvitationParsed;preview?:boolean;skipEntry?:boolean;demo?:boolean;deadlinePassed?:boolean }) {
  const c=data.config, features=resolveFeatures(c), root=useRef<HTMLDivElement>(null);
  const motionMode=useOperaReveals(root,preview,c.motion?.preset==='none');
  const names=operaNames(data.names), date=operaDate(data.event_date), hero=safeHref(data.cover_image_url ?? A.hero);
  const detail=safeHref(c.sectionImages?.operaDetail ?? A.detail), celebration=safeHref(c.sectionImages?.operaCelebration ?? A.celebration);
  const intro=c.introMessage ?? data.message, welcome=c.welcomeTitle ?? 'Guardamos este día para ti';
  const venues=[...(data.ceremony_place || data.ceremony_address || paradiseReferenceClock(data.ceremony_time) ? [{role:'ceremony' as const,title:c.ceremonyDesc ?? 'Ceremonia religiosa',time:data.ceremony_time,place:data.ceremony_place,address:data.ceremony_address}] : []),...(data.reception_place || data.reception_address || paradiseReferenceClock(data.reception_time) ? [{role:'reception' as const,title:c.receptionDesc ?? 'Recepción social',time:data.reception_time,place:data.reception_place,address:data.reception_address}] : [])];
  const gallery=(c.galleryImages ?? []).slice(0,Math.max(0,features.galleryMax));
  const itineraryRoles=['ceremony','receptionTimeline','dinner','cake','bouquet','party'] as const;
  const music=features.music ? safeHref(c.musicUrl) : undefined, share=features.photoSharing ? safeHref(data.gallery_url) : undefined;
  const guest=c.activeGuest, lodging=features.lodging ? c.lodging?.filter(item=>item.name || safeHref(item.image)) : [];
  const compactDate=date ? date.iso.replaceAll('-','') : '';
  const calendarEnd=date ? new Date(Date.parse(date.iso+'T00:00:00Z')+86400000).toISOString().slice(0,10).replaceAll('-','') : '';
  const calendar=date ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Boda de '+[names.first,names.second].filter(Boolean).join(' y '))}&dates=${compactDate}/${calendarEnd}&ctz=America%2FLa_Paz` : undefined;
  const page=<>
    <header className={`${styles.hero} ${!hero ? styles.heroWithoutImage : ''}`} data-opera-section="hero">
      {hero && <figure className={styles.heroPhoto}><img data-opera-photo src={hero} width={1536} height={1024} alt={hero===A.hero ? 'Pareja adulta ficticia en un patio de piedra iluminado al anochecer, fotografía creada con IA' : 'Fotografía de la pareja'} loading="eager" decoding="async"/></figure>}
      <div className={styles.heroPanel}><div className={styles.heroFrame}><h1 aria-label={[names.first,names.second].filter(Boolean).join(' y ')}><span>{names.first}</span>{names.second && <><i aria-hidden="true">&amp;</i><span>{names.second}</span></>}</h1>{date && <><div className={styles.heroDate}><span>{date.weekday}</span><time dateTime={date.iso}>{date.day}</time><span>{date.month}</span></div><p className={styles.heroCity}>{[c.city,date.year].filter(Boolean).join(' · ')}</p></>}</div>{(c.verse || c.verseRef) && <blockquote className={styles.verse}>{c.verse && <p>{c.verse}</p>}{c.verseRef && <cite>{c.verseRef}</cite>}</blockquote>}</div>
    </header>
    {(welcome || intro || detail) && <section className={styles.welcome} data-opera-section="welcome">{welcome && <h2>{welcome}</h2>}{intro && <p>{intro}</p>}{detail && <figure className={styles.portrait}><img data-opera-photo src={detail} width={1536} height={1024} alt={detail===A.detail ? 'Retrato de la pareja adulta ficticia al atardecer, fotografía creada con IA' : 'Fotografía de nuestra historia'} loading="lazy" decoding="async"/><figcaption>{[names.first,names.second].filter(Boolean).join(' y ')}</figcaption></figure>}</section>}
    {date && <section className={styles.dateSection} data-opera-section="date"><h2>{date.entryLine}</h2>{data.ceremony_time && <p>{paradiseReferenceClock(data.ceremony_time)}</p>}{c.city && <p>{c.city}</p>}<Countdown data={data}/>{calendar && <a className={styles.button} href={calendar} target="_blank" rel="noopener noreferrer">Agregar a mi calendario</a>}</section>}
    {guest && features.guestNames && <section className={styles.guest} data-opera-section="guest"><p>Hemos reservado este día contigo</p><h2>{guest.name}</h2>{features.passes && <p>{guest.passes} {guest.passes===1 ? 'pase reservado' : 'pases reservados'}</p>}{features.tableAssignment && guest.tableNo && <p>Mesa {guest.tableNo}</p>}</section>}
    {(data.parents_bride.length>0 || data.parents_groom.length>0 || data.sponsors.length>0) && <section className={styles.parents} data-opera-section="parents">{c.blessing && <h2>{c.blessing}</h2>}<div>{data.parents_bride.length>0 && <article><h3>Familia de la novia</h3>{data.parents_bride.map((name,i)=><p key={i}>{name}</p>)}</article>}{data.parents_groom.length>0 && <article><h3>Familia del novio</h3>{data.parents_groom.map((name,i)=><p key={i}>{name}</p>)}</article>}{data.sponsors.map((item,i)=><article key={i}><h3>{item.role}</h3><p>{item.names}</p></article>)}</div></section>}
    {venues.length>0 && <section className={styles.venues} data-opera-section="venues"><h2>El lugar de nuestro encuentro</h2><div>{venues.map(venue=><Venue key={venue.role} config={c} {...venue}/>)}</div></section>}
    {data.itinerary.length>0 && <section className={styles.itinerary} data-opera-section="itinerary"><h2>Así celebraremos</h2><ol>{data.itinerary.map((item,i)=><li key={i} data-opera-itinerary-item><Icon role={itineraryRoles[i] ?? 'party'} sectionKey={`itinerary-${i}`} src={item.icon} colors={item.iconColors} speed={item.iconSpeed} config={c} size={100}/>{item.time && <time>{paradiseReferenceClock(item.time)}</time>}<h3>{item.label}</h3>{item.place && <p>{item.place}</p>}{item.note && <p className={styles.itemNote}>{item.note}</p>}{item.duration && <p>{item.duration}</p>}</li>)}</ol></section>}
    {!!lodging?.length && <section className={styles.lodging} data-opera-section="lodging"><h2>{c.lodgingTitle ?? 'Para quienes vienen de lejos'}</h2><div>{lodging.map((item,i)=><article key={i}>{safeHref(item.image) && <img src={safeHref(item.image)} alt={item.name} loading="lazy" decoding="async"/>}<h3>{item.name}</h3>{item.desc && <p>{item.desc}</p>}{safeHref(item.url) && <a className={styles.button} href={safeHref(item.url)} target="_blank" rel="noopener noreferrer">Ver hospedaje</a>}</article>)}</div></section>}
    <Gifts data={data}/>
    {(c.storyTitle || c.storyMessage) && <section className={styles.story} data-opera-section="story">{c.storyTitle && <h2>{c.storyTitle}</h2>}{c.storyMessage && <p>{c.storyMessage}</p>}<Divider/></section>}
    {celebration && <figure className={styles.celebration} data-opera-section="celebration"><img data-opera-photo src={celebration} width={1536} height={1024} alt={celebration===A.celebration ? 'Mesa de celebración en un jardín imaginario al anochecer, imagen creada con IA' : 'Fotografía de nuestra celebración'} loading="lazy" decoding="async"/></figure>}
    {gallery.some(src=>!!safeHref(src)) && <section className={styles.gallery} data-opera-section="gallery"><h2>Momentos que son nuestros</h2><ParadiseReferenceCarousel images={gallery} label="Fotografías de nuestra historia" className={styles.carousel} captions={c.galleryCaptions} intervalMs={5000}/></section>}
    {data.no_kids && <section className={styles.adults} data-opera-section="adults"><Icon role="adults" sectionKey="noKids" config={c} size={110}/><h2>Una celebración para adultos</h2>{c.noKidsMessage && <p>{c.noKidsMessage}</p>}</section>}
    {data.dress_code && <section className={styles.dress} data-opera-section="dress"><div className={styles.dressIcons}><Icon role="jacket" sectionKey="jacket" config={c} size={130}/><Icon role="dress" sectionKey="dressCode" config={c} size={130}/></div>{c.dressCodeTitle && <h2>{c.dressCodeTitle}</h2>}<p>{data.dress_code}</p></section>}
    {features.photoSharing && (c.galleryMessage || share) && <section className={styles.sharing} data-opera-section="sharing"><Icon role="camera" sectionKey="gallery" config={c} size={110}/><h2>Recuerdos para compartir</h2>{c.galleryMessage && <p>{c.galleryMessage}</p>}{share && <a className={styles.button} href={share} target="_blank" rel="noopener noreferrer">Compartir fotografías</a>}</section>}
    <section className={styles.rsvp} data-opera-section="rsvp"><Icon role="reception" sectionKey="rsvp" config={c} size={120}/><h2>¿Nos acompañas?</h2>{c.rsvpMessage && <p>{c.rsvpMessage}</p>}<RsvpAction demo={demo || preview}/><p className={styles.signature}>{[names.first,names.second].filter(Boolean).join(' y ')}</p></section>
    <footer className={styles.footer} data-opera-section="footer"><p>La noche más bonita empieza contigo.</p><Link href="/" aria-label="Enkarta, invitaciones digitales">ENKARTA</Link>{demo && <p className={styles.demoNotice}>Muestra de diseño · pareja e imágenes creadas con IA y lugares ficticios.</p>}</footer>
    {music && <ParadiseReferenceMusic src={music} preview={preview} color="#f7e0a5" iconSize={34} className={styles.musicButton} statusClassName={styles.musicStatus}/>}
  </>;
  return <PreviewMode.Provider value={preview}><div ref={root} className={styles.page} style={operaTheme(c)} data-opera data-opera-motion={motionMode} data-preview={preview ? '' : undefined}>{preview || skipEntry || c.entry?.enabled===false ? page : <OperaEntry data={data}>{page}</OperaEntry>}</div></PreviewMode.Provider>;
}
