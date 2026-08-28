'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { Block } from '@/lib/types';
import { usePageMotion } from '@/lib/scroll-motion';
import { Editable } from './editable';
import { useBlockTheme } from './theme';
import { useBlockTypography } from './typography';

const str = (b: Block, key: string, fallback = '') =>
  typeof b.props[key] === 'string' ? (b.props[key] as string) : fallback;

function PassportMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 90 90" width="72" height="72" fill="none" stroke={color} strokeWidth="1.25" aria-hidden>
      <circle cx="45" cy="45" r="28" opacity=".55" />
      <circle cx="45" cy="45" r="20" opacity=".28" />
      <path d="M45 10 51 39 80 45 51 51 45 80 39 51 10 45 39 39Z" opacity=".82" />
      <path d="m45 18 4 23-4 4-4-4Z" fill={color} stroke="none" />
      <text x="45" y="7" textAnchor="middle" fontSize="7" fill={color} stroke="none">N</text>
      <text x="45" y="88" textAnchor="middle" fontSize="7" fill={color} stroke="none">S</text>
      <text x="85" y="48" textAnchor="middle" fontSize="7" fill={color} stroke="none">E</text>
      <text x="5" y="48" textAnchor="middle" fontSize="7" fill={color} stroke="none">O</text>
    </svg>
  );
}

/** Mapa original y simplificado: funciona como textura editorial, no como mapa geográfico. */
function RouteMap({ color, origin, destination }: { color: string; origin: string; destination: string }) {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 900 700" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
      <g fill={color} opacity=".105">
        <path d="M73 162c43-78 134-105 232-78l57 35-23 42-48 5-24 43-54 6-28 54-55-8-26-45-55-16Z" />
        <path d="m279 284 59 16 35 56-18 93-41 105-39-32 6-73-25-47 11-77Z" />
        <path d="m466 139 77-28 42 18 46-18 119 36 72 85-38 32-93-2-48 28-37-9-40 30-74-41-39-56Z" />
        <path d="m524 287 78 12 48 78-25 129-62 72-38-87-46-70 11-93Z" />
        <path d="m724 447 78-15 53 48-34 55-86-11-24-39Z" />
        <path d="M92 564c105-38 198-31 298 15M502 591c99-28 188-20 283 16" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" opacity=".3" />
      </g>
      <g stroke={color} strokeWidth="1" opacity=".14">
        {Array.from({ length: 11 }).map((_, index) => <path key={`v-${index}`} d={`M${90 + index * 72} 80v550`} strokeDasharray="2 11" />)}
        {Array.from({ length: 8 }).map((_, index) => <path key={`h-${index}`} d={`M52 ${100 + index * 72}h800`} strokeDasharray="2 11" />)}
      </g>
      <motion.path
        d="M225 425 C 350 285, 534 256, 714 378"
        stroke={color}
        strokeWidth="3"
        strokeDasharray="5 12"
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: .78 }}
        viewport={{ once: true, amount: .35 }}
        transition={{ duration: 2.2, ease: 'easeInOut' }}
      />
      <g fill={color}>
        <circle cx="225" cy="425" r="8" opacity=".85" />
        <circle cx="714" cy="378" r="8" opacity=".85" />
        <g transform="translate(515 273) rotate(18)">
          <motion.g
            initial={reduced ? false : { x: -40, y: 30, rotate: -20, opacity: 0 }}
            whileInView={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: .8, ease: 'easeOut' }}
          >
            <path d="M0 14 38 4 45 8 29 19l13 14-5 3-20-10-11 7-5-2 8-10-9-4Z" />
          </motion.g>
        </g>
      </g>
      <g fill={color} fontFamily="'Cinzel',serif" fontSize="13" letterSpacing="2">
        <text x="197" y="458" textAnchor="middle">{origin.toUpperCase()}</text>
        <text x="714" y="411" textAnchor="middle">{destination.toUpperCase()}</text>
      </g>
    </svg>
  );
}

