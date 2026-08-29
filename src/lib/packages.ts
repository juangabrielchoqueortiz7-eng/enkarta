import type { Block, BuilderConfig, InvitationPackage, InvitationParsed, PackageExtra, PackageFeatureOverrides, RsvpMode } from './types';
import { captionsForImages } from './gallery';

export type ResolvedFeatures = Required<PackageFeatureOverrides>;
export type ServiceConfig = Pick<BuilderConfig, 'package' | 'features' | 'serviceContract'>;
export const PACKAGE_ORDER: InvitationPackage[] = ['exclusive', 'premium', 'plus'];
export const RSVP_LABELS: Record<RsvpMode, string> = { whatsapp: 'WhatsApp', form: 'Formulario y planilla', smart: 'Sistema inteligente' };

/** Única matriz para precios, oferta, configuración y permisos de contratos nuevos. */
export const PACKAGE_CATALOG = {
  exclusive: { label: 'Exclusive', bs: 1100, usd: 157, tag: 'El más completo', days: 90,
    highlights: ['Confirmación inteligente + Panel del anfitrión', 'Escáner QR de acceso al evento', 'Galería editorial de 20 fotos con pies de foto', 'Hospedaje, calendario y 90 días en línea'],
    features: { music: true, guestNames: true, passes: true, galleryMax: 20, lodging: true, entry: true, calendar: true, smartRsvp: true, rsvpMode: 'smart', hostPanel: true, qrAccess: true, tableAssignment: true, photoSharing: true, colorCustomization: true } },
  premium: { label: 'Premium', bs: 930, usd: 133, tag: 'El favorito', days: 60,
    highlights: ['Música de fondo personalizada', 'Nombres de invitados y pases', 'Galería editorial de 8 fotos con pies de foto', 'Confirmación por formulario, planilla y 60 días'],
    features: { music: true, guestNames: true, passes: true, galleryMax: 8, lodging: false, entry: true, calendar: false, smartRsvp: true, rsvpMode: 'form', hostPanel: false, qrAccess: false, tableAssignment: false, photoSharing: false, colorCustomization: true } },
  plus: { label: 'Plus', bs: 750, usd: 107, tag: 'Esencial', days: 30,
    highlights: ['Confirmación por WhatsApp', 'Música y apertura tipo sobre', 'Ubicación Maps y cuenta regresiva', 'Itinerario, dress code y regalos'],
    features: { music: true, guestNames: false, passes: false, galleryMax: 0, lodging: false, entry: true, calendar: false, smartRsvp: false, rsvpMode: 'whatsapp', hostPanel: false, qrAccess: false, tableAssignment: false, photoSharing: false, colorCustomization: false } },
} satisfies Record<InvitationPackage, { label: string; bs: number; usd: number; tag: string; days: number; highlights: string[]; features: ResolvedFeatures }>;
export const PACKAGE_LABELS = Object.fromEntries(PACKAGE_ORDER.map(key => [key, PACKAGE_CATALOG[key].label])) as Record<InvitationPackage, string>;
export const PACKAGE_PRESETS = Object.fromEntries(PACKAGE_ORDER.map(key => [key, PACKAGE_CATALOG[key].features])) as Record<InvitationPackage, ResolvedFeatures>;
export const isPackage = (value: unknown): value is InvitationPackage => typeof value === 'string' && PACKAGE_ORDER.includes(value as InvitationPackage);
export const isCurrentContract = (config?: ServiceConfig | null) => config?.serviceContract?.version === 2;
const ALL_ON: ResolvedFeatures = { ...PACKAGE_PRESETS.exclusive, galleryMax: 99 };

