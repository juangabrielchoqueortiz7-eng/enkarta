'use client';

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { InvitationParsed, ItineraryItem } from '@/lib/types';
import { AZURE_REFERENCE_ASSETS as A, AZURE_REFERENCE_FILTERS as F, AZURE_REFERENCE_SEEDS as SEEDS, azureReferenceDate, azureReferenceNames } from '@/lib/azure-reference';
import { paradiseReferenceClock, paradiseReferenceMaps } from '@/lib/paradise-reference';
import { resolveFeatures } from '@/lib/packages';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { usePageMotion } from '@/lib/scroll-motion';
import { emitInvitationAnalytics } from './InvitationAnalytics';
import ParadiseReferenceIcon from './ParadiseReferenceIcon';
import ParadiseReferenceMusic, { startParadiseReferenceMusic } from './ParadiseReferenceMusic';
import { paradiseReferenceHref } from './ParadiseReferenceSections';
import styles from './AzureReference.module.css';

// Font Awesome Free angle-double-down and copy, as embedded in the reference. https://fontawesome.com/license/free
function Arrow({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 320 512" fill="currentColor" aria-hidden="true"><path d="M143 256.3L7 120.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0L313 86.3c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.4 9.5-24.6 9.5-34 .1zm34 192l136-136c9.4-9.4 9.4-24.6 0-33.9l-22.6-22.6c-9.4-9.4-24.6-9.4-33.9 0L160 352.1l-96.4-96.4c-9.4-9.4-24.6-9.4-33.9 0L7 278.3c-9.4 9.4-9.4 24.6 0 33.9l136 136c9.4 9.5 24.6 9.5 34 .1z" /></svg>;
}
function CopyIcon() {
  return <svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M384 336H192c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16l140.1 0L400 115.9V320c0 8.8-7.2 16-16 16zM192 384H384c35.3 0 64-28.7 64-64V115.9c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1H192c-35.3 0-64 28.7-64 64V320c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H256c35.3 0 64-28.7 64-64V416H272v32c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V192c0-8.8 7.2-16 16-16H96V128H64z" /></svg>;
}
/** The Elementor "book" shape divider observed above and below the gift band. */
function Book({ top = false }: { top?: boolean }) {
  return <svg className={top ? styles.bookTop : styles.bookBottom} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="M806,94.7C619.5,90,500,20.3,500,1.7c-1,18.6-117.5,88.3-306,93C92,97.2,0,97.9,0,97.9v-0l0,0v2.3h1000v-2.3 C1000,97.7,920.3,97.6,806,94.7z" /></svg>;
}

/** Fixed leaf layer with the reference's vertical scroll effect (speed 7.4). */
function Backdrop({ speed = 7.4 }: { speed?: number }) {
  const context = usePageMotion();
  const { scrollYProgress } = useScroll({ container: context.scrollRoot });
  const y = useTransform(scrollYProgress, [0, 1], [0, -speed * 14.6]);
  return <div className={styles.backdrop} aria-hidden="true">
    <motion.div style={{ backgroundImage: `url("${A.leaves}")`, height: `${100 + speed * 10}%`, y: context.reduced ? 0 : y }} />
  </div>;
}

/** Same randomized ranges as the sample script; cleaned on unmount or when hidden. */
function Seeds({ image }: { image: string }) {
  const media = useMediaPreferences();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !media.ready || media.reducedMotion || media.saveData || !media.pageVisible) return;
    let timer: ReturnType<typeof setTimeout>;
    const range = ([min, max]: readonly [number, number]) => Math.random() * (max - min) + min;
    const spawn = () => {
      const seed = document.createElement('div');
      seed.className = styles.seed;
      const values: Record<string, string> = {
        '--size': `${range(SEEDS.size)}px`, '--dx': `${Math.random() * SEEDS.drift * 2 - SEEDS.drift}px`,
        '--dy': `-${range(SEEDS.rise)}px`, '--duration': `${range(SEEDS.duration)}s`,
        '--rotation': `${Math.random() * 360}deg`, '--sway': `${Math.random() * SEEDS.sway * 2 - SEEDS.sway}px`,
      };
      Object.entries(values).forEach(([key, value]) => seed.style.setProperty(key, value));
      seed.style.top = `${Math.random() * 100}%`;
      seed.style.left = `${Math.random() * 100}%`;
      seed.addEventListener('animationend', () => seed.remove(), { once: true });
      container.appendChild(seed);
    };
    const schedule = () => { timer = setTimeout(() => { spawn(); schedule(); }, range(SEEDS.spawnMs)); };
    for (let i = 0; i < SEEDS.initial; i++) spawn();
    schedule();
    return () => { clearTimeout(timer); container.replaceChildren(); };
  }, [media.ready, media.reducedMotion, media.saveData, media.pageVisible]);
  return <div ref={root} className={styles.seeds} style={{ '--seed-image': `url("${image}")` } as CSSProperties} aria-hidden="true" />;
}

