'use client';

/**
 * Esmeralda — verde bosque, formal y muy aireada.
 *
 * La plantilla se apoya en una idea tipográfica en lugar de en adornos: el
 * caballo de batalla es una versalita DIMINUTA (10-11px de Cinzel con mucho
 * tracking) repetida en cada etiqueta, el cuerpo va en Cormorant y el script
 * queda reservado ÚNICAMENTE para los nombres de la pareja. Ese contraste —
 * texto pequeñísimo + un solo gesto grande + mucho aire — es lo que da el aire
 * de papelería cara sin necesidad de ilustraciones.
 *
 * Comparte la forma de datos de DolceVita, así que entra en el builder y en el
 * mapper existentes sin tocar nada más.
 */

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import {
  useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon,
  CopyBtn, SECTION, TYPE, ENKARTA_WA_URL, seamsFor,
} from './shared';
import BrandByline from '@/components/brand/BrandByline';

// ── Paleta por defecto ────────────────────────────────────────────────────────
const DEFAULT_C = {
  paper: '#f3f4ec',      // crema de fondo
  paperAlt: '#e9ebdf',   // crema un punto más oscuro (bandas alternas)
  forest: '#2f4a33',     // verde bosque dominante
  forestDeep: '#22301f', // verde casi negro (pie y banda de vestimenta)
  olive: '#5a7444',      // verde medio — SOLO trazos de iconos (decorativo)
  // Tres oros a propósito: el pálido es decorativo (filetes, sello) y no
  // necesita contraste; los textos diminutos usan una versión oscura sobre
  // crema y una clara sobre verde. Con un solo oro, las etiquetas de 10px
  // quedaban en 1.87:1 — ilegibles.
  gold: '#c6a96b',       // filetes y sellos (decorativo)
  goldDeep: '#7d6230',   // etiquetas pequeñas sobre crema
  goldLight: '#d8bd82',  // etiquetas pequeñas sobre verde
  ink: '#26301f',        // texto sobre crema
  cream: '#eef0e4',      // texto sobre verde
  line: 'rgba(47,74,51,0.22)',
};
type ESPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<ESPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveEsmeraldaTheme(t?: TemplateTheme): ESPalette {
  return {
    paper:      t?.bg          || DEFAULT_C.paper,
    paperAlt:   DEFAULT_C.paperAlt,
    forest:     t?.primary     || DEFAULT_C.forest,
    forestDeep: t?.primaryDeep || DEFAULT_C.forestDeep,
    olive:      DEFAULT_C.olive,
    gold:       DEFAULT_C.gold,
    goldDeep:   DEFAULT_C.goldDeep,
    goldLight:  DEFAULT_C.goldLight,
    ink:        t?.text        || DEFAULT_C.ink,
    cream:      t?.onPrimary   || DEFAULT_C.cream,
    line:       t?.line        || DEFAULT_C.line,
  };
}

// ── Piezas tipográficas ───────────────────────────────────────────────────────
/** La versalita diminuta: el elemento más repetido de toda la plantilla. */
function Over({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`font-cinzel uppercase ${className}`}
      style={{ fontSize: 10, letterSpacing: '0.34em', lineHeight: 1.8, ...style }}>
      {children}
    </p>
  );
}

/** Título de sección: sigue siendo pequeño a propósito. */
function Title({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <h2 className={`font-cinzel uppercase ${className}`}
      style={{ fontSize: 13, letterSpacing: '0.3em', lineHeight: 1.7, ...style }}>
      {children}
    </h2>
  );
}

/** Dato concreto (hora, lugar, nombre propio). */
function Data({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`font-cinzel uppercase ${className}`}
      style={{ fontSize: 11, letterSpacing: '0.2em', lineHeight: 1.9, ...style }}>
      {children}
    </p>
  );
}

function Body({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`font-cormorant ${className}`}
      style={{ fontSize: TYPE.body, lineHeight: 1.75, ...style }}>
      {children}
    </p>
  );
}