export const SERVICE_FIELDS: { key: keyof PackageFeatureOverrides; label: string; kind: 'boolean' | 'number' | 'rsvp' }[] = [
  { key: 'rsvpMode', label: 'Confirmación de asistencia', kind: 'rsvp' },
  { key: 'hostPanel', label: 'Panel operativo del anfitrión', kind: 'boolean' },
  { key: 'qrAccess', label: 'Control de acceso QR', kind: 'boolean' },
  { key: 'guestNames', label: 'Nombres personalizados', kind: 'boolean' },
  { key: 'passes', label: 'Tickets / pases', kind: 'boolean' },
  { key: 'tableAssignment', label: 'Asignación de mesas', kind: 'boolean' },
  { key: 'galleryMax', label: 'Fotos en galerías', kind: 'number' },
  { key: 'photoSharing', label: 'Compartir fotos', kind: 'boolean' },
  { key: 'music', label: 'Música de fondo', kind: 'boolean' },
  { key: 'entry', label: 'Apertura de la invitación', kind: 'boolean' },
  { key: 'calendar', label: 'Agendar evento', kind: 'boolean' },
  { key: 'lodging', label: 'Sugerencia de hospedaje', kind: 'boolean' },
  { key: 'colorCustomization', label: 'Personalización de color', kind: 'boolean' },
];
export function validExtra(extra: PackageExtra): boolean {
  const field = SERVICE_FIELDS.find(item => item.key === extra?.feature);
  return !!field && typeof extra.id === 'string' && !!extra.id && typeof extra.reason === 'string' && extra.reason.trim().length >= 3
    && extra.reason.length <= 300 && ['contracted', 'legacy'].includes(extra.source)
    && typeof extra.recordedAt === 'string' && Number.isFinite(Date.parse(extra.recordedAt))
    && (field.kind === 'boolean' ? typeof extra.value === 'boolean'
      : field.kind === 'number' ? Number.isInteger(extra.value) && Number(extra.value) >= 0 && Number(extra.value) <= 99
      : typeof extra.value === 'string' && ['whatsapp', 'form', 'smart'].includes(extra.value));
}
export function contractErrors(config: ServiceConfig): string[] {
  if (config.serviceContract && !isCurrentContract(config)) return ['Versión de contrato no válida.'];
  if (!isCurrentContract(config)) return [];
  const errors: string[] = [];
  if (!isPackage(config.package)) errors.push('Selecciona un paquete válido.');
  if (!Number.isFinite(Date.parse(config.serviceContract!.adoptedAt))) errors.push('El contrato requiere fecha de registro.');
  if (!Array.isArray(config.serviceContract?.extras) || config.serviceContract.extras.length > 30 || config.serviceContract.extras.some(extra => !validExtra(extra))) errors.push('Cada adicional requiere una función, valor y motivo válidos.');
  const extras = Array.isArray(config.serviceContract?.extras) ? config.serviceContract.extras.filter(validExtra) : [];
  if (new Set(extras.map(extra => extra.feature)).size !== extras.length) errors.push('No repitas una función en los adicionales.');
  const f = resolveEntitlements(config);
  if (f.qrAccess && (!f.guestNames || !f.passes || !f.smartRsvp || !f.hostPanel)) errors.push('El acceso QR requiere nombres, pases, formulario y panel operativo.');
  if (f.hostPanel && !f.guestNames) errors.push('El panel operativo requiere nombres personalizados.');
  if (f.rsvpMode === 'smart' && !f.hostPanel) errors.push('El sistema inteligente requiere panel del anfitrión.');
  return errors;
}
export function resolveEntitlements(config?: ServiceConfig | null): ResolvedFeatures {
  const base = config?.package && isPackage(config.package) ? PACKAGE_PRESETS[config.package] : ALL_ON;
  if (!isCurrentContract(config)) {
    // Comportamiento anterior: ningún paquete bloqueaba panel, QR ni búsqueda de mesa en el servidor.
    const legacy = { ...base, hostPanel: true, qrAccess: true, tableAssignment: true, photoSharing: true, colorCustomization: true, ...config?.features };
    return { ...legacy, rsvpMode: legacy.smartRsvp ? 'smart' : 'whatsapp' };
  }
  // Un contrato nuevo mal formado nunca obtiene el acceso irrestricto del legado.
  const result: ResolvedFeatures = { ...(isPackage(config?.package) ? base : PACKAGE_PRESETS.plus) };
  for (const extra of Array.isArray(config?.serviceContract?.extras) ? config.serviceContract.extras : []) {
    if (validExtra(extra)) Object.assign(result, { [extra.feature]: extra.value });
  }
  result.smartRsvp = result.rsvpMode !== 'whatsapp';
  return result;
}
export function resolveFeatures(config?: ServiceConfig | null): ResolvedFeatures {
  const result = resolveEntitlements(config);
  if (!isCurrentContract(config)) return result;
  // Los toggles de contenido pueden apagar servicios, pero no conceder extras no contratados.
  for (const field of SERVICE_FIELDS) if (field.kind === 'boolean' && config?.features?.[field.key] === false) Object.assign(result, { [field.key]: false });
  const max = config?.features?.galleryMax;
  if (typeof max === 'number' && Number.isFinite(max)) result.galleryMax = Math.min(result.galleryMax, Math.max(0, Math.trunc(max)));
  if (config?.features?.smartRsvp === false) result.rsvpMode = 'whatsapp';
  if (!result.guestNames) result.hostPanel = false;
  if (!result.hostPanel && result.rsvpMode === 'smart') result.rsvpMode = 'form';
  result.smartRsvp = result.rsvpMode !== 'whatsapp';
  result.qrAccess = result.qrAccess && result.hostPanel && result.guestNames && result.passes && result.smartRsvp;
  result.tableAssignment = result.tableAssignment && result.guestNames;
  return result;
}
export type OperationalService = 'rsvp' | 'guestManagement' | 'hostPanel' | 'qrAccess' | 'tableAssignment';
export function allowsService(config: ServiceConfig | null | undefined, service: OperationalService): boolean {
  if (config?.serviceContract && !isCurrentContract(config)) return false;
  if (!isCurrentContract(config)) return true; // No revocar acuerdos anteriores de forma automática.
  const f = resolveFeatures(config);
  if (service === 'rsvp') return f.smartRsvp;
  if (service === 'guestManagement') return f.guestNames;
  return f[service];
}
export function newServiceContract(config: BuilderConfig, pkg: InvitationPackage): BuilderConfig {
  return { ...config, package: pkg, features: undefined, serviceContract: { version: 2, adoptedAt: new Date().toISOString(), extras: [] } };
}

