'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode, type CSSProperties, useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import LottieIcon from '@/components/ui/LottieIcon';
import type { InvitationParsed, BuilderConfig } from '@/lib/types';
import { LA_ROOT, LA_TEXTS, laText, laMaps, laMedia, lauraAndresDemo } from '@/lib/laura-andres';
import { resolveFeatures } from '@/lib/packages';
import { EventIcon, useCountdown, Reveal } from './shared';
import PageDecor from './decorations';
import { captionsForImages } from '@/lib/gallery';
import ConfirmationForm from './ConfirmationForm';
import { resolveBlockTheme } from './blocks/theme';
import { activeInvitationLocale } from '@/lib/invitation-i18n';
import styles from './LauraAndres.module.css';
const root = LA_ROOT;
const baseIconColors = ['#818566', '#00cccc', '#000000', '#33cccc', '#ff0000', '#6864f7', '#052a75', '#fde0be', '#3ecbca', '#d1dcfb', '#606060', '#fd8f01', '#fd7da0', '#d84886', '#27a2cc', '#67ccd1', '#93b2f4', '#d2dcfd', '#91b706', '#f7b073', '#fdcb50', '#b1d952', '#bc9af4'];
function Icon({ name, size = 86, config, sec, colors, speed }: {
    name: string;
    size?: number;
    config?: BuilderConfig;
    sec?: string;
    colors?: Record<string, string>;
    speed?: number;
}) {
    const custom = sec && config?.sectionIcons?.[sec];
    const source = custom || name;
    const palette = colors ?? (sec ? config?.sectionIconColors?.[sec] : undefined);
    const tint = config?.iconColor ?? config?.theme?.line ?? '#818566';
    const scale = Math.max(.7, Math.min(1.4, config?.iconScale ?? 1));
    return <span className={styles.icon} aria-hidden="true" style={{ width: size * scale, height: size * scale }}>{source.endsWith('.json') ? <LottieIcon icon={source} size={size * scale} colors={palette && Object.keys(palette).length ? palette : Object.fromEntries(baseIconColors.map(c => [c, tint]))} speed={speed ?? (sec ? config?.sectionIconSpeeds?.[sec] : 1)}/> : <EventIcon name={source} stroke={tint} className="w-full h-full"/>}</span>;
}
function Waves({ className = '' }: {
    className?: string;
}) {
    return <svg className={`${styles.waves} ${className}`} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
    <path opacity=".33" d="M473,67.3c-203.9,88.3-263.1-34-320.3,0C66,119.1,0,59.7,0,59.7V0h1000v59.7c0,0-62.1,26.1-94.9,29.3c-32.8,3.3-62.8-12.3-75.8-22.1C806,49.6,745.3,8.7,694.9,4.7S492.4,59,473,67.3z"/>
    <path opacity=".66" d="M734,67.3c-45.5,0-77.2-23.2-129.1-39.1c-28.6-8.7-150.3-10.1-254,39.1s-91.7-34.4-149.2,0C115.7,118.3,0,39.8,0,39.8V0h1000v36.5c0,0-28.2-18.5-92.1-18.5C810.2,18.1,775.7,67.3,734,67.3z"/>
    <path d="M766.1,28.9c-200-57.5-266,65.5-395.1,19.5C242,1.8,242,5.4,184.8,20.6C128,35.8,132.3,44.9,89.9,52.5C28.6,63.7,0,0,0,0h1000c0,0-9.9,40.9-83.6,48.1S829.6,47,766.1,28.9z"/>
  </svg>;
}
function LinkButton({ href, children }: {
    href: string;
    children: ReactNode;
}) {
    return <a className={styles.button} href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
}
function Slideshow({ images, className = '', active = true, seconds = 6 }: {
    images: string[];
    className?: string;
    active?: boolean;
    seconds?: number;
}) {
    const [index, setIndex] = useState(0);
    const reduced = useReducedMotion();
    useEffect(() => {
        if (!active || reduced || images.length < 2)
            return;
        const timer = window.setInterval(() => setIndex(i => (i + 1) % images.length), Math.max(2, seconds) * 1000);
        return () => window.clearInterval(timer);
    }, [images.length, active, reduced, seconds]);
    return <div className={`${styles.slideshow} ${className}`}>
    {images.map((src, i) => <img key={src} src={src} alt={i === index % images.length ? 'Fotografía de la pareja' : ''} aria-hidden={i !== index % images.length} className={i === index % images.length ? styles.current : ''} loading={i === 0 ? 'eager' : 'lazy'}/>)}
  </div>;
}
export default function LauraAndres({ data: supplied, preview = false, demo = !supplied, skipEntry = false, deadlinePassed = false }: {
    data?: InvitationParsed;
    preview?: boolean;
    demo?: boolean;
    skipEntry?: boolean;
    deadlinePassed?: boolean;
}) {
    const data = supplied ?? lauraAndresDemo();
    const cfg = data.config;
    const settings = cfg.lauraAndres ?? {};
    const features = resolveFeatures(cfg);
    const text = (key: keyof typeof LA_TEXTS) => laText(data, key);
    const show = (section: string) => settings.sections?.[section] !== false;
    const names = data.names ?? '';
    const guest = cfg.activeGuest;
    const guestName = features.guestNames ? guest?.name ?? data.guest_name : null;
    const passes = features.passes ? guest?.passes ?? data.guest_passes : 0;
    const seal = settings.sealImage ?? root + 'SELLO-VERDE-copia_2.webp';
    const isoDate = data.event_date ? data.event_date.slice(0, 10) + 'T' + (data.ceremony_time || '00:00').slice(0, 5) + ':00' : '';
    const countdown = useCountdown(isoDate || '1970-01-01T00:00:00');
    const dateLabel = (value: string | null) => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '') : '';
    const clock = (value: string | null) => { if (!value)
        return ''; const [h, m] = value.split(':'); const hour = Number(h); return Number.isFinite(hour) ? String(hour % 12 || 12).padStart(2, '0') + ':' + m + '\n' + (hour >= 12 ? 'pm' : 'am') : value; };
    const calendar = 'https://www.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: names, dates: isoDate.replace(/[-:]/g, '') + '/' + (data.event_date ?? '').replace(/-/g, '') + 'T235900', location: data.ceremony_place ?? '' }).toString();
    const media = laMedia(data);
    const images = media.gallery;
    const captions = captionsForImages(images, cfg.galleryCaptions);
    const columns = [0, 1, 2].map(c => images.slice(c * Math.ceil(images.length / 3), (c + 1) * Math.ceil(images.length / 3)));
    const covers = [data.cover_image_url, ...media.cover].filter((x): x is string => !!x);
    const musicUrl = features.music ? cfg.musicUrl : undefined;
    const entryEnabled = !preview && !skipEntry && (cfg.entry?.enabled ?? features.entry);
    const [opened, setOpened] = useState(!entryEnabled);
    const [opening, setOpening] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [lightbox, setLightbox] = useState<number | null>(null);
    const audio = useRef<HTMLAudioElement>(null);
    const main = useRef<HTMLElement>(null);
    const title = useRef<HTMLHeadingElement>(null);
    const closePhoto = useRef<HTMLButtonElement>(null);
    const lastPhotoTrigger = useRef<HTMLButtonElement | null>(null);
    const reduced = useReducedMotion();
    const maskId = useId().replace(/:/g, '');
    useEffect(() => { if (main.current)
        main.current.inert = !opened || lightbox !== null; if (!preview && opened && lightbox === null)
        (lastPhotoTrigger.current ?? title.current)?.focus({ preventScroll: true }); }, [opened, lightbox, preview]);
    useEffect(() => { if (preview)
        return; const previous = document.body.style.overflow; if (!opened || lightbox !== null)
        document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, [opened, lightbox, preview]);
    useEffect(() => { if (!opening)
        return; const timer = window.setTimeout(() => setOpened(true), reduced ? 0 : 1400); return () => clearTimeout(timer); }, [opening, reduced]);
    useEffect(() => { if (lightbox === null)
        return; closePhoto.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
        setLightbox(null); if (e.key === 'ArrowRight')
        setLightbox(i => i === null ? null : (i + 1) % images.length); if (e.key === 'ArrowLeft')
        setLightbox(i => i === null ? null : (i + images.length - 1) % images.length); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [lightbox, images.length]);
    const open = () => { setOpening(true); void audio.current?.play().catch(() => setPlaying(false)); };
    const toggleMusic = () => { if (playing)
        audio.current?.pause();
    else
        void audio.current?.play().catch(() => setPlaying(false)); };
    const icon = (name: string, sec: string, size = 86) => <Icon name={name.includes('/') ? name : '/lottie/boda/' + name + '.json'} sec={sec} size={size} config={cfg}/>;
    const slides = (urls: string[]) => <Slideshow images={urls} active={opened && !preview} seconds={settings.slideSeconds}/>;
    const themeStyle = { '--olive': cfg.theme?.primary ?? '#68693f', '--ink': cfg.theme?.text ?? '#544e39', '--paper': cfg.theme?.bg ?? '#fff', '--line': cfg.theme?.line ?? '#818566', '--hero-mask': 'url(#' + maskId + ')', '--la-card-radius': (cfg.tokens?.cardRadius ?? 30) + 'px', '--la-button-radius': (cfg.tokens?.buttonRadius ?? 15) + 'px', '--la-media-radius': (cfg.tokens?.mediaRadius ?? 20) + 'px', '--la-width': (cfg.tokens?.contentWidth ?? 1140) + 'px', '--la-body-scale': cfg.tokens?.typeScale?.body ?? 1, '--la-title-scale': cfg.tokens?.typeScale?.title ?? 1, '--la-subtitle-scale': cfg.tokens?.typeScale?.subtitle ?? 1, '--la-shadow': cfg.tokens?.shadow === 'none' ? 'none' : cfg.tokens?.shadow === 'strong' ? '0 18px 38px #261d1628' : cfg.tokens?.shadow === 'medium' ? '0 13px 30px #261d161d' : '0 0 10px #0003' } as CSSProperties;
    return <div className={styles.scope}><div className={styles.page} style={themeStyle} data-la-preview={preview || undefined} data-button-style={cfg.tokens?.buttonStyle}>
    <svg width="0" height="0" aria-hidden="true" className={styles.maskDefinitions}><defs><mask id={maskId} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" style={{ maskType: 'luminance' }}><rect width="1" height="1" fill="white"/><path transform="translate(1,0) scale(-1,1.3)" fill="black" d="M0.059,0.0004 C0.005,0.087 0.005,0.195 0.059,0.378 S0.005,0.792 0.005,0.792 H0 V0 Z"/></mask></defs></svg>
    {musicUrl && !preview && <audio ref={audio} loop preload="none" src={musicUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>}
    {!opened && <div className={styles.gate + ' ' + (opening ? styles.opening : '')} role="dialog" aria-modal="true" aria-label={'Abrir invitación de ' + names}><div className={styles.envelopeLeft}/><div className={styles.envelopeRight}/><button className={styles.sealButton} onClick={open} disabled={opening} aria-label={cfg.entry?.label || 'Ingresar a la invitación'}><img src={seal} alt=""/></button></div>}
    <PageDecor decor={cfg.decor} color={cfg.theme?.primary ?? '#68693f'}/><main ref={main} aria-hidden={!opened || lightbox !== null}>
      <section className={styles.hero}><div className={styles.heroPhoto}>{slides(covers)}<Waves /></div><div className={styles.heroNames}><p>{text('announce')}</p><h1 ref={title} tabIndex={-1}>{names}</h1></div></section>
      {show('quote') && <section className={styles.container + ' ' + styles.quote}><Reveal className={styles.card}>{icon('marriage', 'quote', 70)}<p>{text('quote')}<br />{text('quoteRef')}</p></Reveal></section>}
      {show('honor') && <section className={styles.honor}><h2>{text('honor')}</h2></section>}
      {show('welcome') && <section className={styles.welcome}><Reveal><p>{data.message}</p>{guestName && <><p className={styles.guestName}>{guestName}</p>{passes > 0 && <p>Hemos reservado {passes} {passes === 1 ? 'pase' : 'pases'} para ti</p>}</>}</Reveal></section>}
      {show('family') && (data.parents_groom.length > 0 || data.parents_bride.length > 0 || data.sponsors.length > 0) && <section className={styles.family}><Reveal><h2>{cfg.blessing || text('family')}</h2><div className={styles.familyColumns}><p>{data.parents_groom.join('\n')}</p><p>{data.parents_bride.join('\n')}</p></div>{data.sponsors.map((s, i) => <p key={i}><strong>{s.role}</strong><br />{s.names}</p>)}</Reveal></section>}
      {show('date') && <section className={styles.date}><Reveal>{icon('fecha-de-boda', 'date', 96)}<p className={styles.eyebrow}>{text('dateIntro')}</p><h2>{dateLabel(data.event_date)}</h2><p className={styles.remaining}>{text('remaining')}</p><div className={styles.countdown}>{[['Días', countdown.days], ['Hrs', countdown.hours], ['Mins', countdown.mins], ['Segs', countdown.secs]].map(([label, value]) => <div key={label}><span>{String(value).padStart(2, '0')}</span><small>{label}</small></div>)}</div>{features.calendar && data.event_date && <LinkButton href={calendar}>{text('calendar')}</LinkButton>}<div className={styles.hearts}>{icon('laura-corazones', 'hearts', 65)}</div></Reveal></section>}
      {show('venues') && <section className={styles.container + ' ' + styles.venues}>{[{ key: 'ceremony', place: data.ceremony_place, address: data.ceremony_address, time: data.ceremony_time, name: 'iglesia' }, { key: 'reception', place: data.reception_place, address: data.reception_address, time: data.reception_time, name: 'invitacion' }].filter(v => v.place || v.address).map(v => <Reveal key={v.key} className={styles.card}>{icon(v.name, v.key)}<p>{text((v.key + 'Intro') as keyof typeof LA_TEXTS)}<br /><strong>{v.place}</strong><br />{text((v.key + 'Note') as keyof typeof LA_TEXTS)}</p><p className={styles.time}>{clock(v.time)}</p>{v.address && <LinkButton href={laMaps(v.address)}>{text('maps')}</LinkButton>}</Reveal>)}</section>}
      {show('dress') && <section className={styles.dress}><Reveal className={styles.card}><div className={styles.dressIcons}>{icon('smoking', 'dressMen', 80)}{icon('wedding-dress', 'dress', 80)}</div><h2>{text('dressTitle')}</h2><p><strong>{data.dress_code}</strong></p><div className={styles.dressColumns}>{[['women', settings.womenColors ?? []], ['men', settings.menColors ?? []]].map(([key, colors]) => <div key={key as string}><p>{text(key as 'women' | 'men')}</p><div className={styles.swatches}>{(colors as string[]).map((color, i) => <i key={i} style={{ background: color }} title={color}/>)}</div></div>)}</div><p><strong>{text('palette')}</strong></p><div className={styles.swatches + ' ' + styles.suggested}>{(settings.suggestedColors ?? []).map((color, i) => <i key={i} style={{ background: color }} title={color}/>)}</div></Reveal></section>}
      {show('program') && data.itinerary.length > 0 && <section className={styles.container + ' ' + styles.program}><img className={styles.divider} src={settings.dividerImage ?? root + '15-rominaRecurso-61separador.svg'} alt=""/><h2>{text('program')}</h2><div className={styles.programGrid}>{data.itinerary.map((step, i) => <Reveal key={i}><Icon name={step.icon || '/lottie/boda/anillos.json'} config={cfg} colors={step.iconColors} speed={step.iconSpeed} size={75}/><div className={styles.programRule}/><p className={styles.programTime}>{step.time}</p><p>{step.label}</p>{step.place && <p>{step.place}</p>}{step.note && <p>{step.note}</p>}</Reveal>)}</div></section>}
      {show('gallery') && images.length > 0 && <section className={styles.container + ' ' + styles.gallery} aria-label="Nuestras fotografías">{columns.map((column, c) => <div key={c} className={styles.galleryColumn}>{column.map((src, r) => { const index = c * Math.ceil(images.length / 3) + r; return <button key={index} onClick={e => { lastPhotoTrigger.current = e.currentTarget; setLightbox(index); }} aria-label={'Ampliar fotografía ' + (index + 1)}><img src={src} alt={captions[index]?.alt || names + ', fotografía ' + (index + 1)} loading="lazy"/>{(captions[index]?.title || captions[index]?.caption) && <span className={styles.photoCaption}>{captions[index]?.title}<br />{captions[index]?.caption}</span>}</button>; })}</div>)}</section>}
      {show('gift') && <section className={styles.gift}><Reveal className={styles.card}>{icon('regalo-abierto', 'gift')}<h2>{text('giftTitle')}</h2><div className={styles.giftInside}>{icon('tarjeta-de-regalo', 'giftEnvelope')}<p>{data.gift_message}</p>{cfg.giftCash && <p>{cfg.giftCash}</p>}{data.bank_account && <p className={styles.bank}>{data.bank_account}</p>}{cfg.giftQrUrl && <img className={styles.giftQr} src={cfg.giftQrUrl} alt="QR para regalos"/>}{cfg.giftRegistryUrl && <LinkButton href={cfg.giftRegistryUrl}>{cfg.giftRegistryLabel || 'Lista de regalos'}</LinkButton>}{cfg.giftOther && <p>{cfg.giftOther}</p>}</div></Reveal></section>}
      {show('details') && <section className={styles.container + ' ' + styles.details}>{data.no_kids && <Reveal className={styles.card}>{cfg.sectionIcons?.noKids ? icon('marriage', 'noKids') : <svg className={styles.babyIcon} viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="48" cy="48" r="44"/><path d="M17 17 79 79M29 43c-8-3-10 11-2 13 3 13 12 20 21 20s19-8 21-20c9-2 6-16-2-13-1-15-10-22-20-22-8 0-12 4-10 9 3 6 11 3 10-2M37 48h1m19 0h1M39 61q9 7 18 0"/></svg>}<h2>{text('noKidsTitle')}</h2><p>{text('noKids')}</p></Reveal>}{features.photoSharing && data.gallery_url && <Reveal className={styles.card}>{icon('photo', 'gallery')}<p>{text('share')}</p><LinkButton href={data.gallery_url}>{text('shareButton')}</LinkButton></Reveal>}</section>}
      {show('lodging') && features.lodging && !!cfg.lodging?.length && <section className={styles.container + ' ' + styles.lodging}><h2>{cfg.lodgingTitle || 'Hospedaje'}</h2><div className={styles.venues}>{cfg.lodging.map((hotel, i) => <Reveal key={i} className={styles.card}>{hotel.image && <img src={hotel.image} alt={hotel.name}/>}<h2>{hotel.name}</h2><p>{hotel.desc}</p></Reveal>)}</div><p>{cfg.lodgingContact}</p></section>}
      {show('rsvp') && <section className={styles.rsvp} aria-label="Confirmación de asistencia"><img className={styles.rsvpEnvelope} src={settings.envelopeImage ?? root + 'SOBRE-Beige-sin-bordes.webp'} alt="Sobre de la invitación"/><h2 className={styles.rsvpHeading}>{text('rsvpTitle')}</h2><Reveal className={styles.card + ' ' + styles.rsvpCard}><img className={styles.rsvpSeal} src={seal} alt=""/><p>{text('rsvpThanks')}</p>{data.rsvp_deadline && <p>{text('deadline')}<br /><span className={styles.deadline}>{dateLabel(data.rsvp_deadline)}</span></p>}<p>{text('rsvpNote')}</p><div className={styles.confirmation}>{features.smartRsvp ? <ConfirmationForm slug={data.slug} guest={guest} guestName={guestName ?? undefined} maxPasses={passes || undefined} theme={resolveBlockTheme(cfg.theme)} demo={demo || preview} deadlinePassed={deadlinePassed} locale={activeInvitationLocale(cfg)}/> : data.phone_whatsapp ? <LinkButton href={'https://wa.me/' + data.phone_whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent('Quiero confirmar mi asistencia a ' + names)}>{text('rsvpTitle')}</LinkButton> : <p>Próximamente podrás confirmar tu asistencia.</p>}</div></Reveal></section>}
      {show('portrait') && !!media.portrait.length && <section className={styles.portrait}>{slides(media.portrait)}<Waves /></section>}
      {show('farewell') && <section className={styles.farewell}><Reveal><h2>{text('closing')}</h2><p>{text('story')}</p><h2>{text('signature')}</h2><p className={styles.signature}>{names}</p></Reveal></section>}
      {show('lastPortrait') && !!media.closing.length && <section className={styles.lastPortrait}>{slides(media.closing)}<Waves /></section>}
      <footer className={styles.footer}><span className={styles.brand}>Enkarta</span><p>¿Deseas una invitación para tu evento? <a href="/contacto/whatsapp?placement=invitation_footer">Contáctanos</a></p></footer>
    </main>
    {opened && musicUrl && !preview && lightbox === null && <button className={styles.music + ' ' + (playing ? styles.playing : '')} aria-label={playing ? 'Pausar música' : 'Reproducir música'} aria-pressed={playing} onClick={toggleMusic}>♫</button>}
    {lightbox !== null && images[lightbox] && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Fotografía ampliada" onClick={() => setLightbox(null)}><button ref={closePhoto} aria-label="Cerrar fotografía" className={styles.close} onKeyDown={e => { if (e.key === 'Tab')
        e.preventDefault(); }}>×</button><img src={images[lightbox]} alt={names} onClick={e => e.stopPropagation()}/><span>{lightbox + 1} / {images.length}</span></div>}
  </div></div>;
}
