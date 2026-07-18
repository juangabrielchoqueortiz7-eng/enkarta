import { notFound } from 'next/navigation';
import { PREMIUM_REGISTRY, PREMIUM_KEYS } from '@/lib/template-registry';
import EntryGate from '@/components/invitations/EntryGate';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import { PageMotionProvider } from '@/lib/scroll-motion';
import { contentToLayout } from '@/lib/layout-presets';
import { themeForTemplate, tokensForTemplate } from '@/lib/template-themes';
import type { PageMotionPreset, TemplateDecor, ParticleShape, CornerStyle } from '@/lib/types';
import { entryPropsFor } from '@/components/invitations/entry/config';
import { DEFAULT_MUSIC_URL } from '@/lib/music';
import { azureSample, passportSample, primiciaSample, paradiseSample, obsidianaSample, dolceVitaSample, graziaSample, carmesiSample, napolySample, euforiaSample, roseGoldSample, allegriaSample } from '@/components/invitations/sampleData';

interface Props {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ n?: string; m?: string; full?: string; mo?: string; blocks?: string; fp?: string; cs?: string }>;
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
};

export default async function MuestraPage({ params, searchParams }: Props) {
  const { template } = await params;
  const { n, m, full, mo, blocks, fp, cs } = await searchParams;
  let key = template.toLowerCase();
  if (key === 'carmesi_v2') key = 'carmesi';

  const sample = SAMPLES[key];
  const registryEntry = PREMIUM_REGISTRY[key === 'carmesi' ? 'carmesi_v2' : key];
  if (!sample || !registryEntry) notFound();

  const { Comp } = registryEntry;
  const data = {
    ...sample,
    guestName: m ?? sample.guestName,
    guestPasses: n ?? sample.guestPasses,
    // Las muestras siempre suenan: pista por defecto si el sample no trae una.
    musicUrl: sample.musicUrl ?? DEFAULT_MUSIC_URL,
  };

  // ?mo=cinematic3d|parallaxBook|elegant|minimal|none → previsualizar un preset.
  const motionVal = mo ? { preset: mo as PageMotionPreset } : undefined;
  // ?blocks=1 → previsualizar la versión por bloques (constructor) de la plantilla.
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
    <BlockRenderer layout={contentToLayout(data, key)} theme={data.theme ?? themeForTemplate(key)} motion={motionVal} decor={previewDecor} tokens={data.tokens ?? tokensForTemplate(key)} musicUrl={data.musicUrl} slug={key} gated={full !== '1'} />
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
  return PREMIUM_KEYS.map(template => ({ template }));
}