/** fadeInUp on arrival, as declared per widget; content stays visible without observers. */
function useReveal(root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const media = useMediaPreferences();
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled || !media.ready || media.reducedMotion || !('IntersectionObserver' in window) || document.visibilityState === 'hidden') return;
    const targets = [...element.querySelectorAll<HTMLElement>('[data-az-reveal]')];
    element.dataset.azReveal = 'armed';
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).dataset.azShown = '';
      observer.unobserve(entry.target);
    }), { threshold: .05 });
    targets.forEach(target => { if (target.getBoundingClientRect().top < window.innerHeight) target.dataset.azShown = ''; else observer.observe(target); });
    return () => { observer.disconnect(); delete element.dataset.azReveal; };
  }, [root, enabled, media.ready, media.reducedMotion]);
}

const Rsvp = createContext<ReactNode>(null);
/** Only the server's already authorized form crosses this visual boundary. */
export function AzureReferenceRsvpProvider({ form, children }: { form: ReactNode; children: ReactNode }) {
  return <Rsvp.Provider value={form}>{children}</Rsvp.Provider>;
}

function RsvpAction({ demo }: { demo: boolean }) {
  const form = useContext(Rsvp);
  const [explain, setExplain] = useState(false);
  if (form) return <details className={styles.rsvpDetails}><summary className={styles.button}>Confirmar Asistencia</summary><div className={styles.rsvpForm}>{form}</div></details>;
  if (demo) return <>
    <button className={styles.button} type="button" onClick={() => setExplain(true)}>Confirmar Asistencia</button>
    {explain && <p className={styles.notice} role="status">Esta es una vista de muestra. No se envió ninguna confirmación.</p>}
  </>;
  return <p className={styles.notice}>Solicita a los anfitriones el enlace de confirmación de tu invitación.</p>;
}

