'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { InvitationParsed, ItineraryItem } from '@/lib/types';
import { paradiseReferenceCalendar, paradiseReferenceClock, paradiseReferenceDate, paradiseReferenceMaps } from '@/lib/paradise-reference';
import { PARADISE_REFERENCE_ASSETS as assets } from '@/lib/paradise-reference-assets';
import { captionsForImages } from '@/lib/gallery';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { resolveFeatures } from '@/lib/packages';
import ParadiseReferenceIcon from './ParadiseReferenceIcon';
import ParadiseReferenceRsvp from './ParadiseReferenceRsvp';
import styles from './ParadiseReferenceSections.module.css';

export function paradiseReferenceHref(value?: string | null): string | undefined {
  if (!value || /[\\\x00-\x1f]/.test(value)) return;
  if (/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch { /* Invalid configuration remains inactive. */ }
}

/** Shared behaviour within this profile, with one identity per current image. */
export function ParadiseReferenceCarousel({ images, label, className = '', intervalMs = 2000, kenBurns = false, captions, titles }: {
  images: readonly string[]; label: string; className?: string; intervalMs?: number; kenBurns?: boolean;
  captions?: InvitationParsed['config']['galleryCaptions']; titles?: readonly string[];
}) {
  const occurrences = new Map<string, number>();
  const rows = images.flatMap((src, originalIndex) => {
    if (!paradiseReferenceHref(src)) return [];
    const ordinal = occurrences.get(src) ?? 0; occurrences.set(src, ordinal + 1);
    return [{ src, originalIndex, key: JSON.stringify([src, ordinal]) }];
  });
  const signature = rows.map(row => row.key).join('\n');
  const latest = useRef(rows); latest.current = rows;
  const [selected, setSelected] = useState(rows[0]?.key ?? '');
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const prefs = useMediaPreferences();
  const index = Math.max(0, rows.findIndex(row => row.key === selected));
  const descriptions = captionsForImages([...images], captions);
  const description = descriptions[rows[index]?.originalIndex];
  const move = (delta: number) => setSelected(previous => {
    const list = latest.current;
    return list[(Math.max(0, list.findIndex(row => row.key === previous)) + delta + list.length) % list.length]?.key ?? '';
  });
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .01 });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (rows.length < 2 || paused || !visible || !prefs.ready || prefs.reducedMotion || prefs.saveData || !prefs.pageVisible) return;
    const timer = setInterval(() => move(1), Math.max(2000, intervalMs));
    return () => clearInterval(timer);
    // Only content identity and media policy should restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, intervalMs, paused, visible, prefs.ready, prefs.reducedMotion, prefs.saveData, prefs.pageVisible]);
  if (!rows.length) return null;
  return <div ref={root} className={`${styles.carousel} ${className}`} role="region" aria-roledescription="carrusel" aria-label={label}
    data-paradise-carousel data-ken-burns={kenBurns && !paused && !prefs.reducedMotion && !prefs.saveData ? '' : undefined}>
    {rows.map((row, i) => <div className={styles.slide} key={row.key} data-active={i === index ? '' : undefined} aria-hidden={i !== index}>
      <img src={paradiseReferenceHref(row.src)} alt={descriptions[row.originalIndex]?.alt ?? `${label} · foto ${i + 1}`} loading="lazy" decoding="async" />
      {titles?.[row.originalIndex] && <p className={styles.slideTitle}>{titles[row.originalIndex]}</p>}
    </div>)}
    {rows.length > 1 && <>
      <button className={styles.previous} type="button" aria-label={`Anterior · ${label}`} onClick={() => { setPaused(true); move(-1); }}>‹</button>
      <button className={styles.next} type="button" aria-label={`Siguiente · ${label}`} onClick={() => { setPaused(true); move(1); }}>›</button>
      <button className={styles.pause} type="button" aria-label={`${paused ? 'Reanudar' : 'Pausar'} · ${label}`} onClick={() => setPaused(value => !value)}>{paused ? 'Reanudar' : 'Pausar'}</button>
      <p className={styles.slideCount} aria-live={paused ? 'polite' : 'off'}>{index + 1} / {rows.length}</p>
    </>}
    {(description?.title || description?.caption) && <div className={styles.caption}>
      {description?.title && <strong>{description?.title}</strong>}{description?.caption && <p>{description?.caption}</p>}
    </div>}
  </div>;
}