export const PassportHeroBlock: React.FC<{ block: Block }> = ({ block }) => {
  const type = useBlockTypography(block);
  const t = useBlockTheme();
  const m = usePageMotion();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, container: m.scrollRoot, offset: ['start start', 'end start'] });
  const still = reduced || m.parallax === 0;
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', still ? '0%' : '14%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.04, still ? 1.04 : 1.14]);
  const artY = useTransform(scrollYProgress, [0, 1], ['0%', still ? '0%' : '-6%']);
  const image = str(block, 'image');
  const groom = str(block, 'groom', 'Robert');
  const bride = str(block, 'bride', 'Isabella');
  const origin = str(block, 'origin', 'Colombia');
  const destination = str(block, 'destination', 'Bolivia');

  return (
    <section ref={ref} data-ek-section={block.id} className="ek-passport-hero relative isolate min-h-[100svh] overflow-hidden" style={{ background: t.bg, scrollSnapAlign: m.scrollFlow === 'free' ? undefined : 'start' }}>
      <style>{`
        .ek-passport-hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:100svh}
        .ek-passport-photo{min-height:100svh}
        .ek-passport-art{min-height:100svh}
        @media(max-width:760px){
          .ek-passport-hero-grid{grid-template-columns:1fr;min-height:auto}
          .ek-passport-photo{min-height:54svh}
          .ek-passport-art{min-height:70svh}
        }
      `}</style>
      <div className="ek-passport-hero-grid">
        <div className="ek-passport-photo relative overflow-hidden" style={{ background: t.primaryDeep }}>
          {image ? (
            <motion.img src={image} alt={`${groom} e ${bride}`} className="absolute inset-0 h-full w-full object-cover" style={{ y: imageY, scale: imageScale, objectPosition: str(block, 'focal', '50% 50%') }} />
          ) : (
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 32% 28%, ${t.primary} 0, transparent 24%), linear-gradient(145deg, ${t.primaryDeep}, ${t.primary})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-black/20" />
          <div className="absolute left-6 top-6 flex items-center gap-3 text-white/90 invite-sm:left-9 invite-sm:top-8">
            <span className="h-px w-8 bg-current" />
            <Editable k="eyebrow" value={str(block, 'eyebrow', 'Nuestra próxima aventura')} className="font-cinzel text-[10px] uppercase tracking-[.24em]" style={type('label')} />
          </div>
          <div className="absolute bottom-10 left-7 right-7 flex items-end justify-between text-white invite-sm:bottom-14 invite-sm:left-10 invite-sm:right-10">
            <div>
              <p className="font-cormorant text-sm italic opacity-80" style={type('note')}>Save the date</p>
              <Editable k="dateLabel" value={str(block, 'dateLabel', '26 · 12 · 2026')} className="font-cinzel text-base tracking-[.18em] invite-sm:text-xl" style={type('time')} />
            </div>
            <span className="hidden rounded-full border border-white/60 px-3 py-1 font-cinzel text-[9px] uppercase tracking-[.2em] backdrop-blur-sm invite-sm:inline-flex">Boarding</span>
          </div>
        </div>

        <motion.div className="ek-passport-art relative flex items-center justify-center overflow-hidden px-5 py-16 invite-sm:px-10" style={{ y: artY, color: t.text }}>
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `radial-gradient(${t.primary}22 1px, transparent 1px), linear-gradient(118deg, transparent 68%, ${t.primary}0a 68%)`, backgroundSize: '16px 16px, 100% 100%' }} />
          <RouteMap color={t.primary} origin={origin} destination={destination} />
          <div className="relative z-10 flex w-full max-w-[620px] flex-col items-center text-center">
            <PassportMark color={t.primary} />
            <Editable as="p" k="tagline" value={str(block, 'tagline', 'Pasaporte a nuestra boda')} className="mt-3 font-cinzel text-[10px] uppercase tracking-[.28em]" style={{ color: t.muted }} />
            <div className="my-5 h-px w-20" style={{ background: t.line }} />
            <Editable as="h1" k="groom" value={groom} className="font-great leading-[.78]" style={{ color: t.primary, fontSize: type('display').fontFamily ? 'clamp(42px, 10cqw, 82px)' : 'clamp(52px,7vw,104px)', ...type('display') }} />
            <span className="my-1 font-cormorant text-xl italic" style={{ color: t.muted }}>&amp;</span>
            <Editable as="h1" k="bride" value={bride} className="font-great leading-[.78]" style={{ color: t.primary, fontSize: type('display').fontFamily ? 'clamp(42px, 10cqw, 82px)' : 'clamp(52px,7vw,104px)', ...type('display') }} />
            <div className="mt-8 flex items-center gap-4 font-cinzel text-[9px] uppercase tracking-[.2em]" style={{ color: t.muted }}>
              <span>{origin}</span><span className="h-px w-10" style={{ background: t.line }} /><span>{destination}</span>
            </div>
          </div>
        </motion.div>
      </div>
      <svg viewBox="0 0 1200 70" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-px left-0 z-20 h-9 w-full invite-sm:h-14" aria-hidden>
        <path d="M0 36C180 70 340 5 560 34s368 48 640 4v32H0Z" fill={t.bg} />
      </svg>
    </section>
  );
};