/** Own entry: fades out over 2 s like the reference, without forcing full screen. */
export function AzureReferenceEntry({ data, children, label = 'Ingresar a mi invitación' }: {
  data: InvitationParsed;
  children: ReactNode;
  label?: string;
}) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const opening = useRef(false);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const opened = phase === 'open';
  const names = azureReferenceNames(data.names);
  const date = azureReferenceDate(data.event_date);
  const monogram = paradiseReferenceHref(data.config.sectionImages?.azureMonogram);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (timer.current !== null) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    const content = contentRef.current;
    if (opened) {
      content?.removeAttribute('inert');
      const heading = content?.querySelector<HTMLElement>('h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } else {
      content?.setAttribute('inert', '');
      gateRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
    return () => { content?.removeAttribute('inert'); };
  }, [opened]);
  useEffect(() => {
    if (opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [opened]);

  const enter = () => {
    if (opening.current || !active.current) return;
    opening.current = true;
    // Start within this trusted gesture, before the fade.
    startParadiseReferenceMusic(contentRef.current);
    setPhase('opening');
    emitInvitationAnalytics('entry_open');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!active.current) return;
      setPhase('open');
      window.dispatchEvent(new CustomEvent('enkarta:enter'));
    }, reduced ? 0 : 2000);
  };

  return <>
    <div ref={contentRef} aria-hidden={!opened} className={styles.content}>{children}</div>
    {!opened && <div ref={gateRef} role="dialog" aria-modal="true" aria-label={label || 'Ingresar a mi invitación'} aria-busy={phase === 'opening'}
      data-azure-entry={phase} className={styles.entry}
      style={{ '--az-leaves': `url("${A.leaves}")`, '--az-orchids-tl': `url("${A.orchidsTopLeft}")`, '--az-orchids-br': `url("${A.orchidsBottomRight}")`, '--az-orchids-bl': `url("${A.orchidsBottomLeft}")` } as CSSProperties}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); enter(); }
        if (event.key === 'Tab') { event.preventDefault(); gateRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
      }}>
      <div className={styles.entryInner}>
        <div className={styles.entryColumn}>
          {monogram && <img className={styles.monogram} src={monogram} alt="" width={158} height={150} style={{ filter: F.monogram }} decoding="async" />}
          <p className={styles.entryNames}>{[names.first, names.second].filter(Boolean).join(' & ')}</p>
          {date && <p className={styles.entryDate}>{date.entryLine}</p>}
          <Arrow className={styles.entryArrow} />
          <button type="button" className={styles.entryButton} onClick={enter} aria-disabled={phase === 'opening'}>{label || 'Ingresar a mi invitación'}</button>
        </div>
      </div>
    </div>}
  </>;
}