function Countdown({ data }: { data: InvitationParsed }) {
  const [now, setNow] = useState<number | null>(null);
  const prefs = useMediaPreferences();
  const date = paradiseReferenceDate(data.event_date);
  const time = paradiseReferenceClock(data.ceremony_time) || paradiseReferenceClock(data.reception_time);
  // Event local time in Bolivia; no browser-local midnight or fabricated sample date.
  const until = date ? Date.parse(`${date.iso}T${time ? time.slice(0, 5) : '00:00'}:00-04:00`) : NaN;
  useEffect(() => {
    if (!prefs.pageVisible) return;
    setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [prefs.pageVisible, until]);
  const remaining = now === null || !Number.isFinite(until) ? null : Math.max(0, Math.floor((until - now) / 1000));
  const values = remaining === null ? ['—', '—', '—', '—'] : [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].map(value => String(value).padStart(2, '0'));
  const calendar = resolveFeatures(data.config).calendar ? paradiseReferenceCalendar(data) : null;
  return <div className={styles.countdownContent}>
    <h2 className={styles.script}>Faltan</h2>
    <div className={styles.countdown} role="timer" aria-label="Tiempo restante para el evento">
      {values.map((value, i) => <div key={i}><span>{value}</span><small>{['Días', 'Hrs', 'Mins', 'Segs'][i]}</small></div>)}
    </div>
    {calendar && <a className={styles.button} href={calendar} target="_blank" rel="noopener noreferrer">Agendar el Evento</a>}
  </div>;
}

function Original({ role, size = 84, className = '', reverse = true, src }: { role: keyof typeof assets.icons; size?: number; className?: string; reverse?: boolean; src?: string }) {
  return <ParadiseReferenceIcon src={src ?? assets.icons[role]} reverse={reverse} size={size} className={`${styles.icon} ${className}`} />;
}

function EventPlace({ data, reception = false }: { data: InvitationParsed; reception?: boolean }) {
  const { config: c } = data;
  const place = reception ? data.reception_place : data.ceremony_place;
  const address = reception ? data.reception_address : data.ceremony_address;
  const time = paradiseReferenceClock(reception ? data.reception_time : data.ceremony_time);
  const url = paradiseReferenceMaps(place, address);
  const title = reception ? c.receptionDesc ?? 'Recepción' : c.ceremonyDesc ?? 'Ceremonia';
  if (!place && !address && !time) return null;
  const key = reception ? 'reception' : 'ceremony';
  return <article className={styles.event}>
    <Original role={reception ? 'civil' : 'ceremony'} src={c.sectionIcons?.[key]} className={styles.creamIcon} />
    {title && <h2 className={styles.script}>{title}</h2>}
    <div className={styles.placeRow}>{time && <time>{time}</time>}{(place || address) && <p>{place || address}</p>}</div>
    {url && <a className={styles.button} href={url} target="_blank" rel="noopener noreferrer">Ver ubicación</a>}
  </article>;
}

function Itinerary({ rows }: { rows: ItineraryItem[] }) {
  const roles = ['ceremony', 'reception', 'firstDance', 'dinner', 'dance', 'farewell'] as const;
  return <ol className={styles.timeline}>
    {rows.map((item, index) => <li key={index} className={styles.timelineItem}>
      <Original role={roles[index % roles.length]} src={item.icon?.startsWith('/') || item.icon?.startsWith('https://') ? item.icon : undefined} size={62} className={styles.creamIcon} />
      <p>{item.label}</p><span className={styles.timelineRule} aria-hidden="true" /><time>{paradiseReferenceClock(item.time)}</time>
      {item.place && <p>{item.place}</p>}{item.note && <small>{item.note}</small>}
    </li>)}
  </ol>;
}

function DemoQr() {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let current = true;
    void import('qrcode').then(module => module.toDataURL('ENKARTA_DEMO_NO_ES_UN_PAGO', { width: 120, margin: 1 })).then(value => { if (current) setSrc(value); }).catch(() => {});
    return () => { current = false; };
  }, []);
  return <>{src && <img src={src} alt="QR de demostración: no es un pago" width={120} height={120} />}<small>DEMO · no realizar transferencias</small></>;
}

