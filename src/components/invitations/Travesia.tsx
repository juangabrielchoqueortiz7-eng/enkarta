'use client';

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { InvitationParsed } from '@/lib/types';
import { TRAVESIA_ASSETS as A, travesiaDate, travesiaNames } from '@/lib/travesia';
import { resolveFeatures } from '@/lib/packages';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { paradiseReferenceClock, paradiseReferenceMaps } from '@/lib/paradise-reference';
import { paradiseReferenceHref } from './ParadiseReferenceSections';
import { emitInvitationAnalytics } from './InvitationAnalytics';
import ParadiseReferenceMusic, { startParadiseReferenceMusic } from './ParadiseReferenceMusic';
import styles from './Travesia.module.css';

/** Geometry drawn for Travesía; never an approximation of an archived illustration. */
function JourneyArrow({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 56 24" fill="none" aria-hidden="true"><path d="M1 12h52M42 2l11 10-11 10" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

const Rsvp = createContext<ReactNode>(null);
/** This boundary receives only the form already authorized by the server. */
export function TravesiaRsvpProvider({ form, children }: { form: ReactNode; children: ReactNode }) {
  return <Rsvp.Provider value={form}>{children}</Rsvp.Provider>;
}

function RsvpAction({ demo }: { demo: boolean }) {
  const form = useContext(Rsvp);
  const [explain, setExplain] = useState(false);
  if (form) return <details className={styles.rsvpDetails}><summary className={styles.button}>Confirmar mi asistencia <JourneyArrow /></summary><div className={styles.rsvpForm}>{form}</div></details>;
  if (demo) return <><button className={styles.button} type="button" onClick={() => setExplain(true)}>Confirmar mi asistencia <JourneyArrow /></button>{explain && <p className={styles.notice} role="status">Esta es una vista de muestra. No se envió ninguna confirmación.</p>}</>;
  return <p className={styles.notice}>Solicita a los anfitriones el enlace de confirmación de tu invitación.</p>;
}

/** A native, optional opening. Its single gesture also starts the host's music. */
export function TravesiaEntry({ data, children, label = 'Comenzar el viaje' }: { data: InvitationParsed; children: ReactNode; label?: string }) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const active = useRef(false), opening = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = useRef<HTMLDivElement>(null), gate = useRef<HTMLDivElement>(null);
  const names = travesiaNames(data.names), date = travesiaDate(data.event_date);
  const hero = paradiseReferenceHref(data.cover_image_url ?? A.hero);
  const opened = phase === 'open';
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (timer.current !== null) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    const node = content.current;
    if (opened) {
      node?.removeAttribute('inert');
      const heading = node?.querySelector<HTMLElement>('h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
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
  const enter = () => {
    if (!active.current || opening.current) return;
    opening.current = true;
    startParadiseReferenceMusic(content.current);
    emitInvitationAnalytics('entry_open');
    setPhase('opening');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!active.current) return;
      setPhase('open');
      window.dispatchEvent(new CustomEvent('enkarta:enter'));
    }, reduced ? 0 : 650);
  };
  return <>
    <div ref={content} aria-hidden={!opened}>{children}</div>
    {!opened && <div ref={gate} className={styles.entry} data-travesia-entry={phase} role="dialog" aria-modal="true" aria-label="Abrir invitación" aria-busy={phase === 'opening'} onKeyDown={event => {
      if (event.key === 'Tab') { event.preventDefault(); gate.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); enter(); }
    }}>
      {hero && <img className={styles.entryImage} src={hero} alt="" width={1536} height={1024} loading="eager" decoding="async" />}
      <div className={styles.entryShade} />
      <div className={styles.entryContent}>
        <p className={styles.entryNames}>{names.first}{names.first && names.second && <span>&amp;</span>}{names.second}</p>
        <div className={styles.boarding}>
          <div className={styles.boardingTop}><p>Un viaje para celebrar</p><JourneyArrow /></div>
          <dl><div><dt>Destino</dt><dd>{data.config.city ?? 'Nuestra boda'}</dd></div><div><dt>Fecha</dt><dd>{date?.entryLine ?? 'Próximamente'}</dd></div></dl>
          <button className={styles.entryButton} type="button" onClick={enter} aria-label={label || 'Abrir invitación'} aria-disabled={phase === 'opening'}>{phase === 'opening' ? 'Abriendo invitación…' : label}<JourneyArrow /></button>
        </div>
      </div>
    </div>}
  </>;
}