function Countdown({ data }: { data: InvitationParsed }) {
  const [now, setNow] = useState<number | null>(null);
  const prefs = useMediaPreferences();
  const date = azureReferenceDate(data.event_date);
  const time = paradiseReferenceClock(data.ceremony_time) || paradiseReferenceClock(data.reception_time);
  // Event local time in Bolivia, as in the other reference profile.
  const until = date ? Date.parse(`${date.iso}T${time ? time.slice(0, 5) : '00:00'}:00-04:00`) : NaN;
  useEffect(() => {
    if (!prefs.pageVisible) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [prefs.pageVisible, until]);
  const remaining = now === null || !Number.isFinite(until) ? null : Math.max(0, Math.floor((until - now) / 1000));
  const values = remaining === null ? ['00', '00', '00', '00'] : [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].map(value => String(value).padStart(2, '0'));
  return <ul className={styles.countdown} role="timer" aria-label="Tiempo restante para el evento">
    {values.map((value, i) => <li key={i}><span>{value}</span><small>{['Días', 'Horas', 'Min.', 'Seg.'][i]}</small></li>)}
  </ul>;
}

function Separator() {
  return <img className={styles.separator} src={A.separator} alt="" width={148} height={67} loading="lazy" decoding="async" data-az-reveal />;
}

function lines(value?: string | null) {
  return (value ?? '').split(/\n+/).map(line => line.trim()).filter(Boolean);
}

/** "Label: value" lines keep the reference's bold label. */
function DressLines({ value }: { value: string }) {
  return <p className={styles.body} data-az-reveal>{lines(value).map((line, i) => {
    const split = line.indexOf(':');
    return <span key={i} className={styles.line}>{split > 0 ? <><b>{line.slice(0, split + 1)}</b>{line.slice(split + 1)}</> : line}</span>;
  })}</p>;
}

function Venue({ data, reception = false }: { data: InvitationParsed; reception?: boolean }) {
  const c = data.config;
  const place = reception ? data.reception_place : data.ceremony_place;
  const address = reception ? data.reception_address : data.ceremony_address;
  const time = paradiseReferenceClock(reception ? data.reception_time : data.ceremony_time);
  const url = paradiseReferenceMaps(place, address);
  const title = reception ? c.receptionDesc ?? '' : c.ceremonyDesc ?? '';
  if (!place && !address && !time) return null;
  const icon = paradiseReferenceHref(c.sectionIcons?.[reception ? 'reception' : 'ceremony']) ?? (reception ? A.reception : A.ceremony);
  return <article className={styles.venue}>
    <img className={reception ? styles.receptionIcon : styles.ceremonyIcon} src={icon} alt="" width={reception ? 110 : 88} height={reception ? 121 : 138} loading="lazy" decoding="async" />
    {title && <h2 className={styles.label} data-az-reveal>{title}</h2>}
    <div className={styles.placeRow}>
      {time && <strong>{time}</strong>}
      {(place || address) && <p data-az-reveal>{[place, address].filter(Boolean).map((part, i) => <span key={i} className={styles.line}>{part}</span>)}</p>}
    </div>
    {url && <a className={styles.button} href={url} target="_blank" rel="noopener noreferrer">Ver ubicación</a>}
  </article>;
}

// Natural sizes keep the bottom-aligned icon row stable before the images load.
const ITINERARY_ICONS = [[A.ceremony, 88, 138], [A.reception, 110, 121], [A.hall, 91, 138]] as const;
function Itinerary({ rows }: { rows: ItineraryItem[] }) {
  return <ol className={styles.timeline}>
    {rows.map((item, index) => <li key={index} className={styles.timelineItem}>
      <img src={paradiseReferenceHref(item.icon) ?? ITINERARY_ICONS[index % ITINERARY_ICONS.length][0]} alt="" width={ITINERARY_ICONS[index % ITINERARY_ICONS.length][1]} height={ITINERARY_ICONS[index % ITINERARY_ICONS.length][2]} loading="lazy" decoding="async" />
      <div className={styles.timelineCard}>
        <p>{item.label}</p>
        <time>{paradiseReferenceClock(item.time)}</time>
        {item.place && <small>{item.place}</small>}
      </div>
    </li>)}
  </ol>;
}

function DemoQr() {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let current = true;
    void import('qrcode').then(module => module.toDataURL('ENKARTA_DEMO_NO_ES_UN_PAGO', { width: 166, margin: 1 })).then(value => { if (current) setSrc(value); }).catch(() => {});
    return () => { current = false; };
  }, []);
  return <>{src && <img className={styles.qr} src={src} alt="QR de demostración: no es un pago" width={166} height={166} />}<small>DEMO · no realizar transferencias</small></>;
}

function Gifts({ data, demo }: { data: InvitationParsed; demo: boolean }) {
  const c = data.config;
  const qr = paradiseReferenceHref(c.giftQrUrl);
  const account = data.bank_account?.trim() ?? '';
  const [copyState, setCopyState] = useState('');
  const generation = useRef(0);
  useEffect(() => { generation.current += 1; setCopyState(''); return () => { generation.current += 1; }; }, [account]);
  const copy = async (text: string) => {
    const current = generation.current;
    try { await navigator.clipboard.writeText(text); if (generation.current === current) setCopyState('Copiado'); }
    catch { if (generation.current === current) setCopyState('No se pudo copiar. Selecciona el texto para copiarlo.'); }
  };
  if (!data.gift_message && !account && !qr && !demo) return null;
  return <>
    <div className={styles.bookSpacer} aria-hidden="true"><Book /></div>
    <section className={styles.gifts} data-azure-section="gifts">
      <h2 className={styles.giftTitle}>Sugerencia de Regalo</h2>
      {data.gift_message && <p className={styles.giftText}>{data.gift_message}</p>}
      {(account || qr || demo) && <div className={styles.giftCards}>
        {(account || demo) && <div className={styles.giftCard}>
          <h3 data-az-reveal>Transferencia Bancaria</h3>
          {account ? <div className={styles.bank}>
            {lines(account).map((line, i) => <p key={i}>{line} {i > 0 && /\d{4}/.test(line) && <button type="button" className={styles.copy} aria-label={`Copiar ${line}`} onClick={() => { void copy(line.replace(/^[^:]*:\s*/, '')); }}><CopyIcon /></button>}</p>)}
            <p role="status" className={styles.copyState}>{copyState}</p>
          </div> : <div className={styles.bank}><p><b>BANCO DE MUESTRA</b></p><p>000 0000000</p><small>DEMO · no realizar transferencias</small></div>}
        </div>}
        {(qr || demo) && <div className={styles.giftCard}>
          <h3 data-az-reveal>Transferencia QR</h3>
          {qr ? <a href={qr} target="_blank" rel="noopener noreferrer" aria-label="Abrir QR de regalo"><img className={styles.qr} src={qr} alt="QR de regalo configurado por los anfitriones" width={166} height={166} loading="lazy" /></a> : <DemoQr />}
        </div>}
      </div>}
    </section>
  </>;
}