function Gifts({ data, demo }: { data: InvitationParsed; demo: boolean }) {
  const c = data.config;
  const registry = paradiseReferenceHref(c.giftRegistryUrl);
  const qr = paradiseReferenceHref(c.giftQrUrl);
  const [copyState, setCopyState] = useState('');
  const generation = useRef(0);
  useEffect(() => { generation.current += 1; setCopyState(''); return () => { generation.current += 1; }; }, [data.bank_account]);
  const copy = async () => {
    const current = generation.current;
    try { await navigator.clipboard.writeText(data.bank_account ?? ''); if (generation.current === current) setCopyState('Datos copiados'); }
    catch { if (generation.current === current) setCopyState('No se pudo copiar. Selecciona el texto para copiarlo.'); }
  };
  return <section className={`${styles.paper} ${styles.gifts}`} data-paradise-section="gifts">
    <Original role="gift" reverse={false} size={91} className={styles.greenIcon} src={c.sectionIcons?.gift} />
    <h2 className={styles.script}>Sugerencia de Regalo</h2>
    {data.gift_message && <p>{data.gift_message}</p>}
    {(registry || demo) && <div className={styles.giftCard}>
      {demo && <img className={styles.registryLogo} src={assets.giftLogo} alt="Falabella" width={170} height={66} loading="lazy" />}
      {registry ? <a className={styles.button} href={registry} target="_blank" rel="noopener noreferrer">{c.giftRegistryLabel ?? 'Ver la Mesa de Regalos'}</a> : <button className={styles.button} type="button" disabled>Ver la Mesa de Regalos · muestra</button>}
    </div>}
    {(qr || data.bank_account || demo) && <div className={styles.giftCard}>
      <p>Transferencia QR</p>
      {qr ? <a href={qr} target="_blank" rel="noopener noreferrer" aria-label="Abrir QR de regalo"><img src={qr} alt="QR de regalo configurado por los anfitriones" width={120} height={120} loading="lazy" /></a> : demo ? <DemoQr /> : null}
      {data.bank_account && <><p className={styles.account}>{data.bank_account}</p><button type="button" className={styles.button} onClick={() => { void copy(); }}>Copiar datos</button><p role="status">{copyState}</p></>}
    </div>}
  </section>;
}

