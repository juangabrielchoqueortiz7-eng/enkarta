import type {
  AdditionalServiceBase,
  AdditionalServicesConfig,
  BuilderConfig,
  InvitationParsed,
  NavigationItem,
  PageLayout,
} from './types';

export type AdditionalServiceKey = Exclude<keyof AdditionalServicesConfig, 'version'>;

export const ADDITIONAL_SERVICE_META: Record<AdditionalServiceKey, { label: string; description: string }> = {
  domain: { label: 'Dominio propio', description: 'Titularidad, DNS, HTTPS, vencimiento y renovación.' },
  language: { label: 'Otro idioma', description: 'Contenido, formularios, fechas y mensajes del sistema.' },
  saveDate: { label: 'Save the Date', description: 'Página previa, preconfirmación y transición a la invitación.' },
  personalization: { label: 'Personalización total', description: 'Brief, referencias, propuesta y aprobación.' },
  navigation: { label: 'Menú de navegación', description: 'Accesos claros a las secciones, comprobados en celular.' },
  visibility: { label: 'Visibilidad extendida', description: 'Ampliación registrada y comunicada al cliente.' },
};

export const ADDITIONAL_SERVICE_KEYS = Object.keys(ADDITIONAL_SERVICE_META) as AdditionalServiceKey[];

export const additionalServices = (config?: BuilderConfig | null): AdditionalServicesConfig => ({
  version: 1,
  ...(config?.additionalServices?.version === 1 ? config.additionalServices : {}),
});

const cleanHost = (value?: string) => String(value ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
export function validHostname(value?: string) {
  const hostname = cleanHost(value);
  return hostname.length <= 253 && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname);
}
export const normalizeHostname = cleanHost;

const serviceStatus = (service?: AdditionalServiceBase) => service?.status ?? 'not_contracted';
const active = (service?: AdditionalServiceBase) => serviceStatus(service) !== 'not_contracted';
const dateOk = (value?: string) => !!value && Number.isFinite(Date.parse(value));

export interface AdditionalServiceCheck {
  label: string;
  done: boolean;
}

export function additionalServiceChecks(key: AdditionalServiceKey, data: InvitationParsed): AdditionalServiceCheck[] {
  const services = additionalServices(data.config);
  const service = services[key];
  if (!active(service)) return [];
  if (key === 'domain') {
    const item = services.domain!;
    return [
      { label: 'Dominio válido y asignado', done: validHostname(item.hostname) },
      { label: 'Titularidad comprobada', done: item.ownershipVerified === true },
      { label: 'DNS conectado', done: item.dnsVerified === true },
      { label: 'HTTPS activo', done: item.httpsVerified === true },
      { label: 'Vencimiento registrado', done: dateOk(item.expiresAt) },
    ];
  }
  if (key === 'language') {
    const item = services.language!;
    return [
      { label: 'Idioma de destino definido', done: !!item.targetLocale && item.targetLocale !== (item.sourceLocale ?? 'es-BO') },
      { label: 'Contenido traducido', done: item.contentTranslated === true },
      { label: 'Formularios y botones traducidos', done: item.formsTranslated === true },
      { label: 'Fechas localizadas', done: item.datesLocalized === true },
      { label: 'Mensajes del sistema traducidos', done: item.systemMessagesTranslated === true },
      { label: 'Revisión del cliente', done: item.clientReviewed === true },
    ];
  }
  if (key === 'saveDate') {
    const item = services.saveDate!;
    return [
      { label: 'Página previa activada', done: item.enabled === true },
      { label: 'Título y mensaje completos', done: !!item.title?.trim() && !!item.message?.trim() },
      { label: 'Preconfirmación habilitada', done: item.preconfirmationEnabled === true },
      { label: 'Save the Date publicado', done: item.published === true },
    ];
  }
  if (key === 'personalization') {
    const item = services.personalization!;
    return [
      { label: 'Brief completo', done: (item.brief?.trim().length ?? 0) >= 20 },
      { label: 'Referencias registradas', done: (item.references?.filter(Boolean).length ?? 0) > 0 },
      { label: 'Propuesta identificada', done: item.proposalReady === true && !!item.proposalLabel?.trim() },
      { label: 'Aprobación del cliente', done: item.clientApproved === true && dateOk(item.approvedAt) },
    ];
  }
  if (key === 'navigation') {
    const item = services.navigation!;
    const validIds = new Set((data.config.layout?.blocks ?? []).map(block => block.id));
    return [
      { label: 'Menú activado', done: item.enabled === true },
      { label: 'Al menos dos secciones válidas', done: (item.items?.filter(entry => validIds.has(entry.blockId)).length ?? 0) >= 2 },
      { label: 'Comprobado en celular', done: item.mobileVerified === true },
    ];
  }
  const item = services.visibility!;
  return [
    { label: 'Ampliación aplicada a la vigencia', done: item.extensionRegistered === true && (data.validity_extra_days ?? 0) > 0 },
    { label: 'Nueva fecha visible', done: dateOk(data.expires_at ?? undefined) },
    { label: 'Cliente notificado', done: item.clientNotified === true },
  ];
}

