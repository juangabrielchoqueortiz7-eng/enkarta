import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PREMIUM_REGISTRY, PREMIUM_KEYS } from '@/lib/template-registry';
import EntryGate from '@/components/invitations/EntryGate';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import { PageMotionProvider } from '@/lib/scroll-motion';
import { contentToLayout } from '@/lib/layout-presets';
import { themeForTemplate, tokensForTemplate } from '@/lib/template-themes';
import type { PageMotionPreset, TemplateDecor, ParticleShape, CornerStyle, InvitationTemplate } from '@/lib/types';
import { ENKARTA_COLLECTIONS, MARFIL_VIVO_DESIGN } from '@/lib/enkarta-collections';
import { marfilVivoDemo } from '@/lib/marfil-vivo';
import { resolveLayoutBindings } from '@/lib/block-bindings';
import { entryPropsFor } from '@/components/invitations/entry/config';
import { DEFAULT_MUSIC_URL, TRACK } from '@/lib/music';
import { azureSample, passportSample, primiciaSample, paradiseSample, obsidianaSample, dolceVitaSample, graziaSample, carmesiSample, napolySample, euforiaSample, roseGoldSample, allegriaSample, provenceSample, esmeraldaSample } from '@/components/invitations/sampleData';

interface Props {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ n?: string; m?: string; full?: string; mo?: string; blocks?: string; fp?: string; cs?: string; seam?: string; fx?: string; flow?: string; prog?: string; tempo?: string; px?: string }>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Datos de muestra por key pública de /muestra (carmesi = carmesi_v2 del registry).
const SAMPLES: Record<string, any> = {
  azure: azureSample,
  primicia: primiciaSample,
  passport: passportSample,
  paradise: paradiseSample,
  obsidiana: obsidianaSample,
  dolcevita: dolceVitaSample,
  grazia: graziaSample,
  carmesi: carmesiSample,
  napoly: napolySample,
  euforia: euforiaSample,
  rosegold: roseGoldSample,
  allegria: allegriaSample,
  provence: provenceSample,
  esmeralda: esmeraldaSample,
};

// Nombre público + foto de catálogo por plantilla: alimentan el título y la
// tarjeta Open Graph al compartir la demo con un cliente (WhatsApp/redes).
const DEMO_IDENTITIES: Record<string, InvitationTemplate> = {
  azure: 'azure', primicia: 'primicia', passport: 'passport', paradise: 'paradise', obsidiana: 'obsidiana',
  dolcevita: 'dolcevita', grazia: 'grazia', carmesi: 'carmesi_v2', napoly: 'napoly', euforia: 'euforia',
  rosegold: 'rosegold', allegria: 'allegria', esmeralda: 'esmeralda', provence: 'provence',
};