export function AzureReferenceSections({ data, demo = false, preview = false }: { data: InvitationParsed; demo?: boolean; preview?: boolean }) {
  const c = data.config, feats = resolveFeatures(c);
  const names = azureReferenceNames(data.names);
  const date = azureReferenceDate(data.event_date);
  const share = feats.photoSharing ? paradiseReferenceHref(data.gallery_url) : undefined;
  const hasParents = data.parents_bride.length > 0 || data.parents_groom.length > 0;
  const heartColor = c.sectionIconColors?.hearts?.color;
  return <>
    <section className={styles.hero} data-azure-section="hero" style={{ '--az-hero-flowers': `url("${A.heroFlowers}")`, '--az-orchids-tl': `url("${A.orchidsTopLeft}")` } as CSSProperties}>
      <div className={styles.ring} style={{ backgroundImage: `url("${A.ring}")` }}>
        <h1 className={styles.names} aria-label={[names.first, names.second].filter(Boolean).join(' y ')}>
          <span>{names.first}</span>
          {names.first && names.second && <span className={styles.ampersand} aria-hidden="true">&amp;</span>}
          <span>{names.second}</span>
        </h1>
      </div>
      {(c.introMessage ?? data.message) && <p className={styles.intro} data-az-reveal>{c.introMessage ?? data.message}</p>}
    </section>

    <section className={styles.dateSection} data-azure-section="date">
      {c.welcomeTitle && <h2 className={styles.welcome}>{c.welcomeTitle}</h2>}
      <ParadiseReferenceIcon src={A.hearts} className={styles.hearts} color={heartColor} style={{ width: 'var(--az-hearts-w)', height: 'var(--az-hearts-h)', filter: heartColor ? undefined : F.hearts }} />
      {date && <div className={styles.dateRow}>
        <div className={styles.dateSide}><span>{date.weekday}</span></div>
        <div className={styles.capsule}>
          {c.city && <span className={styles.capsuleSmall}>{c.city.toUpperCase()}</span>}
          <time dateTime={date.iso}>{date.day}</time>
          <span className={styles.capsuleSmall}>{date.year}</span>
        </div>
        <div className={styles.dateSide}><span>{date.month}</span></div>
      </div>}
      <p className={styles.soon} data-az-reveal>Solo faltan</p>
      <div className={styles.countdownRow}>
        <img className={styles.scroll} src={A.scrollLeft} alt="" width={177} height={60} style={{ filter: F.scrolls }} />
        <Countdown data={data} />
        <img className={styles.scroll} src={A.scrollRight} alt="" width={177} height={60} style={{ filter: F.scrolls }} />
      </div>
      <Separator />
      {hasParents && c.blessing && <p className={styles.blessing} data-az-reveal>{c.blessing}</p>}
    </section>

    {hasParents && <section className={styles.parents} data-azure-section="parents">
      <div className={styles.parentColumns}>
        {[data.parents_bride, data.parents_groom].map((list, i) => list.length > 0 && <p key={i} className={styles.body} data-az-reveal>{list.map((name, n) => <span key={n} className={styles.line}>{name}</span>)}</p>)}
      </div>
      <Separator />
    </section>}

    <section className={styles.venues} data-azure-section="venues">
      <div className={styles.venueColumns}><Venue data={data} /><Venue data={data} reception /></div>
      {data.dress_code && <article className={styles.dress} data-azure-section="dress">
        <img className={styles.dressIcon} src={paradiseReferenceHref(c.sectionIcons?.dress) ?? A.dress} alt="" width={114} height={133} loading="lazy" decoding="async" />
        <h2 className={styles.label} data-az-reveal>{c.dressCodeTitle ?? 'DRESS CODE'}</h2>
        <DressLines value={data.dress_code} />
      </article>}
    </section>

    {data.itinerary.length > 0 && <section className={styles.itinerary} data-azure-section="itinerary">
      <Separator />
      <h2 className={styles.script}>Itinerario</h2>
      <Itinerary rows={data.itinerary} />
      <Separator />
    </section>}

    <Gifts data={data} demo={demo} />

    {feats.photoSharing && (c.galleryMessage || share) && <section className={styles.photos} data-azure-section="photos">
      <Book top />
      <img className={styles.camera} src={paradiseReferenceHref(c.sectionIcons?.camera) ?? A.camera} alt="" width={220} height={163} loading="lazy" decoding="async" />
      {c.galleryMessage && <p className={styles.body} data-az-reveal>{c.galleryMessage}</p>}
      {share ? <a className={styles.button} href={share} target="_blank" rel="noopener noreferrer">Compartir fotografías</a>
        : demo ? <button className={styles.button} type="button" disabled>Compartir fotografías</button> : null}
      <Separator />
    </section>}

    <section className={styles.rsvp} data-azure-section="rsvp" style={{ '--az-orchids-br': `url("${A.orchidsBottomRight}")`, '--az-orchids-bl': `url("${A.orchidsBottomLeft}")` } as CSSProperties}>
      {c.rsvpMessage && <p className={styles.rsvpText} data-az-reveal>{c.rsvpMessage}</p>}
      <Arrow className={styles.rsvpArrow} />
      <RsvpAction demo={demo || preview} />
    </section>

    <footer className={styles.footer}>
      <Link prefetch={false} href="/" className={styles.footerBrand} aria-label="Enkarta, invitaciones digitales">ENKARTA</Link>
      <p>¿Deseas una invitación para tu evento? <Link prefetch={false} href="/contacto/whatsapp?placement=invitation_footer">Contáctanos</Link></p>
    </footer>
  </>;
}

export default function AzureReference({ data, preview = false, skipEntry = false, demo = false }: {
  data: InvitationParsed;
  preview?: boolean;
  demo?: boolean;
  skipEntry?: boolean;
  deadlinePassed?: boolean;
}) {
  const features = resolveFeatures(data.config);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, !preview);
  const page = <>
    <Backdrop />
    <div className={styles.page}><AzureReferenceSections data={data} demo={demo} preview={preview} /></div>
    {!preview && <Seeds image={A.seed} />}
    {!preview && features.music && data.config.musicUrl && <ParadiseReferenceMusic src={data.config.musicUrl} color="" iconSize={82} className={styles.musicButton} statusClassName={styles.musicStatus} />}
  </>;
  const entryEnabled = data.config.entry?.enabled ?? features.entry;
  return <div ref={root} className={styles.profile} data-azure-reference data-azure-reference-page={preview ? undefined : ''} data-preview={preview ? '' : undefined}>
    {preview || skipEntry || !entryEnabled ? page : <AzureReferenceEntry data={data} label={data.config.entry?.label ?? 'Ingresar a mi invitación'}>{page}</AzureReferenceEntry>}
  </div>;
}
