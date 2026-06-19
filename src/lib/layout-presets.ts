// Genera un `PageLayout` por defecto a partir de los datos de la invitación.
// Es lo que ejecuta el botón "Convertir a bloques editables" del panel: siembra
// los bloques con el contenido actual; a partir de ahí el layout es la fuente de
// verdad y se edita bloque a bloque.
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { InvitationParsed, PageLayout, Block, BlockType } from './types';

let _seq = 0;
function uid(type: string) {
  return `${type}-${Date.now().toString(36)}-${(_seq++).toString(36)}`;
}
function blk(type: BlockType, props: Record<string, unknown>, style?: Block['style']): Block {
  return { id: uid(type), type, props, ...(style ? { style } : {}) };
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function splitNames(names: string | null): [string, string] {
  if (!names) return ['Novia', 'Novio'];
  const parts = names.split(/\s*[&y]\s*/i);
  return [parts[0]?.trim() || 'Novia', parts[1]?.trim() || 'Novio'];
}

function dateParts(iso: string | null) {
  const d = iso ? new Date(`${iso.slice(0, 10)}T12:00:00`) : new Date();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    weekday: cap(d.toLocaleDateString('es-ES', { weekday: 'long' })),
    day: String(d.getDate()).padStart(2, '0'),
    month: MESES[d.getMonth()],
    year: String(d.getFullYear()),
  };
}