export function additionalServiceProgress(key: AdditionalServiceKey, data: InvitationParsed) {
  const checks = additionalServiceChecks(key, data);
  return checks.length ? Math.round(checks.filter(check => check.done).length / checks.length * 100) : 0;
}

export function additionalServiceErrors(data: InvitationParsed): string[] {
  const services = additionalServices(data.config);
  return ADDITIONAL_SERVICE_KEYS.flatMap(key => {
    const service = services[key];
    if (!active(service)) return [];
    const checks = additionalServiceChecks(key, data);
    if (serviceStatus(service) === 'ready' && checks.some(check => !check.done)) {
      return [`${ADDITIONAL_SERVICE_META[key].label}: no puede marcarse listo mientras falten comprobaciones.`];
    }
    return [];
  });
}

const fallbackLabels: Partial<Record<string, string>> = {
  cinematicHero: 'Inicio', passportHero: 'Inicio', cover: 'Inicio', couple: 'Nosotros',
  editorialChapter: 'Historia', eventCard: 'Evento', countdown: 'Fecha', itinerary: 'Itinerario',
  gallery: 'Galería', dressCode: 'Vestimenta', gifts: 'Regalos', lodging: 'Hospedaje', rsvp: 'Confirmar',
};

export function navigationCandidates(layout?: PageLayout): NavigationItem[] {
  if (!layout) return [];
  return layout.blocks
    .filter(block => block.enabled !== false && fallbackLabels[block.type])
    .map(block => ({
      id: `nav-${block.id}`,
      blockId: block.id,
      label: String(block.props?.title || block.props?.eyebrow || fallbackLabels[block.type] || 'Sección').trim().slice(0, 24),
    }))
    .filter((entry, index, all) => all.findIndex(candidate => candidate.blockId === entry.blockId) === index);
}

/** Evita publicar el brief, responsables y notas internas dentro del HTML del invitado. */
export function publicAdditionalServices(source?: AdditionalServicesConfig): AdditionalServicesConfig | undefined {
  if (source?.version !== 1) return undefined;
  const ready = (service?: AdditionalServiceBase) => service?.status === 'ready';
  return {
    version: 1,
    language: ready(source.language) ? {
      status: 'ready', sourceLocale: source.language?.sourceLocale, targetLocale: source.language?.targetLocale,
      contentTranslated: source.language?.contentTranslated, formsTranslated: source.language?.formsTranslated,
      datesLocalized: source.language?.datesLocalized, systemMessagesTranslated: source.language?.systemMessagesTranslated,
    } : undefined,
    saveDate: ready(source.saveDate) && source.saveDate?.published ? {
      status: 'ready', enabled: source.saveDate.enabled, title: source.saveDate.title, message: source.saveDate.message,
      eyebrow: source.saveDate.eyebrow, buttonLabel: source.saveDate.buttonLabel, heroImage: source.saveDate.heroImage,
      preconfirmationEnabled: source.saveDate.preconfirmationEnabled, published: true, convertedAt: source.saveDate.convertedAt,
    } : undefined,
    navigation: ready(source.navigation) ? {
      status: 'ready', enabled: source.navigation?.enabled, position: source.navigation?.position,
      style: source.navigation?.style, items: source.navigation?.items, mobileVerified: source.navigation?.mobileVerified,
    } : undefined,
  };
}
