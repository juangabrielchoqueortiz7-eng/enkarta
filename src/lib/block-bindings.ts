import type { Block, BlockType, InvitationParsed, PageLayout } from './types';

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
  const activeGuest = cfg.activeGuest;
  const [groom, bride] = splitNames(inv.names);
  const dp = dateParts(inv.event_date);
  const isoDate = `${(inv.event_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10)}T${(inv.ceremony_time || '16:00').slice(0, 5)}:00`;
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
      initialA: groom.charAt(0).toUpperCase(),
      initialB: bride.charAt(0).toUpperCase(),
      tagline: (cfg.welcomeTitle as string) || 'Nos casamos',
    },
    guest: {
      name: activeGuest?.name ?? inv.guest_name ?? '',
      passes: activeGuest?.passes ?? inv.guest_passes,
      passesLabel: `${(activeGuest?.passes ?? inv.guest_passes) || 1} pase${(activeGuest?.passes ?? inv.guest_passes) === 1 ? '' : 's'}`,
      table: activeGuest?.tableNo ?? '',
      tableLabel: activeGuest?.tableNo ? `Mesa ${activeGuest.tableNo}` : 'Mesa por asignar',
      accessCode: activeGuest?.accessCode ?? 'Pendiente',
      status: activeGuest?.status ?? 'pending',
      statusLabel: activeGuest?.status === 'confirmed' ? 'Asistencia confirmada' : activeGuest?.status === 'declined' ? 'No asistirá' : 'Pendiente de confirmar',
      confirmedPasses: activeGuest?.confirmedPasses ?? 0,
      group: activeGuest?.group ?? '',
      phone: activeGuest?.phone ?? '',
      allowKids: activeGuest?.allowKids ?? !inv.no_kids,
      eventAccess: activeGuest?.eventAccess ?? 'both',
    },
    event: {
      isoDate,
      itinerary: inv.itinerary ?? [],
      city: (cfg.city as string) || '',
      date: { ...dp, label: `${dp.day} · ${dp.month} · ${dp.year}` },
      ceremony: {
        time: inv.ceremony_time ? `${inv.ceremony_time} h` : '16:00 h',
        place: inv.ceremony_place || 'Iglesia',
        address: inv.ceremony_address || '',
        mapsUrl: mapsUrl(inv.ceremony_place, inv.ceremony_address),
        query: [inv.ceremony_place, inv.ceremony_address].filter(Boolean).join(', '),
      },
      reception: {
        time: inv.reception_time ? `${inv.reception_time} h` : '18:00 h',
        place: inv.reception_place || 'Salón',
        address: inv.reception_address || '',
        mapsUrl: mapsUrl(inv.reception_place, inv.reception_address),
        query: [inv.reception_place, inv.reception_address].filter(Boolean).join(', '),
      },
    },
    content: {
      intro: (cfg.introMessage as string) || inv.message || '',
      galleryMessage: (cfg.galleryMessage as string) || 'Comparte con nosotros tus fotos del evento.',
      rsvpMessage: (cfg.rsvpMessage as string) || 'Es muy importante para nosotros contar con tu presencia.',
      giftMessage: inv.gift_message || 'Tu presencia es nuestro mejor regalo.',
      dress,
      bank,
      editorialDetails: [
        { label: 'Cuándo', value: `${dp.weekday}, ${dp.day} de ${dp.month}`, note: `Ceremonia · ${inv.ceremony_time ? `${inv.ceremony_time} h` : '16:00 h'}` },
        { label: 'Dónde', value: inv.ceremony_place || 'Lugar de la celebración', note: inv.ceremony_address || (cfg.city as string) || 'Dirección por confirmar' },
        { label: 'Vestimenta', value: inv.dress_code || 'Formal', note: inv.no_kids ? 'Celebración reservada para adultos.' : 'Todos son bienvenidos.' },
      ],
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

const DEFAULT_BINDINGS: Partial<Record<BlockType, Record<string, string>>> = {
  cinematicHero: { groom: 'couple.groom', bride: 'couple.bride', tagline: 'couple.tagline', poster: 'media.coverImage', dateLabel: 'event.date.label' },
  cover: { groom: 'couple.groom', bride: 'couple.bride', tagline: 'couple.tagline', image: 'media.coverImage' },
  editorialChapter: { image: 'media.coverImage' },
  editorialDetails: { items: 'content.editorialDetails' },
  passportHero: { groom: 'couple.groom', bride: 'couple.bride', image: 'media.coverImage', dateLabel: 'event.date.label' },
  passportTicket: { guestName: 'guest.name', passesLabel: 'guest.passesLabel' },
  accessPass: { title: 'guest.statusLabel' },
  countdown: { isoDate: 'event.isoDate' },
  calendar: { title: 'calendar.title', isoDate: 'event.isoDate', location: 'calendar.location' },
  dateBadge: { weekday: 'event.date.weekday', day: 'event.date.day', month: 'event.date.month', year: 'event.date.year', city: 'event.city' },
  dressCode: { men: 'content.dress.men', women: 'content.dress.women' },
  gift: { message: 'content.giftMessage', bank: 'content.bank.bank', account: 'content.bank.account', qrUrl: 'links.giftQrUrl' },
  gallery: { message: 'content.galleryMessage', images: 'media.galleryImages', shareUrl: 'links.galleryUrl' },
  monogram: { initialA: 'couple.initialA', initialB: 'couple.initialB', date: 'event.date.label' },
  story: { image: 'media.coverImage' },
  rsvp: { message: 'content.rsvpMessage', whatsappUrl: 'links.whatsappUrl' },
  image: { url: 'media.coverImage' },
  map: { query: 'event.ceremony.query' },
};

/**
 * Vincula una sección recién insertada con los datos reales de la invitación.
 * El usuario puede editar cualquier campo; al hacerlo, `detachBinding` lo
 * convierte automáticamente en contenido independiente.
 */
export function attachDefaultBindings(blocks: Block[]): Block[] {
  const visit = (block: Block): Block => {
    let bindings = DEFAULT_BINDINGS[block.type];
    if (block.type === 'eventCard') {
      const reception = String(block.props.title ?? '').toLowerCase().includes('recep');
      const root = reception ? 'event.reception' : 'event.ceremony';
      bindings = { time: `${root}.time`, place: `${root}.place`, address: `${root}.address`, mapsUrl: `${root}.mapsUrl` };
    }
    if (block.type === 'map' && String(block.props.title ?? '').toLowerCase().includes('recep')) {
      bindings = { query: 'event.reception.query' };
    }
    return {
      ...block,
      bindings: bindings ? { ...bindings, ...(block.bindings ?? {}) } : block.bindings,
      children: block.children?.map(visit),
    };
  };
  return blocks.map(visit);
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function resolveDynamicValue(value: unknown, scope: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (token, path: string) => {
      const resolved = getByPath(scope, path);
      return resolved === undefined || resolved === null ? token : String(resolved);
    });
  }
  if (Array.isArray(value)) return value.map(item => resolveDynamicValue(item, scope));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, resolveDynamicValue(item, scope)]));
  }
  return value;
}