function Countdown({ data }: { data: InvitationParsed }) {
  const date = travesiaDate(data.event_date);
  const time = paradiseReferenceClock(data.ceremony_time) || paradiseReferenceClock(data.reception_time);
  const until = date ? Date.parse(`${date.iso}T${time ? time.slice(0, 5) : '00:00'}:00-04:00`) : NaN;
  const [now, setNow] = useState<number | null>(null);
  const media = useMediaPreferences();
  useEffect(() => {
    if (!media.pageVisible || !Number.isFinite(until)) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [media.pageVisible, until]);
  if (!date) return null;
  const remaining = now === null ? null : Math.max(0, Math.floor((until - now) / 1000));
  const values = remaining === null ? ['—', '—', '—', '—'] : [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].map(value => String(value).padStart(2, '0'));
  return <div className={styles.countdown} role="timer" aria-label="Tiempo restante para nuestra boda">{values.map((value, index) => <div key={index}><span>{value}</span><small>{['Días', 'Horas', 'Minutos', 'Segundos'][index]}</small></div>)}</div>;
}

function GuestTicket({ data }: { data: InvitationParsed }) {
  const guest = data.config.activeGuest, features = resolveFeatures(data.config);
  if (!guest || !features.guestNames) return null;
  return <section className={styles.guestTicket} aria-label="Invitación personalizada" data-travesia-section="guest">
    <p>Un lugar reservado para</p><h2>{guest.name}</h2>
    {features.passes && <p className={styles.guestPasses}>{guest.passes} {guest.passes === 1 ? 'pase reservado' : 'pases reservados'}</p>}
    {features.tableAssignment && guest.tableNo && <p>Mesa {guest.tableNo}</p>}
  </section>;
}

function Venue({ data, reception = false }: { data: InvitationParsed; reception?: boolean }) {
  const place = reception ? data.reception_place : data.ceremony_place;
  const address = reception ? data.reception_address : data.ceremony_address;
  const time = paradiseReferenceClock(reception ? data.reception_time : data.ceremony_time);
  const maps = paradiseReferenceMaps(place, address);
  const title = (reception ? data.config.receptionDesc : data.config.ceremonyDesc) ?? (reception ? 'La celebración' : 'El sí, quiero');
  if (!place && !address && !time) return null;
  return <article className={styles.venue}>
    {title && <h3>{title}</h3>}
    {time && <time>{time}</time>}
    {place && <p className={styles.venueName}>{place}</p>}
    {address && <p className={styles.address}>{address}</p>}
    {maps && <a className={styles.textLink} href={maps} target="_blank" rel="noopener noreferrer">Ver ubicación <JourneyArrow /></a>}
  </article>;
}

function Gifts({ data }: { data: InvitationParsed }) {
  const accounts = data.config.giftAccounts?.filter(account => account.account.trim());
  const bank = data.bank_account?.trim();
  const registry = paradiseReferenceHref(data.config.giftRegistryUrl);
  const registryLabel = data.config.giftRegistryLabel ?? 'Ver mesa de regalos';
  const [copyState, setCopyState] = useState('');
  const generation = useRef(0);
  const signature = JSON.stringify([accounts, bank]);
  useEffect(() => { generation.current += 1; setCopyState(''); return () => { generation.current += 1; }; }, [signature]);
  if (!data.gift_message && !bank && !accounts?.length && !registry) return null;
  const copy = async (text: string) => {
    const request = generation.current;
    try { await navigator.clipboard.writeText(text); if (request === generation.current) setCopyState('Datos copiados.'); }
    catch { if (request === generation.current) setCopyState('No se pudo copiar. Selecciona los datos para copiarlos.'); }
  };
  return <section className={styles.gifts} data-travesia-section="gifts"><h2>El mejor regalo es encontrarnos</h2>
    {data.gift_message && <p>{data.gift_message}</p>}
    {bank && <div className={styles.account}><p>{bank}</p><button className={styles.textButton} type="button" onClick={() => { void copy(bank); }}>Copiar datos</button></div>}
    {accounts?.map((account, index) => <div key={index} className={styles.account}><h3>{account.name}</h3><p>{account.account}</p><button className={styles.textButton} type="button" onClick={() => { void copy(account.account); }}>Copiar cuenta</button></div>)}
    {registry && <a className={styles.textLink} href={registry} target="_blank" rel="noopener noreferrer" aria-label={registryLabel.length ? registryLabel : 'Abrir mesa de regalos'}>{registryLabel} <JourneyArrow /></a>}
    <p role="status" className={styles.copyState}>{copyState}</p>
  </section>;
}

export default function Travesia({ data, preview = false, skipEntry = false, demo = false }: { data: InvitationParsed; preview?: boolean; skipEntry?: boolean; demo?: boolean; deadlinePassed?: boolean }) {
  const c = data.config, features = resolveFeatures(c);
  const names = travesiaNames(data.names), date = travesiaDate(data.event_date);
  const hero = paradiseReferenceHref(data.cover_image_url ?? A.hero);
  const story = paradiseReferenceHref(c.sectionImages?.travesiaStory ?? A.story);
  const celebration = paradiseReferenceHref(c.sectionImages?.travesiaCelebration ?? A.celebration);
  const welcomeTitle = c.welcomeTitle ?? 'Hay viajes que lo cambian todo.';
  const storyTitle = c.storyTitle ?? 'Y de todos los destinos, nos elegimos.';
  const storyMessage = c.storyMessage ?? c.verse;
  const dressTitle = c.dressCodeTitle ?? 'Vístete para celebrar';
  const share = features.photoSharing ? paradiseReferenceHref(data.gallery_url) : undefined;
  const hasParents = data.parents_bride.length > 0 || data.parents_groom.length > 0;
  const theme = { '--tv-lagoon': c.theme?.primary || '#153e45', '--tv-chalk': c.theme?.bg || '#f4f1e8', '--tv-ink': c.theme?.text || '#153e45' } as CSSProperties;
  const page = <>
    <section className={styles.hero} data-travesia-section="hero">
      <div className={styles.heroCopy}><h1 aria-label={[names.first, names.second].filter(Boolean).join(' y ')}><span>{names.first}</span>{names.second && <><i aria-hidden="true">&amp;</i><span>{names.second}</span></>}</h1><p>El comienzo de nuestro<br />próximo gran viaje.</p><a className={styles.heroScroll} href="#travesia-bienvenida" aria-label="Descubrir la invitación"><JourneyArrow /></a></div>
      <div className={styles.heroPhoto}>{hero && <img src={hero} alt={hero === A.hero ? 'Costa imaginaria de piedra caliza, olivo y mar turquesa al atardecer' : 'Imagen de portada de la invitación'} width={1536} height={1024} loading="eager" decoding="async" />}</div>
      <div className={styles.dateStrip}><span>{c.city ?? 'Nuestra boda'}</span>{date && <time dateTime={date.iso}>{date.entryLine}</time>}<span>Te esperamos</span></div>
    </section>

    <section id="travesia-bienvenida" className={styles.welcome} data-travesia-section="welcome">{welcomeTitle && <h2>{welcomeTitle}</h2>}{(c.introMessage ?? data.message) && <p>{c.introMessage ?? data.message}</p>}<JourneyArrow className={styles.welcomeArrow} /></section>
    <GuestTicket data={data} />

    {hasParents && <section className={styles.parents} data-travesia-section="parents">{c.blessing && <p>{c.blessing}</p>}<div>{[data.parents_bride, data.parents_groom].map((list, index) => list.length > 0 && <p key={index}>{list.map((name, i) => <span key={i}>{name}</span>)}</p>)}</div></section>}

    {date && <section className={styles.dateSection} data-travesia-section="date"><div className={styles.dateEditorial}><h2>Guarda este día</h2><time dateTime={date.iso}><span>{date.day}</span><span>{date.month}<br />{date.year}</span></time><p>{date.weekday}</p></div><div className={styles.countdownSide}><p>La cuenta atrás para encontrarnos</p><Countdown data={data} /></div></section>}

    <section className={styles.destinations} data-travesia-section="venues"><h2>Nos vemos aquí</h2><div className={styles.venueColumns}><Venue data={data} /><Venue data={data} reception /></div></section>

    {(celebration || data.dress_code) && <section className={`${styles.celebration} ${!celebration || !data.dress_code ? styles.textOnly : ''}`} data-travesia-section="celebration">{celebration && <img src={celebration} alt={celebration === A.celebration ? 'Mesa de celebración a la luz de las velas en un patio imaginario junto al mar' : 'Imagen de nuestra celebración'} width={1536} height={1024} loading="lazy" decoding="async" />}{data.dress_code && <div className={styles.dress}>{dressTitle && <h2>{dressTitle}</h2>}<p>{data.dress_code}</p></div>}</section>}

    {data.itinerary.length > 0 && <section className={styles.itinerary} data-travesia-section="itinerary"><h2>La ruta de nuestro día</h2><ol>{data.itinerary.map((item, index) => <li key={index}><span className={styles.routeNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><time>{paradiseReferenceClock(item.time)}</time><div><h3>{item.label}</h3>{item.place && <p>{item.place}</p>}{item.note && <p>{item.note}</p>}</div></li>)}</ol></section>}

    {(story || storyTitle || storyMessage) && <section className={`${styles.story} ${!story || !(storyTitle || storyMessage) ? styles.textOnly : ''}`} data-travesia-section="story">{story && <div><img src={story} alt={story === A.story ? 'Brújula de latón, billetes en blanco y un cuaderno sobre lino' : 'Imagen de nuestra historia'} width={1536} height={1024} loading="lazy" decoding="async" /></div>}{(storyTitle || storyMessage) && <div className={styles.storyCopy}>{storyTitle && <h2>{storyTitle}</h2>}{storyMessage && <p>{storyMessage}</p>}{storyMessage && c.verseRef && c.storyMessage == null && <small>{c.verseRef}</small>}</div>}</section>}

    {data.no_kids && <section className={styles.noKids} data-travesia-section="adults"><h2>Una noche para disfrutar</h2>{(c.noKidsMessage ?? 'Esta celebración está pensada para adultos. Gracias por acompañarnos y ayudarnos a vivirla juntos.') && <p>{c.noKidsMessage ?? 'Esta celebración está pensada para adultos. Gracias por acompañarnos y ayudarnos a vivirla juntos.'}</p>}</section>}
    <Gifts data={data} />

    {features.photoSharing && (c.galleryMessage || share || demo) && <section className={styles.photos} data-travesia-section="photos"><h2>Lo que vivamos,<br />que se quede con nosotros.</h2>{c.galleryMessage && <p>{c.galleryMessage}</p>}{share ? <a className={styles.textLink} href={share} target="_blank" rel="noopener noreferrer">Compartir nuestras fotografías <JourneyArrow /></a> : demo ? <p className={styles.notice}>El álbum estará disponible cuando los anfitriones añadan su enlace.</p> : null}</section>}

    <section className={styles.rsvp} data-travesia-section="rsvp"><h2>El viaje empieza<br />contigo.</h2>{c.rsvpMessage && <p>{c.rsvpMessage}</p>}<RsvpAction demo={demo || preview} /><p className={styles.signature}>{[names.first, names.second].filter(Boolean).join(' & ')}</p></section>
    <footer className={styles.footer}><Link href="/" prefetch={false} aria-label="Enkarta, invitaciones digitales">ENKARTA</Link><p>Invitaciones para historias que merecen celebrarse.</p>{demo && <p className={styles.demoNotice}>Muestra de diseño · imágenes creadas con IA y lugares ficticios.</p>}</footer>
    {!preview && features.music && paradiseReferenceHref(c.musicUrl) && <ParadiseReferenceMusic src={paradiseReferenceHref(c.musicUrl)!} color="#f4f1e8" iconSize={29} className={styles.musicButton} statusClassName={styles.musicStatus} />}
  </>;
  const entryEnabled = c.entry?.enabled ?? features.entry;
  return <div className={styles.profile} style={theme} data-travesia data-preview={preview ? '' : undefined}>{preview || skipEntry || !entryEnabled ? page : <TravesiaEntry data={data} label={c.entry?.label ?? 'Comenzar el viaje'}>{page}</TravesiaEntry>}</div>;
}