/** Adoptar la matriz conserva las excepciones anteriores de manera explícita. */
export function adoptServiceContract(config: BuilderConfig, pkg: InvitationPackage): BuilderConfig {
  const next = newServiceContract(config, pkg);
  if (isCurrentContract(config)) next.serviceContract!.extras = [...config.serviceContract!.extras];
  else {
    const previous = resolveFeatures(config);
    // Las rutas históricas permitían operar aunque un toggle visual lo ocultara.
    previous.hostPanel = previous.qrAccess = previous.guestNames = previous.passes = true;
    previous.rsvpMode = 'smart';
    next.serviceContract!.extras = SERVICE_FIELDS.filter(f => previous[f.key] !== PACKAGE_PRESETS[pkg][f.key]).map(f => ({
      id: crypto.randomUUID(), feature: f.key, value: previous[f.key], source: 'legacy',
      reason: 'Condición anterior conservada al registrar el paquete.', recordedAt: new Date().toISOString(),
    }));
  }
  return next;
}

/** Restaurar una versión visual antigua nunca elimina el contrato actual. */
export function retainServiceContract(incoming: BuilderConfig, current: BuilderConfig): BuilderConfig {
  const next = isCurrentContract(current) && !incoming.serviceContract
    ? { ...incoming, package: current.package, features: current.features, serviceContract: current.serviceContract }
    : { ...incoming };
  // Restaurar una versión visual nunca retrocede el expediente operativo de adicionales.
  if (current.additionalServices?.version === 1) next.additionalServices = current.additionalServices;
  if (current.qualityControl?.version === 1) next.qualityControl = current.qualityControl;
  return next;
}
export function commercialRows(): [string, string, boolean | string, boolean | string, boolean | string][] {
  const row = (label: string, description: string, value: (key: InvitationPackage) => boolean | string): [string,string,boolean|string,boolean|string,boolean|string] => [label, description, ...PACKAGE_ORDER.map(value)] as [string,string,boolean|string,boolean|string,boolean|string];
  const feature = (label: string, key: keyof ResolvedFeatures, description = '') => row(label, description, p => Boolean(PACKAGE_PRESETS[p][key]));
  return [
    row('Confirmación de Asistencia', 'Premium: formulario y planilla exportable, sin panel operativo ni QR. Exclusive añade gestión de invitados y acceso.', p => RSVP_LABELS[PACKAGE_PRESETS[p].rsvpMode]),
    feature('Panel privado del Anfitrión', 'hostPanel', 'Gestión de invitados y confirmaciones. La revisión privada del diseño es un acceso separado.'),
    feature('Escáner QR de acceso al evento', 'qrAccess'), feature('Personalización de Color', 'colorCustomization'),
    ...['Ubicación Maps', 'Cuenta Regresiva', 'Itinerario con formatos visuales', 'Dress Code', 'Sugerencia de Regalos', 'Envíos Ilimitados'].map(label => row(label, '', () => true)),
    row('En línea después del evento', '', p => PACKAGE_CATALOG[p].days + ' días'),
    feature('Música de fondo', 'music'), feature('Apertura tipo sobre', 'entry'), feature('Nombres de los Invitados', 'guestNames'), feature('Tickets / Pases', 'passes'),
    feature('Número de mesa', 'tableAssignment'), row('Galería editorial con pies de foto', '', p => PACKAGE_PRESETS[p].galleryMax ? PACKAGE_PRESETS[p].galleryMax + ' fotos' : false),
    feature('Agendar evento (Google Calendar)', 'calendar'), feature('Sugerencia de Hospedaje', 'lodging'), feature('Botón para compartir fotos', 'photoSharing'),
  ];
}