function mapsUrl(place?: string | null, address?: string | null) {
  const q = [place, address].filter(Boolean).join(' ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

function waUrl(phone?: string | null) {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function parseBank(raw: string | null) {
  if (!raw) return { bank: '', account: '' };
  const [bank, account] = raw.split(/[-–—]/);
  return { bank: bank?.trim() ?? raw, account: account?.trim() ?? '' };
}

/** Construye el layout por defecto desde el registro de la invitación. */
export function invitationToLayout(inv: InvitationParsed): PageLayout {
  const cfg = inv.config ?? {};
  const [groom, bride] = splitNames(inv.names);
  const dp = dateParts(inv.event_date);
  const iso = `${(inv.event_date ?? new Date().toISOString().slice(0, 10))}T${inv.ceremony_time ?? '16:00'}:00`;
  const bank = parseBank(inv.bank_account);
  const dress = (inv.dress_code ?? '').includes('|')
    ? { men: inv.dress_code!.split('|')[0].trim(), women: inv.dress_code!.split('|')[1].trim() }
    : { men: inv.dress_code || 'Formal', women: inv.dress_code || 'Formal' };

  const blocks: Block[] = [];

  const sectionImgs = (cfg.sectionImages as Record<string, string> | undefined) ?? {};
  const coverImg =
    inv.cover_image_url
    || (cfg.coverImage as string)
    || sectionImgs.couple || sectionImgs.hero
    || (cfg.photoUrl as string)
    || (cfg.galleryImages as string[] | undefined)?.[0]
    || '';
  blocks.push(blk('cover', {
    groom, bride,
    tagline: (cfg.welcomeTitle as string) || 'Nos casamos',
    image: coverImg,
  }, { padTop: 80, padBottom: 40 }));

  const intro = (cfg.introMessage as string) || inv.message;
  if (intro) blocks.push(blk('text', { text: intro, italic: false }, { maxWidth: 560 }));

  blocks.push(blk('dateBadge', { ...dp, city: (cfg.city as string) || '' }));
  blocks.push(blk('countdown', { isoDate: iso, label: 'Solo faltan' }));
  blocks.push(blk('calendar', { title: `${groom} & ${bride}`, isoDate: iso, duration: 5, location: inv.ceremony_place || '', label: 'Añadir a mi calendario' }, { padTop: 8, padBottom: 16 }));
  blocks.push(blk('divider', { style: 'art' }, { padTop: 8, padBottom: 8 }));

  blocks.push(blk('eventCard', {
    title: 'Ceremonia', time: inv.ceremony_time ? `${inv.ceremony_time} h` : '16:00 h',
    place: inv.ceremony_place || 'Iglesia', address: inv.ceremony_address || '',
    mapsUrl: mapsUrl(inv.ceremony_place, inv.ceremony_address), icon: 'church',
  }));

  if (inv.reception_place || inv.reception_time) {
    blocks.push(blk('eventCard', {
      title: 'Recepción', time: inv.reception_time ? `${inv.reception_time} h` : '18:00 h',
      place: inv.reception_place || 'Salón', address: inv.reception_address || '',
      mapsUrl: mapsUrl(inv.reception_place, inv.reception_address), icon: 'cheers',
    }));
  }

  blocks.push(blk('dressCode', { title: 'Código de vestimenta', men: dress.men, women: dress.women, icon: 'dress' }));

  const items = (inv.itinerary ?? []).map(it => ({ time: it.time, label: it.label, icon: it.icon || 'rings', iconColors: it.iconColors, iconSpeed: it.iconSpeed }));
  if (items.length) {
    blocks.push(blk('itinerary', { title: 'Itinerario', items }));
  }

  blocks.push(blk('gift', {
    title: 'Sugerencia de Regalo',
    message: inv.gift_message || 'Tu presencia es nuestro mejor regalo.',
    bank: bank.bank, account: bank.account, holder: '',
    qrUrl: (cfg.giftQrUrl as string) || '',
  }, { padTop: 56, padBottom: 56 }));

  blocks.push(blk('gallery', {
    message: (cfg.galleryMessage as string) || 'Comparte con nosotros tus fotos del evento.',
    images: (cfg.galleryImages as string[]) || [],
    shareUrl: inv.gallery_url || '',
  }));

  blocks.push(blk('rsvp', {
    mode: 'form',
    message: (cfg.rsvpMessage as string) || 'Es muy importante para nosotros contar con tu presencia.',
    buttonLabel: 'Confirmar asistencia',
    whatsappUrl: waUrl(inv.phone_whatsapp),
  }));

  return { version: 1, basePreset: inv.template, blocks };
}

/**
 * Preset 1:1 de Azure: parte del layout genérico pero reemplaza la portada por la
 * corona de acuarela (capas) con los nombres centrados encima — la pieza más
 * reconocible de Azure. (Piloto del enfoque "presets por plantilla".)
 */
/** Portada de Azure: corona de acuarela (capa de fondo) + nombres centrados encima. */
function azureWreathCover(groom: string, bride: string): Block {
  return {
    id: uid('group'),
    type: 'group',
    props: { mode: 'overlay', columns: 1 },
    style: { padTop: 72, padBottom: 24 },
    children: [
      { id: uid('image'), type: 'image', props: { url: '/azure/wreath.png', rounded: 0, maxHeight: 360, focal: '50% 50%' } },
      { id: uid('cover'), type: 'cover', props: { groom, bride, tagline: '', image: '', family: 'great', size: 40 } },
    ],
  };
}

export function presetForAzure(inv: InvitationParsed): PageLayout {
  const base = invitationToLayout(inv);
  const [groom, bride] = splitNames(inv.names);
  base.blocks[0] = azureWreathCover(groom, bride);
  base.basePreset = 'azure';
  return base;
}

/** Elige el preset por plantilla (Azure tiene uno propio; el resto, el genérico). */
export function layoutForTemplate(inv: InvitationParsed): PageLayout {
  if (inv.template === 'azure') return presetForAzure(inv);
  return invitationToLayout(inv);
}

/**
 * Versión que construye el layout desde un objeto de contenido de plantilla
 * (InvitationContent y similares). Se usa en /muestra?blocks=1 para previsualizar
 * la versión por bloques de cualquier plantilla con sus datos de muestra.
 */
export function contentToLayout(c: any, template?: string): PageLayout {
  const blocks: Block[] = [];

  if (template === 'azure') {
    blocks.push(azureWreathCover(c.groom || 'Lorena', c.bride || 'Marcos'));
  } else {
    blocks.push(blk('cover', {
      groom: c.groom || 'Lorena', bride: c.bride || 'Marcos',
      tagline: c.welcomeTitle || c.coverLabel || 'Nos casamos',
      image: c.coverImage || '',
    }, { padTop: 80, padBottom: 40 }));
  }

  if (c.introMessage) blocks.push(blk('text', { text: c.introMessage }, { maxWidth: 560 }));

  blocks.push(blk('dateBadge', {
    weekday: c.weekday || c.dateWeekday || 'Sábado',
    day: c.day || c.dateDay || '04',
    month: c.month || c.dateMonth || 'Julio',
    year: c.year || c.dateYear || '2026',
    city: c.city || c.dateCity || '',
  }));
  blocks.push(blk('countdown', { isoDate: c.isoDate || new Date().toISOString(), label: 'Solo faltan' }));
  blocks.push(blk('calendar', { title: `${c.groom || 'Lorena'} & ${c.bride || 'Marcos'}`, isoDate: c.isoDate || new Date().toISOString(), duration: 5, location: (c.ceremony || c.ceremonyReligious)?.place || '', label: 'Añadir a mi calendario' }, { padTop: 8, padBottom: 16 }));
  blocks.push(blk('divider', { style: 'art' }, { padTop: 8, padBottom: 8 }));

  const cer = c.ceremony || c.ceremonyReligious;
  if (cer) blocks.push(blk('eventCard', { title: 'Ceremonia', time: cer.time || '16:00 h', place: cer.place || '', address: cer.address || '', mapsUrl: cer.mapsUrl || cer.maps || '', icon: 'church' }));
  const rec = c.reception;
  if (rec) blocks.push(blk('eventCard', { title: 'Recepción', time: rec.time || '18:00 h', place: rec.place || '', address: rec.address || '', mapsUrl: rec.mapsUrl || rec.maps || '', icon: 'cheers' }));

  const dc = c.dressCode;
  const men = typeof dc === 'string' ? dc : (dc?.men || 'Formal');
  const women = typeof dc === 'string' ? dc : (dc?.women || 'Formal');
  blocks.push(blk('dressCode', { title: 'Código de vestimenta', men, women, icon: 'dress' }));

  if (Array.isArray(c.itinerary) && c.itinerary.length) {
    blocks.push(blk('itinerary', { title: 'Itinerario', items: c.itinerary.map((it: any) => ({ time: it.time, label: it.label, icon: it.icon || 'rings', iconColors: it.iconColors, iconSpeed: it.iconSpeed })) }));
  }

  const g = c.gift;
  blocks.push(blk('gift', {
    title: 'Sugerencia de Regalo',
    message: g?.message || 'Tu presencia es nuestro mejor regalo.',
    bank: g?.bank?.bank || 'Banco', account: g?.bank?.account || '', holder: g?.bank?.holder || '',
    qrUrl: g?.qrUrl || '',
  }, { padTop: 56, padBottom: 56 }));

  blocks.push(blk('gallery', {
    message: c.gallery?.message || 'Comparte con nosotros tus fotos del evento.',
    images: c.galleryImages || [], shareUrl: c.gallery?.shareUrl || c.galleryUrl || '',
  }));

  blocks.push(blk('rsvp', {
    mode: 'form',
    message: c.rsvp?.message || c.rsvpMessage || 'Es muy importante para nosotros contar con tu presencia.',
    buttonLabel: 'Confirmar asistencia',
    whatsappUrl: c.rsvp?.whatsappUrl || c.whatsapp || '',
  }));

  return { version: 1, blocks };
}
