'use client';

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { InvitationParsed } from '@/lib/types';
import { CAPITULO_ASSETS as A, capituloDate, capituloNames } from '@/lib/capitulo';
import { resolveFeatures } from '@/lib/packages';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { paradiseReferenceClock, paradiseReferenceMaps } from '@/lib/paradise-reference';
import { paradiseReferenceHref } from './ParadiseReferenceSections';
import { emitInvitationAnalytics } from './InvitationAnalytics';
import ParadiseReferenceMusic, { startParadiseReferenceMusic } from './ParadiseReferenceMusic';
import styles from './Capitulo.module.css';

/** Original editorial geometry; archived artwork is neither changed nor imitated. */
function Arrow() {
  return <svg viewBox="0 0 40 18" fill="none" aria-hidden="true"><path d="M1 9h36M29 1l8 8-8 8" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

const Rsvp = createContext<ReactNode>(null);
/** Only a server-authorized RSVP form may cross this boundary. */
export function CapituloRsvpProvider({ form, children }: { form: ReactNode; children: ReactNode }) {
  return <Rsvp.Provider value={form}>{children}</Rsvp.Provider>;
}

function RsvpAction({ demo }: { demo: boolean }) {
  const form = useContext(Rsvp);
  const [explain, setExplain] = useState(false);
  if (form) return <details className={styles.rsvpDetails}><summary className={styles.button}>Confirmar mi asistencia <Arrow /></summary><div className={styles.rsvpForm}>{form}</div></details>;
  if (demo) return <><button type="button" className={styles.button} onClick={() => setExplain(true)}>Confirmar mi asistencia <Arrow /></button>{explain && <p className={styles.notice} role="status">Esta es una vista de muestra. No se envió ninguna confirmación.</p>}</>;
  return <p className={styles.notice}>Solicita a los anfitriones el enlace de confirmación de tu invitación.</p>;
}

/** Optional native cover, with one guarded gesture and a cleaned-up transition. */
export function CapituloEntry({ data, children, label }: { data: InvitationParsed; children: ReactNode; label?: string }) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const active = useRef(false), opening = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = useRef<HTMLDivElement>(null), gate = useRef<HTMLDivElement>(null);
  const names = capituloNames(data.names), date = capituloDate(data.event_date);
  const hero = paradiseReferenceHref(data.cover_image_url ?? A.hero);
  const buttonLabel = label ?? data.config.entry?.label ?? 'Abrir este capítulo';
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
    {!opened && <div ref={gate} className={styles.entry} data-capitulo-entry={phase} role="dialog" aria-modal="true" aria-label="Abrir invitación" aria-busy={phase === 'opening'} onKeyDown={event => {
      if (event.key === 'Tab') { event.preventDefault(); gate.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); enter(); }
    }}>
      <div className={styles.entryCopy}>
        <p className={styles.entryMasthead}>Capítulo</p>
        <p className={styles.entryHeadline}>La historia<br />continúa.</p>
        <p className={styles.entryNames}>{[names.first, names.second].filter(Boolean).join(' & ')}</p>
        {date && <time dateTime={date.iso}>{date.entryLine}</time>}
        <button className={styles.entryButton} type="button" onClick={enter} aria-label={buttonLabel || 'Abrir invitación'} aria-disabled={phase === 'opening'}>{phase === 'opening' ? 'Abriendo invitación…' : buttonLabel}<Arrow /></button>
      </div>
      {hero && <img className={styles.entryImage} src={hero} alt="" width={1536} height={1024} loading="eager" decoding="async" />}
    </div>}
  </>;
}