export function ParadiseReferenceSections({ data, demo = false, preview = false }: { data: InvitationParsed; demo?: boolean; preview?: boolean }) {
  const c = data.config, feats = resolveFeatures(c);
  const gallery = (c.galleryImages ?? []).slice(0, Math.max(0, feats.galleryMax));
  const closing = [c.footerImage, c.sectionImages?.paradiseClosingSecond].filter((value): value is string => typeof value === 'string' && !!value);
  const hotels = feats.lodging ? c.lodging ?? [] : [];
  const share = feats.photoSharing ? paradiseReferenceHref(data.gallery_url) : undefined;
  const hasParents = data.parents_bride.length > 0 || data.parents_groom.length > 0;
  const colors = { '--pr-interior-ink': c.theme?.onPrimary ?? '#ede4d2' } as CSSProperties;
  return <div className={styles.sections} style={colors} data-paradise-interior>
    <section className={`${styles.intro} ${styles.dark}`} data-paradise-section="intro">
      {(c.introMessage ?? data.message) && <p>{c.introMessage ?? data.message}</p>}
      {feats.guestNames && data.guest_name && <div className={styles.reservation}><p className={styles.guestName}>{data.guest_name}</p>{feats.passes && <><p>Hemos reservado:</p><p className={styles.guestName}>{data.guest_passes} {data.guest_passes === 1 ? 'pase' : 'pases'}</p><p>en su honor</p></>}</div>}
    </section>
    {(c.verse || c.verseRef) && <section className={`${styles.paper} ${styles.verse}`} data-paradise-section="verse">
      <Original role="bible" reverse={false} size={91} className={styles.greenIcon} />
      <p>{c.verse && <>«{c.verse}» </>}{c.verseRef}</p>
    </section>}
    <section className={styles.countdownSection} data-paradise-section="countdown">
      <Countdown data={data} />
      <ParadiseReferenceCarousel images={gallery} label="Fotografías de la pareja" className={styles.archGallery} kenBurns captions={c.galleryCaptions} />
    </section>
    {hasParents && <section className={`${styles.paper} ${styles.parents}`} data-paradise-section="parents">
      {c.blessing && <h2>{c.blessing}</h2>}
      <div className={styles.parentColumns}>{[data.parents_bride, data.parents_groom].map((names, i) => names.length > 0 && <div key={i}><h3 className={styles.script}>{i === 0 ? 'Padres de la Novia' : 'Padres del Novio'}</h3>{names.map((name, n) => <p key={n}>{name}</p>)}</div>)}</div>
    </section>}
    {data.sponsors.length > 0 && <section className={`${styles.paper} ${styles.parents}`} data-paradise-section="sponsors"><h2 className={styles.script}>Nuestros padrinos</h2><div className={styles.parentColumns}>{data.sponsors.map((item, i) => <div key={i}><h3 className={styles.script}>{item.role}</h3><p>{item.names}</p></div>)}</div></section>}
    <section className={styles.events} data-paradise-section="events"><EventPlace data={data} /><EventPlace data={data} reception />
      {data.dress_code && <article className={styles.event} data-paradise-section="dress"><div className={styles.dressIcons}><Original role="suit" size={75} className={styles.creamIcon} /><Original role="dress" size={65} className={styles.creamIcon} /></div><h2 className={styles.script}>Vestimenta</h2><p>{data.dress_code}</p></article>}
    </section>
    {data.itinerary.length > 0 && <section className={`${styles.itinerary} ${styles.dark}`} data-paradise-section="itinerary"><h2 className={styles.script}>Cronograma</h2><Itinerary rows={data.itinerary} /></section>}
    <Gifts data={data} demo={demo} />
    {hotels.length > 0 && <section className={styles.lodging} data-paradise-section="lodging"><div className={styles.hotelCard}>
      <h2 className={styles.script}>{c.lodgingTitle ?? 'Sugerencia de hospedaje'}</h2>
      <ParadiseReferenceCarousel images={hotels.map(item => item.image)} titles={hotels.map(item => item.name)} label="Hospedaje" className={styles.hotelGallery} intervalMs={5000} />
      {hotels.some(item => item.url || item.desc) && <ul className={styles.hotelLinks}>{hotels.map((item, i) => <li key={i}>{item.desc && <p>{item.desc}</p>}{paradiseReferenceHref(item.url) && <a href={paradiseReferenceHref(item.url)} target="_blank" rel="noopener noreferrer">{item.name} · información</a>}</li>)}</ul>}
    </div></section>}
    {(data.no_kids || (feats.photoSharing && (c.galleryMessage || share))) && <section className={styles.extras}>
      {data.no_kids && <article className={styles.extraCard} data-paradise-section="adults"><Original role="adults" size={73} className={styles.creamIcon} /><h2 className={styles.script}>Solo Adultos</h2>{c.noKidsMessage && <p>{c.noKidsMessage}</p>}</article>}
      {feats.photoSharing && (c.galleryMessage || share) && <article className={styles.extraCard} data-paradise-section="photos"><Original role="camera" size={103} className={styles.cameraIcon} />{c.galleryMessage && <p>{c.galleryMessage}</p>}{share && <a className={styles.button} href={share} target="_blank" rel="noopener noreferrer">Compartir fotografías</a>}{!share && demo && <button className={styles.button} type="button" disabled>Compartir fotografías · muestra</button>}</article>}
    </section>}
    <section className={`${styles.paper} ${styles.rsvp}`} data-paradise-section="rsvp">
      {c.rsvpMessage && <p>{c.rsvpMessage}</p>}
      <svg className={styles.downArrow} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v18m-7-7 7 7 7-7" /></svg>
      <ParadiseReferenceRsvp demo={demo || preview} />
      {c.rsvpClosing && <p className={styles.rsvpClosing}>{c.rsvpClosing}</p>}
    </section>
    {closing.length > 0 && <section className={styles.closing} data-paradise-section="closing">
      {/* The static Elementor wave paths observed in this specific reference. */}
      <svg className={styles.closingWave} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path opacity=".33" d="M473,67.3c-203.9,88.3-263.1-34-320.3,0C66,119.1,0,59.7,0,59.7V0h1000v59.7 c0,0-62.1,26.1-94.9,29.3c-32.8,3.3-62.8-12.3-75.8-22.1C806,49.6,745.3,8.7,694.9,4.7S492.4,59,473,67.3z" /><path opacity=".66" d="M734,67.3c-45.5,0-77.2-23.2-129.1-39.1c-28.6-8.7-150.3-10.1-254,39.1 s-91.7-34.4-149.2,0C115.7,118.3,0,39.8,0,39.8V0h1000v36.5c0,0-28.2-18.5-92.1-18.5C810.2,18.1,775.7,67.3,734,67.3z" /><path d="M766.1,28.9c-200-57.5-266,65.5-395.1,19.5C242,1.8,242,5.4,184.8,20.6C128,35.8,132.3,44.9,89.9,52.5C28.6,63.7,0,0,0,0 h1000c0,0-9.9,40.9-83.6,48.1S829.6,47,766.1,28.9z" /></svg>
      <ParadiseReferenceCarousel images={closing} label="Recuerdos de la pareja" className={styles.closingGallery} />
    </section>}
    <footer className={styles.footer}><Link prefetch={false} href="/" aria-label="Enkarta, invitaciones digitales">ENKARTA</Link><p>¿Deseas una invitación para tu evento? <Link prefetch={false} href="/contacto/whatsapp?placement=invitation_footer">Contáctanos</Link></p></footer>
  </div>;
}