/** Filete con rombo: el único "adorno" que se permite la plantilla. */
function Rule({ color, width = 96 }: { color?: string; width?: number }) {
  const C = useC();
  const c = color ?? C.gold;
  return (
    <span className="mx-auto flex items-center justify-center gap-2" style={{ width }} aria-hidden>
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${c})`, opacity: 0.7 }} />
      <span style={{ width: 4, height: 4, background: c, transform: 'rotate(45deg)' }} />
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${c}, transparent)`, opacity: 0.7 }} />
    </span>
  );
}

/** Botón: rectángulo de filete fino, nunca relleno chillón. */
function Btn({ children, href, tone = 'dark' }: { children: React.ReactNode; href: string; tone?: 'dark' | 'light' }) {
  const C = useC();
  const dark = tone === 'dark';
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="font-cinzel inline-flex items-center justify-center gap-2 uppercase transition-all duration-300 hover:opacity-80"
      style={{
        fontSize: 10, letterSpacing: '0.24em',
        padding: '13px 26px',
        color: dark ? C.cream : C.forest,
        background: dark ? C.forest : 'transparent',
        border: `1px solid ${dark ? C.forest : C.line}`,
      }}
    >
      {children}
    </a>
  );
}

/** Sello circular con las iniciales — el equivalente propio a un monograma. */
function Seal({ a, b, color, ink, size = 92 }: { a: string; b: string; color: string; ink: string; size?: number }) {
  return (
    // mx-auto: el sello es de ancho fijo, así que `text-center` del contenedor
    // no lo centra por sí solo.
    <div className="relative mx-auto flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <span className="absolute inset-0 rounded-full" style={{ border: `1px solid ${color}` }} />
      <span className="absolute rounded-full" style={{ inset: 5, border: `1px solid ${color}`, opacity: 0.45 }} />
      <span className="font-cinzel" style={{ color: ink, fontSize: size * 0.24, letterSpacing: '0.06em' }}>
        {a}<span style={{ opacity: 0.5 }}> · </span>{b}
      </span>
    </div>
  );
}