const TEMPLATE_META: Record<string, { name: string; img: string; desc: string }> = Object.fromEntries(
  Object.entries(DEMO_IDENTITIES).map(([demoKey, templateKey]) => {
    const identity = ENKARTA_COLLECTIONS[templateKey];
    return [demoKey, { name: identity.name, img: identity.image, desc: identity.description }];
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ template: string }> }): Promise<Metadata> {
  const { template } = await params;
  let key = template.toLowerCase();
  if (key === 'carmesi_v2') key = 'carmesi';
  const m = key === 'marfil-vivo' ? { name: MARFIL_VIVO_DESIGN.name, img: MARFIL_VIVO_DESIGN.image, desc: MARFIL_VIVO_DESIGN.description } : TEMPLATE_META[key];
  if (!m) return {};
  const title = `Colección ${m.name} · Invitación digital — Enkarta`;
  const description = `${m.desc}. Explora su apertura, música, recorrido visual y confirmación de asistencia tal como la vivirán tus invitados.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'Enkarta', images: [{ url: m.img }] },
    twitter: { card: 'summary_large_image' },
  };
}

// Preset de scroll por plantilla en las DEMOS: cada muestra entra con la
// transición que mejor le sienta a su personalidad (?mo= sigue teniendo
// prioridad para previsualizar otro). Las invitaciones reales usan lo que el
// admin elija en el panel Animación.
const DEMO_MOTION: Record<string, PageMotionPreset> = {
  azure:     'elegant',
  primicia:  'editorial',
  passport:  'unfold',
  paradise:  'softlux',
  obsidiana: 'luxury3d',
  dolcevita: 'elegant',
  grazia:    'focus',
  carmesi:   'cinematic3d',
  napoly:    'softlux',
  euforia:   'curtain',
  rosegold:  'softlux',
  allegria:  'focus',
  provence:  'softlux',
  esmeralda: 'elegant',
};

// Canción de la colección (public/musica) que suena en cada demo. Se reparten
// las 6 pistas para que dos plantillas seguidas del catálogo nunca suenen igual;
// como hay más plantillas que canciones, algunas se repiten.
const DEMO_MUSIC: Record<string, string> = {
  azure:     TRACK.pista1,
  primicia:  TRACK.pista2,
  passport:  TRACK.pista3,
  paradise:  TRACK.pista4,
  obsidiana: TRACK.pista5,
  dolcevita: TRACK.pista6,
  grazia:    TRACK.pista1,
  carmesi:   TRACK.pista2,
  napoly:    TRACK.pista3,
  euforia:   TRACK.pista4,
  rosegold:  TRACK.pista5,
  allegria:  TRACK.pista6,
  provence:  TRACK.pista1,
  esmeralda: TRACK.pista2,
};

export default async function MuestraPage({ params, searchParams }: Props) {
  const { template } = await params;
  const { n, m, full, mo, blocks, fp, cs, seam, fx, flow, prog, tempo, px } = await searchParams;
  let key = template.toLowerCase();
  if (key === 'carmesi_v2') key = 'carmesi';

  if (key === 'marfil-vivo') {
    const demo = marfilVivoDemo();
    if (m) demo.guest_name = m;
    const config = demo.config;
    const content = <BlockRenderer layout={resolveLayoutBindings(config.layout!, demo)} theme={config.theme} tokens={config.tokens} motion={config.motion} decor={config.decor} gated={full !== '1'} demo />;
    if (full === '1') return content;
    return <EntryGate template="grazia" names={demo.names!} initials="E & M" dateLine={demo.event_date!} coverImage={demo.cover_image_url!} label={config.entry?.label} bg={config.theme?.bg} accent={config.theme?.primary} text={config.theme?.text}>{content}</EntryGate>;
  }

  const sample = SAMPLES[key];
  const registryEntry = PREMIUM_REGISTRY[key === 'carmesi' ? 'carmesi_v2' : key];
  if (!sample || !registryEntry) notFound();

  const { Comp } = registryEntry;
  const data = {
    ...sample,
    guestName: m ?? sample.guestName,
    guestPasses: n ?? sample.guestPasses,
    // Las muestras siempre suenan: la canción de la plantilla (o la de por
    // defecto si aún no tiene una asignada).
    musicUrl: sample.musicUrl ?? DEMO_MUSIC[key] ?? DEFAULT_MUSIC_URL,
  };

  // ?mo=cinematic3d|parallaxBook|elegant|minimal|none → previsualizar un preset.
  const motionVal = {
    preset: (mo as PageMotionPreset) || data.motion?.preset || DEMO_MOTION[key] || 'elegant',
    ...(flow ? { scrollFlow: flow as 'free' | 'guided' | 'cinematic' } : {}),
    ...(prog ? { progress: prog as 'none' | 'line' | 'steps' } : {}),
    ...(tempo ? { tempo: tempo as 'quick' | 'balanced' | 'slow' } : {}),
    ...(px ? { parallax: Math.max(0, Math.min(0.25, Number(px) / 100)) } : {}),
  };
  // ?blocks=1 → previsualizar la versión por bloques (constructor) de la plantilla.
  // ?seam=<forma>&fx=<efecto> → previsualizar la costura y su efecto de scroll.
  // ?fp=<forma>&cs=<estilo esquina> → previsualizar partículas/adornos concretos.
  const previewDecor: TemplateDecor | undefined = (fp || cs)
    ? {
        background: 'art',
        floating: fp ? { on: true, shape: fp as ParticleShape } : undefined,
        corners: cs ? { on: true, style: cs as CornerStyle } : undefined,
      }
    : key === 'azure'
      ? { background: 'art', corners: { on: true }, floating: { on: true }, ...(data.decor ?? {}) }
      : data.decor;
  const el = blocks === '1' ? (
    <BlockRenderer layout={contentToLayout(data, key)} theme={data.theme ?? themeForTemplate(key)} motion={motionVal} decor={previewDecor} tokens={{ ...(data.tokens ?? tokensForTemplate(key)), ...(seam ? { seam: seam as never } : {}), ...(fx ? { seamFx: fx as never } : {}) }} musicUrl={data.musicUrl} gated={full !== '1'} demo />
  ) : (
    <PageMotionProvider value={motionVal} gated={full !== '1'}>
      <div className="ek-invite"><Comp data={data} /></div>
    </PageMotionProvider>
  );

  // El enlace directo (?full=1) salta la portada de entrada.
  if (full === '1') return el;

  const gate = entryPropsFor(key, data);
  return (
    <EntryGate template={key} names={gate.names} initials={gate.initials} dateLine={gate.dateLine} coverImage={gate.coverImage}>
      {el}
    </EntryGate>
  );
}

export function generateStaticParams() {
  return [...PREMIUM_KEYS, 'marfil-vivo'].map(template => ({ template }));
}

/**
 * Cinturón de seguridad para las fechas de las muestras, que se calculan a
 * partir de HOY (ver `fechaDemo` en sampleData.ts).
 *
 * Hoy esta ruta ya se renderiza EN CADA PETICIÓN —lee `searchParams`, lo que
 * la saca del prerenderizado pese al `generateStaticParams` de arriba—, así que
 * la fecha siempre sale fresca y esto no llega a hacer nada. Está puesto por si
 * algún día se deja de leer `searchParams`: entonces la página pasaría a HTML
 * estático y, sin esto, las fechas se congelarían en el build y volverían a
 * envejecer entre despliegue y despliegue. Que es justo lo que pasó: siete
 * demos acabaron con la boda en el pasado y la cuenta regresiva en ceros.
 */
export const revalidate = 86400;