function matchesVisibility(block: Block, inv: InvitationParsed): boolean {
  const rule = block.visibility;
  if (!rule) return true;
  const guest = inv.config?.activeGuest;
  const personalized = !!(guest?.name || inv.guest_name)?.trim();
  const passes = guest?.passes ?? inv.guest_passes;
  const allowKids = guest?.allowKids ?? !inv.no_kids;
  if (rule.audience === 'personalized' && !personalized) return false;
  if (rule.audience === 'generic' && personalized) return false;
  if (typeof rule.minPasses === 'number' && passes < rule.minPasses) return false;
  if (typeof rule.maxPasses === 'number' && passes > rule.maxPasses) return false;
  if (rule.guestType === 'adultsOnly' && allowKids) return false;
  if (rule.guestType === 'kidsAllowed' && !allowKids) return false;
  if (rule.eventAccess === 'ceremony' && guest?.eventAccess === 'reception') return false;
  if (rule.eventAccess === 'reception' && guest?.eventAccess === 'ceremony') return false;
  if (rule.groups?.length && (!guest?.group || !rule.groups.some(group => group.toLowerCase() === guest.group?.toLowerCase()))) return false;
  if (rule.rsvpStatus && rule.rsvpStatus !== 'all' && guest?.status !== rule.rsvpStatus) return false;
  return true;
}

function resolveBlock(block: Block, scope: unknown, inv: InvitationParsed): Block {
  const props = resolveDynamicValue(block.props, scope) as Record<string, unknown>;
  for (const [key, path] of Object.entries(block.bindings ?? {})) {
    const value = getByPath(scope, path);
    if (value !== undefined) props[key] = value;
  }
  return {
    ...block,
    props,
    children: Array.isArray(block.children)
      ? block.children.filter(child => matchesVisibility(child, inv)).map(child => resolveBlock(child, scope, inv))
      : block.children,
  };
}

export function resolveLayoutBindings(layout: PageLayout, inv: InvitationParsed): PageLayout {
  const scope = buildScope(inv);
  return {
    ...layout,
    blocks: layout.blocks.filter(block => matchesVisibility(block, inv)).map(block => resolveBlock(block, scope, inv)),
  };
}

/** Values shown by the inspector. Keep inline {{tokens}} intact for editing. */
export function resolveBlockEditorProps(block: Block, inv: InvitationParsed): Block['props'] {
  const props = { ...block.props };
  const scope = buildScope(inv);
  for (const [key, path] of Object.entries(block.bindings ?? {})) {
    const value = getByPath(scope, path);
    if (value !== undefined) props[key] = value;
  }
  return props;
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
