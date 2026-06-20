import type { Block, InvitationParsed, PageLayout } from './types';

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
    month: cap(d.toLocaleDateString('es-ES', { month: 'long' })),
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

function dressParts(raw: string | null) {
  if ((raw ?? '').includes('|')) {
    const [men, women] = String(raw).split('|');
    return { men: men.trim(), women: women.trim() };
  }
  return { men: raw || 'Formal', women: raw || 'Formal' };
}

function buildScope(inv: InvitationParsed) {
  const cfg = inv.config ?? {};
  const [groom, bride] = splitNames(inv.names);
  const dp = dateParts(inv.event_date);
  const isoDate = `${(inv.event_date ?? new Date().toISOString().slice(0, 10))}T${inv.ceremony_time ?? '16:00'}:00`;
  const bank = parseBank(inv.bank_account);
  const dress = dressParts(inv.dress_code);
  const galleryImages = Array.isArray(cfg.galleryImages) ? cfg.galleryImages : [];
  const coverImage =
    inv.cover_image_url
    || (cfg.sectionImages as Record<string, string> | undefined)?.hero
    || galleryImages[0]
    || '';

  return {
    couple: {
      full: inv.names ?? '',
      groom,
      bride,
      tagline: (cfg.welcomeTitle as string) || 'Nos casamos',
    },
    guest: {
      name: inv.guest_name ?? '',
      passes: inv.guest_passes,
    },
    event: {
      isoDate,
      city: (cfg.city as string) || '',
      date: dp,
      ceremony: {
        time: inv.ceremony_time ? `${inv.ceremony_time} h` : '16:00 h',
        place: inv.ceremony_place || 'Iglesia',
        address: inv.ceremony_address || '',
        mapsUrl: mapsUrl(inv.ceremony_place, inv.ceremony_address),
      },
      reception: {
        time: inv.reception_time ? `${inv.reception_time} h` : '18:00 h',
        place: inv.reception_place || 'Salón',
        address: inv.reception_address || '',
        mapsUrl: mapsUrl(inv.reception_place, inv.reception_address),
      },
    },
    content: {
      intro: (cfg.introMessage as string) || inv.message || '',
      galleryMessage: (cfg.galleryMessage as string) || 'Comparte con nosotros tus fotos del evento.',
      rsvpMessage: (cfg.rsvpMessage as string) || 'Es muy importante para nosotros contar con tu presencia.',
      giftMessage: inv.gift_message || 'Tu presencia es nuestro mejor regalo.',
      dress,
      bank,
    },
    media: {
      coverImage,
      galleryImages,
    },
    links: {
      galleryUrl: inv.gallery_url || '',
      whatsappUrl: waUrl(inv.phone_whatsapp),
      giftQrUrl: (cfg.giftQrUrl as string) || '',
    },
    calendar: {
      title: `${groom} & ${bride}`,
      location: inv.ceremony_place || '',
    },
  };
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function resolveBlock(block: Block, scope: unknown): Block {
  const props = { ...block.props };
  for (const [key, path] of Object.entries(block.bindings ?? {})) {
    const value = getByPath(scope, path);
    if (value !== undefined) props[key] = value;
  }
  return {
    ...block,
    props,
    children: Array.isArray(block.children) ? block.children.map(child => resolveBlock(child, scope)) : block.children,
  };
}

export function resolveLayoutBindings(layout: PageLayout, inv: InvitationParsed): PageLayout {
  const scope = buildScope(inv);
  return {
    ...layout,
    blocks: layout.blocks.map(block => resolveBlock(block, scope)),
  };
}

export function detachBinding<T extends { bindings?: Record<string, string> }>(target: T, key: string): T {
  if (!target.bindings?.[key]) return target;
  const next = { ...target.bindings };
  delete next[key];
  return {
    ...target,
    bindings: Object.keys(next).length ? next : undefined,
  };
}