/** Solo el resultado renderizado se recorta: el documento original y las fotos permanecen guardados. */
export function gateInvitation(inv: InvitationParsed): InvitationParsed {
  const cfg = inv.config;
  if (!cfg?.package && !isCurrentContract(cfg)) return inv;
  const f = resolveFeatures(cfg);
  const config: BuilderConfig = { ...cfg };
  if (isCurrentContract(cfg) && !f.entry) config.entry = { ...config.entry, enabled: false };
  if (isCurrentContract(cfg) && config.activeGuest) {
    config.activeGuest = { ...config.activeGuest };
    if (!f.qrAccess) { delete config.activeGuest.accessCode; delete config.activeGuest.accessToken; }
    if (!f.tableAssignment) delete config.activeGuest.tableNo;
    if (!f.guestNames) delete config.activeGuest;
  }
  if (!f.music) config.musicUrl = undefined;
  if (Array.isArray(config.galleryImages)) config.galleryImages = config.galleryImages.slice(0, f.galleryMax);
  if (Array.isArray(config.galleryCaptions)) config.galleryCaptions = captionsForImages(config.galleryImages ?? [], config.galleryCaptions);
  if (!f.lodging) config.lodging = [];
  if (!isCurrentContract(cfg)) {
    if (config.layout?.blocks?.length) config.layout = { ...config.layout, blocks: config.layout.blocks.filter(b => !(b.type === 'calendar' && !f.calendar) && !(b.type === 'gallery' && f.galleryMax === 0)) };
  } else {
    const galleryRemaining = { mobile: f.galleryMax, desktop: f.galleryMax };
    const filter = (blocks: Block[], active = { mobile: true, desktop: true }): Block[] => blocks.flatMap(block => {
      if ((block.type === 'calendar' && !f.calendar) || (block.type === 'lodging' && !f.lodging) || (block.type === 'accessPass' && !f.qrAccess) || (block.type === 'tableFinder' && !f.tableAssignment)) return [];
      const next: Block = { ...block, props: { ...block.props } };
      const visible = { mobile: active.mobile && block.enabled !== false && block.layout?.hideOn !== 'mobile', desktop: active.desktop && block.enabled !== false && block.layout?.hideOn !== 'desktop' };
      if (block.children) next.children = filter(block.children, visible);
      if (block.type === 'gallery') {
        const images = Array.isArray(block.props.images) ? block.props.images : [];
        const remaining = Math.min(visible.mobile ? galleryRemaining.mobile : f.galleryMax, visible.desktop ? galleryRemaining.desktop : f.galleryMax);
        next.props.images = images.slice(0, remaining);
        next.props.captions = captionsForImages(next.props.images as string[], Array.isArray(block.props.captions) ? block.props.captions : []);
        for (const viewport of ['mobile', 'desktop'] as const) if (visible[viewport]) galleryRemaining[viewport] -= (next.props.images as unknown[]).length;
        if (!f.photoSharing) next.props.shareUrl = '';
        if (!f.galleryMax && !f.photoSharing) return [];
      }
      if (block.type === 'rsvp') {
        next.props.mode = f.smartRsvp ? 'form' : 'whatsapp';
        if (!f.smartRsvp && inv.phone_whatsapp) next.props.whatsappUrl = 'https://wa.me/' + inv.phone_whatsapp.replace(/\D/g, '') + '?text=Confirmo+mi+asistencia';
      }
      return [next];
    });
    if (config.layout?.blocks) config.layout = { ...config.layout, blocks: filter(config.layout.blocks) };
    if (!f.photoSharing) config.galleryUrl = undefined;
  }
  return { ...inv, config, gallery_url: isCurrentContract(cfg) && !f.photoSharing ? null : inv.gallery_url, guest_name: f.guestNames ? inv.guest_name : null, guest_passes: f.passes ? inv.guest_passes : 0 };
}
