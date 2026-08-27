import {
  azureSample,
  primiciaSample,
  passportSample,
  paradiseSample,
  obsidianaSample,
  dolceVitaSample,
  graziaSample,
  carmesiSample,
  napolySample,
  euforiaSample,
  roseGoldSample,
  allegriaSample,
} from '@/components/invitations/sampleData';
import { DEFAULT_MUSIC_URL } from '@/lib/music';
import { decorForTemplate, motionForTemplate, themeForTemplate, tokensForTemplate } from '@/lib/template-themes';
import { STARTER_DESIGNS, type StarterDesignKey, type StarterCollectionKey } from '@/lib/enkarta-collections';
import { marfilVivoStarter } from '@/lib/marfil-vivo';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const STARTER_TEMPLATE_KEYS = STARTER_DESIGNS.map(design => design.key);
export type StarterTemplateKey = StarterDesignKey;

const SAMPLES: Record<StarterCollectionKey, any> = {
  azure: azureSample,
  primicia: primiciaSample,
  passport: passportSample,
  paradise: paradiseSample,
  obsidiana: obsidianaSample,
  dolcevita: dolceVitaSample,
  grazia: graziaSample,
  carmesi_v2: carmesiSample,
  napoly: napolySample,
  euforia: euforiaSample,
  rosegold: roseGoldSample,
  allegria: allegriaSample,
};

const BRIDE_FIRST = new Set<StarterTemplateKey>(['paradise', 'obsidiana']);

function cleanTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function mapsOrAddress(location: any): string | null {
  return location?.address ?? location?.mapsUrl ?? location?.maps ?? null;
}

function dressCode(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.style) return String(value.style);
  const men = Array.isArray(value.men) ? value.men.join(', ') : value.men;
  const women = Array.isArray(value.women) ? value.women.join(', ') : value.women;
  return [men, women].filter(Boolean).join(' | ') || null;
}

function sponsors(value: any): Array<{ role: string; names: string }> {
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === 'string'
    ? { role: 'Padrinos', names: item }
    : { role: String(item?.role ?? 'Padrinos'), names: Array.isArray(item?.names) ? item.names.join('\n') : String(item?.names ?? '') }
  ).filter(item => item.names);
}

function bankAccount(sample: any): string | null {
  const bank = sample.giftBank ?? sample.gift?.bank;
  if (!bank) return sample.giftAccount?.no ?? null;
  return [bank.bank, bank.account].filter(Boolean).join(' — ') || null;
}

function whatsappNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const wa = value.match(/wa\.me\/(\d+)/)?.[1];
  return wa ?? (value.replace(/\D/g, '') || null);
}

/**
 * Copia los datos de la muestra construida a una nueva fila editable. El
 * builder abre la plantilla original (sin convertirla a bloques), por lo que
 * el administrador ve desde el primer instante la invitación completa.
 */
export function invitationStarter(template: StarterTemplateKey) {
  if (template === 'marfil-vivo') return marfilVivoStarter();
  const sample = SAMPLES[template];
  const first = BRIDE_FIRST.has(template) ? sample.bride : sample.groom;
  const second = BRIDE_FIRST.has(template) ? sample.groom : sample.bride;
  const ceremony = sample.ceremony ?? sample.ceremonyReligious ?? sample.escala ?? sample.locations?.[0] ?? {};
  const reception = sample.reception ?? sample.ceremonyCivil ?? sample.locations?.[1] ?? {};
  const isoDate = typeof sample.isoDate === 'string' ? sample.isoDate : '';
  const config = JSON.parse(JSON.stringify({
    ...sample,
    theme: sample.theme ?? themeForTemplate(template),
    motion: sample.motion ?? { preset: motionForTemplate(template) },
    decor: sample.decor ?? decorForTemplate(template),
    tokens: sample.tokens ?? tokensForTemplate(template),
    musicUrl: sample.musicUrl ?? DEFAULT_MUSIC_URL,
  }));

  return {
    status: 'draft' as const,
    template,
    type: 'boda' as const,
    names: [first, second].filter(Boolean).join(' & ') || 'Nueva invitación',
    event_date: isoDate.slice(0, 10) || null,
    ceremony_time: cleanTime(ceremony.time) ?? cleanTime(isoDate.slice(11, 16)),
    ceremony_place: ceremony.place ?? ceremony.name ?? null,
    ceremony_address: mapsOrAddress(ceremony),
    reception_time: cleanTime(reception.time),
    reception_place: reception.place ?? reception.name ?? null,
    reception_address: mapsOrAddress(reception),
    guest_name: sample.guestName ?? null,
    guest_passes: Number.parseInt(String(sample.guestPasses ?? '1'), 10) || 1,
    message: sample.introMessage ?? (Array.isArray(sample.coupleMessage) ? sample.coupleMessage.join('\n') : sample.headerMessage) ?? null,
    dress_code: dressCode(sample.dressCode ?? sample.dress),
    no_kids: Boolean(sample.noKids),
    parents_groom: Array.isArray(sample.parentsGroom) ? sample.parentsGroom : [],
    parents_bride: Array.isArray(sample.parentsBride) ? sample.parentsBride : [],
    sponsors: sponsors(sample.padrinos),
    itinerary: Array.isArray(sample.itinerary) ? sample.itinerary : [],
    gift_message: sample.giftMessage ?? sample.gift?.message ?? null,
    bank_account: bankAccount(sample),
    cover_image_url: sample.coverImage ?? sample.photoUrl ?? null,
    gallery_url: sample.galleryUrl ?? sample.gallery?.shareUrl ?? null,
    color_primary: config.theme?.primary ?? '#B8975A',
    color_secondary: config.theme?.bg ?? '#FAF7F2',
    color_accent: config.theme?.text ?? '#2C2519',
    phone_whatsapp: whatsappNumber(sample.whatsapp ?? sample.rsvp?.whatsappUrl),
    builder_config: config,
  };
}