export default function Esmeralda({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveEsmeraldaTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.paper;
    return () => { document.body.style.background = ''; };
  }, [C.paper]);

  const toggleMusic = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  const gcal = (() => {
    const s = data.isoDate.replace(/[-:]/g, '').slice(0, 15) + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Boda ${data.groom} & ${data.bride}`)}&dates=${s}/${s}`;
  })();

  const ini = (s?: string) => (s ?? '').trim().charAt(0).toUpperCase();
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Horas' }, { v: mins, l: 'Min' }, { v: secs, l: 'Seg' }];

  const eventos = [
    { label: 'Ceremonia Religiosa', c: data.ceremonyReligious, icon: 'church' as const },
    ...(data.ceremonyCivil ? [{ label: 'Ceremonia Civil', c: data.ceremonyCivil, icon: 'rings' as const }] : []),
    ...(data.reception ? [{ label: 'Recepción Social', c: data.reception, icon: 'cheers' as const }] : []),
  ];

  // Costuras: la banda que entra sube en arco sobre la anterior, con el filete
  // dorado siguiendo el borde. El arco es el único gesto "dibujado" que se
  // permite la plantilla, y encaja porque es arquitectura, no ilustración.
  const sew = seamsFor([
    { k: 'portada',    c: C.forestDeep },
    { k: 'intro',      c: C.paper },
    { k: 'padres',     c: C.paperAlt },
    !!data.guestName && { k: 'invitado', c: C.forest },
    { k: 'fecha',      c: C.paper },
    { k: 'lugares',    c: C.paperAlt },
    { k: 'vestimenta', c: C.forestDeep },
    !!data.itinerary?.length && { k: 'itinerario', c: C.paper },
    !!data.galleryImages?.length && { k: 'galeria', c: C.paperAlt },
    { k: 'regalo',     c: C.paper },
    !!data.noKids && { k: 'ninos', c: C.paperAlt },
    !!data.thanksMessage && { k: 'gracias', c: C.forest },
    { k: 'rsvp',       c: C.paper },
    !!data.galleryUrl && { k: 'compartir', c: C.paperAlt },
    { k: 'pie',        c: C.forestDeep },
  ], { shape: 'arch', hairline: C.gold });

  return (
    <ThemeCtx.Provider value={C}>
      <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink }}>
        <style>{`@keyframes esSpin{to{transform:rotate(360deg)}}`}</style>

        {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
        {data.musicUrl && (
          <button onClick={toggleMusic}
            className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
            style={{ background: C.paper, color: C.forest, border: `1px solid ${C.line}` }} aria-label="Música">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'esSpin 4s linear infinite' : 'none' }}>
              <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
            </svg>
          </button>
        )}

        {/* ════════ PORTADA ════════ */}
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 text-center">
          {data.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns" />
          )}
          {/* Velo verde: la foto queda como TEXTURA, nunca compite con el texto.
              Tiene que ser opaco de verdad — con un velo suave el dorado de la
              versalita se lava sobre las zonas claras de la foto. */}
          <span className="absolute inset-0" style={{
            background: `linear-gradient(180deg, ${C.forestDeep}f5 0%, ${C.forest}e0 42%, ${C.forestDeep}fa 100%)`,
          }} />

          <div className="relative z-10 flex flex-col items-center">
            <Over style={{ color: C.goldLight }}>Tenemos el honor de invitarte a nuestra boda</Over>

            <div className="my-8">
              <Seal a={ini(data.groom)} b={ini(data.bride)} color={C.gold} ink={C.cream} />
            </div>

            <h1 className="font-great" style={{ color: C.cream, fontSize: TYPE.display, lineHeight: 1.05 }}>
              {data.groom}
            </h1>
            <span className="font-great my-1" style={{ color: C.gold, fontSize: 'clamp(24px,6vw,34px)', lineHeight: 1 }}>&amp;</span>
            <h1 className="font-great" style={{ color: C.cream, fontSize: TYPE.display, lineHeight: 1.05 }}>
              {data.bride}
            </h1>

            <span className="my-7"><Rule color={C.gold} width={120} /></span>

            <Data style={{ color: C.cream, letterSpacing: '0.4em' }}>
              {data.dateMonth} {data.dateYear}
            </Data>
            {data.dateCity && <Over className="mt-1" style={{ color: `${C.cream}b3` }}>{data.dateCity}</Over>}
          </div>
        </section>

        {/* ════════ INTRO ════════ */}
        <section className={`relative px-8 ${SECTION.roomy} text-center`} style={{ background: C.paper }}>
          {sew('intro')}
          <Reveal className="mx-auto max-w-xl">
            <Body style={{ color: C.ink }}>{data.introMessage}</Body>
          </Reveal>
        </section>

        {/* ════════ BENDICIÓN + PADRES ════════ */}
        <section className={`relative px-8 ${SECTION.base} text-center`} style={{ background: C.paperAlt }}>
          {sew('padres')}
          <Reveal className="mx-auto max-w-2xl">
            <Over style={{ color: C.forest }}>{data.blessing}</Over>
            <span className="mt-6 block"><Rule /></span>

            <div className="mt-9 grid gap-9 sm:grid-cols-2">
              {[
                { t: 'Padres de la novia', p: data.parentsBride },
                { t: 'Padres del novio', p: data.parentsGroom },
              ].filter(col => col.p?.length).map(col => (
                <div key={col.t}>
                  <Over style={{ color: C.goldDeep }}>{col.t}</Over>
                  <div className="mt-3 space-y-0.5">
                    {col.p.map((n, i) => <Data key={i} style={{ color: C.ink }}>{n}</Data>)}
                  </div>
                </div>
              ))}
            </div>

            {data.padrinos?.length > 0 && (
              <div className="mt-9">
                <Over style={{ color: C.goldDeep }}>Padrinos</Over>
                <div className="mt-3 space-y-0.5">
                  {data.padrinos.map((n, i) => <Data key={i} style={{ color: C.ink }}>{n}</Data>)}
                </div>
              </div>
            )}
          </Reveal>
        </section>

        {/* ════════ INVITADO ════════ */}
        {data.guestName && (
          <section className={`relative px-8 ${SECTION.base} text-center`} style={{ background: C.forest, color: C.cream }}>
            {sew('invitado')}
            <Reveal className="mx-auto max-w-lg">
              <Over style={{ color: `${C.cream}cc` }}>Con especial cariño para</Over>
              <p className="font-great mt-4" style={{ color: C.cream, fontSize: 'clamp(36px,9vw,52px)', lineHeight: 1.1 }}>
                {data.guestName}
              </p>
              {data.guestPasses && (
                <>
                  <span className="mt-6 block"><Rule color={C.gold} width={70} /></span>
                  <Data className="mt-5" style={{ color: C.goldLight }}>{data.guestPasses}</Data>
                </>
              )}
            </Reveal>
          </section>
        )}

        {/* ════════ FECHA + CUENTA REGRESIVA ════════ */}
        <section className={`relative px-8 ${SECTION.roomy} text-center`} style={{ background: C.paper }}>
          {sew('fecha')}
          <Reveal className="mx-auto max-w-lg">
            <Over style={{ color: C.forest }}>Queremos que nos acompañes en nuestro día</Over>

            <Data className="mt-7" style={{ color: C.ink, fontSize: 13, letterSpacing: '0.3em' }}>
              {data.dateWeekday}
            </Data>
            <p className="font-cinzel my-1" style={{ color: C.forest, fontSize: 'clamp(56px,15vw,88px)', lineHeight: 1 }}>
              {data.dateDay}
            </p>
            <Data style={{ color: C.ink, fontSize: 13, letterSpacing: '0.3em' }}>
              {data.dateMonth} · {data.dateYear}
            </Data>

            <span className="mt-8 block"><Rule /></span>

            <Over className="mt-8" style={{ color: C.forest }}>Faltan</Over>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {cd.map(c => (
                <div key={c.l}>
                  <p className="font-cinzel" style={{ color: C.forest, fontSize: 'clamp(24px,6vw,34px)', lineHeight: 1 }}>
                    <Odometer value={c.v} />
                  </p>
                  <Over className="mt-2" style={{ color: C.forest, fontSize: 9 }}>{c.l}</Over>
                </div>
              ))}
            </div>

            <div className="mt-9"><Btn href={gcal} tone="light"><CalIcon />Agendar el evento</Btn></div>
          </Reveal>
        </section>

        {/* ════════ CEREMONIA / RECEPCIÓN ════════ */}
        <section className={`relative px-8 ${SECTION.base}`} style={{ background: C.paperAlt }}>
          {sew('lugares')}
          <Reveal className="mx-auto max-w-3xl">
            <div className="grid gap-12 sm:grid-cols-2">
              {eventos.map(ev => (
                <div key={ev.label} className="flex flex-col items-center text-center">
                  <EventIcon name={ev.icon} className="h-9 w-9" stroke={C.olive} custom={data} />
                  <Title className="mt-5" style={{ color: C.forest }}>{ev.label}</Title>
                  <span className="my-4 block"><Rule width={60} /></span>
                  <Data style={{ color: C.ink }}>{ev.c.place}</Data>
                  <Data className="mt-1" style={{ color: C.goldDeep, letterSpacing: '0.3em' }}>{ev.c.time}</Data>
                  {ev.c.maps && <div className="mt-5"><Btn href={ev.c.maps} tone="light">Ver ubicación</Btn></div>}
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ════════ CÓDIGO DE VESTIMENTA ════════ */}
        <section className={`relative px-8 ${SECTION.roomy} text-center`} style={{ background: C.forestDeep, color: C.cream }}>
          {sew('vestimenta')}
          <Reveal className="mx-auto max-w-xl">
            <Over style={{ color: C.goldLight }}>Código de vestimenta</Over>
            <p className="font-cinzel mt-6 uppercase" style={{ color: C.cream, fontSize: 'clamp(22px,5vw,30px)', letterSpacing: '0.22em' }}>
              {data.dressCode}
            </p>
            <span className="mt-7 block"><Rule color={C.gold} width={80} /></span>
            <Over className="mt-6" style={{ color: `${C.cream}cc` }}>
              Se reserva el color blanco exclusivamente para la novia
            </Over>
          </Reveal>
        </section>

        {/* ════════ ITINERARIO ════════ */}
        {data.itinerary?.length > 0 && (
          <section className={`relative px-8 ${SECTION.roomy}`} style={{ background: C.paper }}>
            {sew('itinerario')}
            <Reveal className="mx-auto max-w-md">
              <Title className="text-center" style={{ color: C.forest }}>Itinerario</Title>
              <span className="mx-auto mt-5 block"><Rule /></span>

              {/* w-fit + mx-auto: la columna se ajusta a su contenido y se
                  centra como bloque. Con un ancho máximo suelto, los hitos
                  quedaban pegados a la izquierda de una caja mucho más ancha. */}
              <div className="relative mt-10 w-fit mx-auto">
                {/* Hilo vertical que enhebra los hitos */}
                <span className="absolute bottom-3 left-[22px] top-3 w-px" style={{ background: C.line }} aria-hidden />
                <div className="space-y-8">
                  {data.itinerary.map((it, i) => (
                    <div key={i} className="relative flex items-center gap-6">
                      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                        style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                        <EventIcon name={it.icon ?? 'rings'} className="h-5 w-5" stroke={C.olive}
                          custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                      </span>
                      <div className="text-left">
                        <Data style={{ color: C.ink }}>{it.label}</Data>
                        <Over style={{ color: C.goldDeep }}>{it.time}</Over>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ════════ GALERÍA / HISTORIA ════════ */}
        {data.galleryImages?.length > 0 && (
          <section className={`relative px-8 ${SECTION.base}`} style={{ background: C.paperAlt }}>
            {sew('galeria')}
            <Reveal className="mx-auto max-w-4xl text-center">
              <Title style={{ color: C.forest }}>Nuestra historia</Title>
              <span className="mx-auto mt-5 block"><Rule /></span>
              {/* Baja la saturación lo justo para que las fotos convivan con el
                  verde bosque. El cliente sube las suyas y no podemos elegirlas,
                  así que la plantilla tiene que aguantar cualquier paleta sin
                  que la galería pegue un grito en medio de la invitación. */}
              <div style={{ filter: 'saturate(0.82) contrast(1.02)' }}>
                <MasonryGallery images={data.galleryImages} captions={data.galleryCaptions} variant="rounded" className="mt-9" />
              </div>
            </Reveal>
          </section>
        )}

        {/* ════════ REGALO ════════ */}
        <section className={`relative px-8 ${SECTION.roomy} text-center`} style={{ background: C.paper }}>
          {sew('regalo')}
          <Reveal className="mx-auto max-w-xl">
            <Title style={{ color: C.forest }}>Sugerencia de regalo</Title>
            <span className="mx-auto mt-5 block"><Rule /></span>
            <Body className="mx-auto mt-6 max-w-md" style={{ color: C.ink }}>{data.giftMessage}</Body>

            <div className="mt-9 space-y-7">
              {data.giftCash && <div><Over style={{ color: C.goldDeep }}>En efectivo</Over><Data style={{ color: C.ink }}>{data.giftCash}</Data></div>}
              {data.giftBank && (
                <div>
                  <Over style={{ color: C.goldDeep }}>{data.giftBank.bank}</Over>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <Data style={{ color: C.ink }}>{data.giftBank.account}</Data>
                    <CopyBtn value={data.giftBank.account} color={C.olive} />
                  </div>
                  <Over style={{ color: `${C.ink}cc` }}>{data.giftBank.holder}</Over>
                </div>
              )}
              {data.giftOther && <div><Over style={{ color: C.goldDeep }}>Otros</Over><Data style={{ color: C.ink }}>{data.giftOther}</Data></div>}
            </div>

            {data.giftQrUrl && (
              <div className="mx-auto mt-9 inline-block p-2" style={{ border: `1px solid ${C.line}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.giftQrUrl} alt="QR" className="h-32 w-32 bg-white p-1" />
              </div>
            )}
            {data.giftThanks && <Over className="mt-6" style={{ color: C.forest }}>{data.giftThanks}</Over>}
          </Reveal>
        </section>

        {/* ════════ SOLO ADULTOS ════════ */}
        {data.noKids && (
          <section className={`relative px-8 ${SECTION.base} text-center`} style={{ background: C.paperAlt }}>
            {sew('ninos')}
            <Reveal className="mx-auto max-w-lg">
              <Over style={{ color: C.goldDeep }}>Solo adultos</Over>
              <Body className="mt-5" style={{ color: C.ink }}>{data.noKids}</Body>
            </Reveal>
          </section>
        )}

        {/* ════════ AGRADECIMIENTO ════════ */}
        {data.thanksMessage && (
          <section className={`relative px-8 ${SECTION.roomy} text-center`} style={{ background: C.forest, color: C.cream }}>
            {sew('gracias')}
            <Reveal className="mx-auto max-w-xl">
              <Body style={{ color: C.cream }}>{data.thanksMessage}</Body>
              <span className="mt-7 block"><Rule color={C.gold} width={80} /></span>
              <p className="font-great mt-6" style={{ color: C.cream, fontSize: 'clamp(30px,7vw,42px)', lineHeight: 1.1 }}>
                {data.groom} &amp; {data.bride}
              </p>
            </Reveal>
          </section>
        )}

        {/* ════════ CONFIRMACIÓN ════════ */}
        <section className={`relative px-8 ${SECTION.roomy} text-center`} style={{ background: C.paper }}>
          {sew('rsvp')}
          <Reveal className="mx-auto max-w-lg">
            <Title style={{ color: C.forest }}>Confirma tu asistencia</Title>
            <span className="mx-auto mt-5 block"><Rule /></span>
            <Body className="mx-auto mt-6 max-w-md" style={{ color: C.ink }}>{data.rsvpClosing}</Body>
            <div className="mt-8"><Btn href={data.whatsapp}>Confirmar asistencia</Btn></div>
          </Reveal>
        </section>

        {/* ════════ GALERÍA COMPARTIDA ════════ */}
        {data.galleryUrl && (
          <section className={`relative px-8 ${SECTION.base} text-center`} style={{ background: C.paperAlt }}>
            {sew('compartir')}
            <Reveal className="mx-auto max-w-md">
              <EventIcon name="camera" className="mx-auto h-9 w-9" stroke={C.olive} custom={data} sec="gallery" />
              <Body className="mt-5" style={{ color: C.ink }}>{data.galleryMsg}</Body>
              <div className="mt-7"><Btn href={data.galleryUrl} tone="light">Compartir fotografías</Btn></div>
            </Reveal>
          </section>
        )}

        {/* ════════ PIE ════════ */}
        <footer className="relative py-12 text-center" style={{ background: C.forestDeep, color: C.cream }}>
          {sew('pie')}
          <Seal a={ini(data.groom)} b={ini(data.bride)} color={C.gold} ink={C.cream} size={64} />
          <p className="mt-5 font-great text-2xl">Enkarta</p>
          <BrandByline tone="inherit" className="mt-1 justify-center" />
          <div className="mx-auto mt-6 max-w-xs">
            <Over style={{ color: `${C.cream}cc` }}>
              ¿Deseas una invitación para tu evento?{' '}
              <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer"
                style={{ color: C.goldLight, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Contáctanos
              </a>
            </Over>
          </div>
        </footer>
      </div>
    </ThemeCtx.Provider>
  );
}