function Countdown({ data }: { data: InvitationParsed }) {
  const date = capituloDate(data.event_date);
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

function Guest({ data }: { data: InvitationParsed }) {
  const guest = data.config.activeGuest, features = resolveFeatures(data.config);
  if (!guest || !features.guestNames) return null;
  return <section className={styles.guest} data-capitulo-section="guest" aria-label="Invitación personalizada"><p>Esta historia también lleva tu nombre</p><h2>{guest.name}</h2>{features.passes && <p>{guest.passes} {guest.passes === 1 ? 'pase reservado' : 'pases reservados'}</p>}{features.tableAssignment && guest.tableNo && <p>Mesa {guest.tableNo}</p>}</section>;
}

function Venue({ data, reception = false }: { data: InvitationParsed; reception?: boolean }) {
  const place = reception ? data.reception_place : data.ceremony_place;
  const address = reception ? data.reception_address : data.ceremony_address;
  const time = paradiseReferenceClock(reception ? data.reception_time : data.ceremony_time);
  const maps = paradiseReferenceMaps(place, address);
  const title = (reception ? data.config.receptionDesc : data.config.ceremonyDesc) ?? (reception ? 'La celebración' : 'La ceremonia');
  if (!place && !address && !time) return null;
  return <article className={styles.venue}>{title && <h3>{title}</h3>}{time && <time>{time}</time>}{place && <p className={styles.venueName}>{place}</p>}{address && <p>{address}</p>}{maps && <a className={styles.textLink} href={maps} target="_blank" rel="noopener noreferrer">Consultar ubicación <Arrow /></a>}</article>;
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
  return <section className={styles.gifts} data-capitulo-section="gifts"><h2>Los gestos que nos acompañan</h2>{data.gift_message && <p>{data.gift_message}</p>}{bank && <div className={styles.account}><p>{bank}</p><button className={styles.textButton} type="button" onClick={() => { void copy(bank); }}>Copiar datos</button></div>}{accounts?.map((account, index) => <div key={index} className={styles.account}><h3>{account.name}</h3><p>{account.account}</p><button className={styles.textButton} type="button" onClick={() => { void copy(account.account); }}>Copiar cuenta</button></div>)}{registry && <a className={styles.textLink} href={registry} target="_blank" rel="noopener noreferrer" aria-label={registryLabel || 'Abrir mesa de regalos'}>{registryLabel}<Arrow /></a>}<p className={styles.copyState} role="status">{copyState}</p></section>;
}

export default function Capitulo({ data, preview = false, skipEntry = false, demo = false }: { data: InvitationParsed; preview?: boolean; skipEntry?: boolean; demo?: boolean; deadlinePassed?: boolean }) {
  const c = data.config, features = resolveFeatures(c);
  const names = capituloNames(data.names), date = capituloDate(data.event_date);
  const hero = paradiseReferenceHref(data.cover_image_url ?? A.hero);
  const detail = paradiseReferenceHref(c.sectionImages?.capituloDetail ?? A.detail);
  const celebration = paradiseReferenceHref(c.sectionImages?.capituloCelebration ?? A.celebration);
  const welcome = c.welcomeTitle ?? 'Una noticia que queremos compartir contigo';
  const intro = c.introMessage ?? data.message;
  const storyTitle = c.storyTitle ?? 'Todo empezó con una conversación';
  const storyMessage = c.storyMessage ?? c.verse;
  const dressTitle = c.dressCodeTitle ?? 'El estilo de la noche';
  const share = features.photoSharing ? paradiseReferenceHref(data.gallery_url) : undefined;
  const hasParents = data.parents_bride.length > 0 || data.parents_groom.length > 0;
  const hasVenue = data.ceremony_place || data.ceremony_address || paradiseReferenceClock(data.ceremony_time) || data.reception_place || data.reception_address || paradiseReferenceClock(data.reception_time);
  const theme = { '--cp-ink': c.theme?.primary || '#242825', '--cp-paper': c.theme?.bg || '#f8f7f3', '--cp-text': c.theme?.text || '#242825' } as CSSProperties;
  const page = <>
    <header className={styles.hero} data-capitulo-section="hero">
      <p className={styles.masthead}>Capítulo<span>Una historia para celebrar</span></p>
      <div className={styles.edition}>{date && <time dateTime={date.iso}>{date.entryLine}</time>}{c.city && <span>{c.city}</span>}<span>Edición de nuestra boda</span></div>
      <h1 aria-label={[names.first, names.second].filter(Boolean).join(' y ')}><span>{names.first}</span>{names.second && <><i aria-hidden="true">&amp;</i><span>{names.second}</span></>}</h1>
      <div className={`${styles.heroGrid} ${!hero ? styles.withoutPhoto : ''}`}>
        {hero && <figure className={styles.heroFigure}><img src={hero} alt={hero === A.hero ? 'Pareja ficticia caminando por una calle de ciudad, fotografía editorial en blanco y negro creada con IA' : 'Fotografía de portada de la invitación'} width={1536} height={1024} loading="eager" decoding="async" /><figcaption>Hay días que merecen una edición especial.</figcaption></figure>}
        <div className={styles.heroDeck}><p className={styles.headline}>Nos elegimos.<br />Y volvemos a elegirnos.</p><p>La próxima página de nuestra historia empieza con un sí. Queremos escribirla cerca de quienes más queremos.</p><a className={styles.textLink} href="#capitulo-bienvenida">Leer nuestra invitación <Arrow /></a></div>
      </div>
    </header>

    {(welcome || intro) && <section id="capitulo-bienvenida" className={styles.welcome} data-capitulo-section="welcome">{welcome && <h2>{welcome}</h2>}{intro && <p>{intro}</p>}</section>}
    <Guest data={data} />
    {date && <section className={styles.dateSection} data-capitulo-section="date"><div className={styles.dateEditorial}><h2>Una fecha para recordar</h2><time dateTime={date.iso}><span>{date.day}</span><span>{date.month}<br />{date.year}</span></time><p>{date.weekday}</p></div><div className={styles.countdownSide}><p>Nos separa de este nuevo capítulo</p><Countdown data={data} /></div></section>}

    {(storyTitle || storyMessage || detail) && <section className={`${styles.story} ${!detail || !(storyTitle || storyMessage) ? styles.singleColumn : ''}`} data-capitulo-section="story"><div className={styles.storyCopy}>{storyTitle && <h2>{storyTitle}</h2>}{storyMessage && <p>{storyMessage}</p>}{storyMessage && c.verseRef && c.storyMessage == null && <small>{c.verseRef}</small>}</div>{detail && <img src={detail} alt={detail === A.detail ? 'Manos de una pareja ficticia sosteniendo un cuaderno de votos en blanco, imagen creada con IA' : 'Fotografía de nuestra historia'} width={1536} height={1024} loading="lazy" decoding="async" />}</section>}
    {hasParents && <section className={styles.parents} data-capitulo-section="parents">{c.blessing && <h2>{c.blessing}</h2>}<div>{[data.parents_bride, data.parents_groom].map((list, index) => list.length > 0 && <p key={index}>{list.map((name, i) => <span key={i}>{name}</span>)}</p>)}</div></section>}
    {celebration && <figure className={styles.celebration} data-capitulo-section="celebration"><img src={celebration} alt={celebration === A.celebration ? 'Patio imaginario preparado para una boda, fotografía en blanco y negro creada con IA' : 'Fotografía de nuestra celebración'} width={1536} height={1024} loading="lazy" decoding="async" /><figcaption>El escenario es especial. La compañía lo hará inolvidable.</figcaption></figure>}

    {(data.itinerary.length > 0 || data.dress_code) && <section className={styles.dayPlan} data-capitulo-section="itinerary">{data.itinerary.length > 0 && <div className={styles.itinerary}><h2>Así se escribe el día</h2><ol>{data.itinerary.map((item, index) => <li key={index}><time>{paradiseReferenceClock(item.time)}</time><div><h3>{item.label}</h3>{item.place && <p>{item.place}</p>}{item.note && <p>{item.note}</p>}</div></li>)}</ol></div>}{data.dress_code && <aside className={styles.dress}>{dressTitle && <h2>{dressTitle}</h2>}<p>{data.dress_code}</p></aside>}</section>}
    {hasVenue && <section className={styles.venues} data-capitulo-section="venues"><h2>El lugar de los acontecimientos</h2><div><Venue data={data} /><Venue data={data} reception /></div></section>}
    {data.no_kids && <section className={styles.adults} data-capitulo-section="adults"><h2>Una celebración para adultos</h2>{(c.noKidsMessage ?? 'Hemos preparado esta celebración para adultos. Gracias por acompañarnos y ayudarnos a disfrutar de la noche.') && <p>{c.noKidsMessage ?? 'Hemos preparado esta celebración para adultos. Gracias por acompañarnos y ayudarnos a disfrutar de la noche.'}</p>}</section>}
    {features.photoSharing && (c.galleryMessage || share) && <section className={styles.sharing} data-capitulo-section="sharing"><h2>Los recuerdos también se escriben con imágenes</h2>{c.galleryMessage && <p>{c.galleryMessage}</p>}{share && <a className={styles.textLink} href={share} target="_blank" rel="noopener noreferrer">Compartir nuestras fotografías <Arrow /></a>}</section>}

    <section className={styles.rsvp} data-capitulo-section="rsvp"><div><h2>Tu nombre en nuestra próxima página.</h2>{c.rsvpMessage && <p>{c.rsvpMessage}</p>}</div><div className={styles.rsvpAction}><RsvpAction demo={demo || preview} /><p className={styles.signature}>{[names.first, names.second].filter(Boolean).join(' & ')}</p></div></section>
    <Gifts data={data} />
    <footer className={styles.footer}><Link href="/" prefetch={false} aria-label="Enkarta, invitaciones digitales">ENKARTA</Link><p>Historias que merecen una invitación.</p>{demo && <p className={styles.demoNotice}>Muestra de diseño · imágenes creadas con IA y lugares ficticios.</p>}</footer>
    {!preview && features.music && paradiseReferenceHref(c.musicUrl) && <ParadiseReferenceMusic src={paradiseReferenceHref(c.musicUrl)!} color="#f8f7f3" iconSize={29} className={styles.musicButton} statusClassName={styles.musicStatus} />}
  </>;
  const entryEnabled = c.entry?.enabled ?? features.entry;
  return <div className={styles.profile} style={theme} data-capitulo data-preview={preview ? '' : undefined}>{preview || skipEntry || !entryEnabled ? page : <CapituloEntry data={data} label={c.entry?.label ?? 'Abrir este capítulo'}>{page}</CapituloEntry>}</div>;
}