export const PassportTicketBlock: React.FC<{ block: Block }> = ({ block }) => {
  const type = useBlockTypography(block);
  const reduced = useReducedMotion();
  const t = useBlockTheme();
  const m = usePageMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, container: m.scrollRoot, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], reduced || m.parallax === 0 ? ['0%', '0%'] : ['-3%', '4%']);

  return (
    <section id="passport-ticket" ref={ref} data-ek-section={block.id} className="relative overflow-hidden py-14 invite-sm:py-20" style={{ background: t.bg, scrollSnapAlign: m.scrollFlow === 'free' ? undefined : 'center' }}>
      <motion.div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ y: drift, backgroundImage: `radial-gradient(${t.primary} 1.2px, transparent 1.2px)`, backgroundSize: '14px 14px' }} />
      <svg viewBox="0 0 1200 92" preserveAspectRatio="none" className="relative -mb-px h-14 w-full invite-sm:h-20" aria-hidden>
        <path d="M0 67C210 106 332 9 586 47s391 61 614 11v34H0Z" fill={t.primaryDeep} />
      </svg>
      <div className="relative px-6 py-14 text-center invite-sm:py-20" style={{ background: t.primaryDeep, color: t.onPrimary }}>
        <div className="mx-auto max-w-2xl">
          <Editable as="p" k="callout" value={str(block, 'callout', 'Prepara tus maletas y acompáñanos en esta aventura.')} className="font-cormorant text-xl leading-relaxed invite-sm:text-2xl" style={type('body')} />
          <Editable as="p" k="question" value={str(block, 'question', '¿Te unes?')} effect="write" className="mt-1 font-great text-4xl invite-sm:text-5xl" style={type('title')} />
          <div className="mx-auto my-9 flex max-w-lg items-center gap-4 opacity-60"><span className="h-px flex-1 bg-current" /><span>♥</span><span className="h-px flex-1 bg-current" /></div>
          <p className="font-cinzel text-[10px] uppercase tracking-[.22em] opacity-70">Hemos reservado</p>
          <Editable as="p" k="passesLabel" value={str(block, 'passesLabel', '2 pases')} className="mt-3 font-great text-4xl invite-sm:text-5xl" style={type('title')} />
          <p className="mt-3 font-cormorant text-base opacity-80">en honor de</p>
          <Editable as="p" k="guestName" value={str(block, 'guestName', 'Invitado especial')} effect="cascadeWords" className="mt-3 font-cormorant text-2xl invite-sm:text-3xl" style={type('subtitle')} />
        </div>
      </div>
      <svg viewBox="0 0 1200 92" preserveAspectRatio="none" className="relative -mt-px h-14 w-full rotate-180 invite-sm:h-20" aria-hidden>
        <path d="M0 67C210 106 332 9 586 47s391 61 614 11v34H0Z" fill={t.primaryDeep} />
      </svg>
    </section>
  );
};
