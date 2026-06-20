import { migrateBuilderConfig } from './layout-migrations';

export type InvitationStatus = 'draft' | 'ready' | 'expired' | 'disabled';

export type InvitationTemplate =
  // Premium (con builder visual)
  | 'azure' | 'primicia' | 'passport'
  // Próximamente
  | 'paradise' | 'obsidiana' | 'dolcevita' | 'grazia' | 'carmesi_v2' | 'napoly'
  | 'perla_v2' | 'euforia' | 'rosegold' | 'allegria'
  // Clásicas (legacy)
  | 'perla' | 'marmol' | 'terra' | 'sobre' | 'carmesi' | 'gerbera';

export type InvitationType = 'boda' | 'xv' | 'cumpleanos' | 'baby_shower' | 'bautizo';

export interface Sponsor {
  role: string;
  names: string;
}

export interface ItineraryItem {
  time: string;
  label: string;
  /** Ruta del ícono Lottie (ej: /lottie/boda/marriage.json) o nombre SVG clásico (ej: church) */
  icon?: string;
  /** Colores editados del ícono Lottie: { '#origen': '#nuevo' | 'transparent' } */
  iconColors?: Record<string, string>;
  /** Velocidad del ícono Lottie (1 = normal). */
  iconSpeed?: number;
}

/**
 * Campos "ricos" específicos de cada plantilla premium, guardados en la
 * columna JSONB `builder_config`. Todos son opcionales: el mapper aplica
 * defaults cuando faltan. Es permisivo a propósito para no romper al añadir
 * campos nuevos desde el builder.
 */
export interface BuilderConfig {
  // ── Comunes / Azure ──
  city?: string;
  welcomeTitle?: string;
  blessing?: string;
  introMessage?: string;
  galleryMessage?: string;
  rsvpMessage?: string;
  // ── Primicia ──
  ceremonyDesc?: string;
  receptionDesc?: string;
  // ── Passport ──
  announce?: string;
  verse?: string;
  verseRef?: string;
  callout?: string;
  callout2?: string;
  dressWomen?: string[];
  dressMen?: string[];
  noKidsMessage?: string;
  // ── Paradise ──
  brideLast?: string;
  groomLast?: string;
  rsvpClosing?: string;
  giftRegistryUrl?: string;
  giftRegistryLabel?: string;
  giftQrUrl?: string;
  lodgingTitle?: string;
  lodging?: { name: string; image: string; desc?: string }[];
  secondaryImage?: string;
  footerImage?: string;
  // ── Obsidiana ──
  datePlace?: string;
  giftEnvelopes?: string;
  thanksTitle?: string;
  thanksMessage?: string;
  aboutImage?: string;
  // ── Dolce Vita ──
  dateCity?: string;
  lodgingContact?: string;
  giftThanks?: string;
  giftCash?: string;
  giftOther?: string;
  // ── Grazia ──
  coverLabel?: string;
  groomName?: string;
  brideName?: string;
  groomPhoto?: string;
  bridePhoto?: string;
  saveDateMsg?: string;
  storyTitle?: string;
  storyMessage?: string;
  dressCodeTitle?: string;
  giftAccounts?: { name: string; account: string }[];
  // ── Medios ──
  musicUrl?: string;
  /** Galería de fotos subidas (URLs de Supabase Storage) renderizada en la plantilla */
  galleryImages?: string[];
  /** Imágenes por sección, ej: { hero: '...', couple: '...' } */
  sectionImages?: Record<string, string>;
  /** Iconos por sección elegidos en el panel: { ceremony: 'church' | '/lottie/...' | 'https://.../icono.png' } */
  sectionIcons?: Record<string, string>;
  /** Colores editados por sección para iconos Lottie: { ceremony: { '#origen': '#nuevo', ... } } */
  sectionIconColors?: Record<string, Record<string, string>>;
  /** Velocidad por sección para iconos Lottie: { ceremony: 1.5 } */
  sectionIconSpeeds?: Record<string, number>;
  /** Color de los iconos SVG por defecto (si no se define, usa el de la plantilla) */
  iconColor?: string;
  /** Escala de los iconos (1 = tamaño normal; rango sugerido 0.7–1.4) */
  iconScale?: number;
  // ── Tipografía (familias de Google Fonts; vacío = la de la plantilla) ──
  /** Fuente script/caligráfica: nombres de la pareja (reemplaza Great Vibes) */
  fontScript?: string;
  /** Fuente de títulos y números (reemplaza Cinzel / Playfair Display) */
  fontHeading?: string;
  /** Fuente del cuerpo de texto (reemplaza Cormorant / Lora / Nunito) */
  fontBody?: string;
  // ── Paquete contratado (Exclusive/Premium/Plus) y ajustes finos ──
  /** Paquete del cliente: siembra qué funciones están activas. Sin valor = todo activo. */
  package?: InvitationPackage;
  /** Overrides por función sobre el preset del paquete (lo que pida el cliente). */
  features?: PackageFeatureOverrides;
  // ── Tema visual y decoración (control total de la plantilla) ──
  theme?: TemplateTheme;
  /** Paleta alternativa "noche" (modo oscuro). Si existe, aparece un toggle sol/luna. */
  nightTheme?: TemplateTheme;
  /** El modo noche arranca activado (p. ej. eventos nocturnos). */
  nightDefault?: boolean;
  decor?: TemplateDecor;
  /** Tokens de composición para mantener el ADN visual del modelo. */
  tokens?: TemplateTokens;
  // ── Transiciones de scroll / 3D (editable desde el panel "Animación") ──
  motion?: PageMotion;
  // ── Documento por bloques (constructor visual). Si existe, manda sobre la plantilla legacy. ──
  layout?: PageLayout;
  // ── Pantalla de entrada / "sobre" (2 enlaces) ──
  entry?: { enabled?: boolean; label?: string };
  /** Mensaje configurable para compartir por WhatsApp. Soporta {nombre} y {link}. */
  whatsappTemplate?: string;
  // Permite añadir claves nuevas sin tocar el tipo
  [key: string]: unknown;
}

/** Paquetes comerciales de Enkarta (ver tabla comparativa de la landing). */
export type InvitationPackage = 'exclusive' | 'premium' | 'plus';

/**
 * Overrides por función sobre el preset del paquete. Permiten ajustar una
 * invitación concreta ("el cliente Plus pagó música aparte") sin cambiar de paquete.
 */
export interface PackageFeatureOverrides {
  /** Música de fondo */
  music?: boolean;
  /** Nombre del invitado personalizado en el enlace */
  guestNames?: boolean;
  /** Tickets / nº de pases */
  passes?: boolean;
  /** Máximo de fotos en la galería (0 = sin galería) */
  galleryMax?: number;
  /** Sección de sugerencia de hospedaje */
  lodging?: boolean;
  /** Pantalla de entrada tipo sobre (default; el toggle de Entrada manda si se toca) */
  entry?: boolean;
  /** Botón de agendar en Google Calendar (invitaciones por bloques) */
  calendar?: boolean;
  /** Confirmación inteligente: formulario in-app + panel de invitados en vivo */
  smartRsvp?: boolean;
}

/**
 * Paleta semántica que cada plantilla premium mapea a sus colores internos.
 * Todos opcionales: si faltan, la plantilla usa su paleta de diseño por defecto.
 */
export interface TemplateTheme {
  primary?: string;     // color principal: títulos, trazos, botones
  primaryDeep?: string; // variante oscura: pie de página, bloques
  text?: string;        // texto principal (ink)
  muted?: string;       // texto secundario / suave
  line?: string;        // líneas divisorias
  bg?: string;          // fondo de la página
  onPrimary?: string;   // texto sobre bloques de color primario (ej. blanco/crema)
}

/** Tokens de composición por modelo para mantener consistencia al editar. */
export interface TemplateTokens {
  contentWidth?: number;
  sectionInset?: number;
  sectionRadius?: number;
  spacing?: 'compact' | 'normal' | 'airy';
  surface?: 'flat' | 'soft' | 'card';
}

/** Formas disponibles para las partículas que caen. */
export type ParticleShape =
  | 'feather' | 'petal' | 'blossom' | 'heart' | 'star'
  | 'leaf' | 'sparkle' | 'circle' | 'ring' | 'butterfly'
  | 'snow' | 'confetti' | 'maple' | 'diamond' | 'note' | 'bird';

/** Diseños disponibles para los adornos de esquina. */
export type CornerStyle =
  | 'orchid' | 'rose' | 'leaves' | 'pampas' | 'palm' | 'geometric'
  | 'laurel' | 'vine' | 'berries' | 'fan';

/** Controles de los elementos decorativos de la plantilla. */
export interface TemplateDecor {
  /** Estilo de fondo */
  background?: 'art' | 'solid' | 'gradient';
  /** Partículas flotantes que caen (plumas, pétalos, corazones…). */
  floating?: { on?: boolean; color?: string; tip?: string; count?: number; shape?: ParticleShape };
  /** Adornos de esquina (orquídeas/rosas/hojas/pampa/palma/geométrico) */
  corners?: { on?: boolean; color?: string; opacity?: number; style?: CornerStyle };
  /** Separadores entre secciones */
  dividers?: 'art' | 'line' | 'none';
  /** Animación de entrada */
  loader?: 'heart' | 'ring' | 'none';
  /** Estela de cursor en escritorio (destellos/pétalos que siguen al puntero). */
  cursorTrail?: { on?: boolean; shape?: 'sparkle' | 'petal' | 'heart'; color?: string };
  /** Textura de papel sutil sobre el fondo. */
  texture?: 'none' | 'linen' | 'paper' | 'marble' | 'parchment';
}

/**
 * Animación de cada sección al entrar en pantalla (scroll reveal). Se usa por
 * sección (bloque) y, como defecto, lo deriva el preset global de `PageMotion`.
 */
export type ScrollPreset =
  | 'none'       // estático
  | 'fade'       // solo fundido
  | 'fadeUp'     // fundido + subida (clásico Enkarta)
  | 'fadeDown'   // fundido + bajada
  | 'slideLeft'  // entra desde la derecha
  | 'slideRight' // entra desde la izquierda
  | 'zoom'       // fundido + escala
  | 'pop'        // aparece con rebote de escala
  | 'rotateIn'   // entra girando ligeramente
  | 'tilt3d'     // entra inclinada en 3D (profundidad)
  | 'flip3d'     // volteo 3D tipo página
  | 'parallax'   // deriva continua ligada al scroll
  | 'curtain'    // revelado tipo cortina (clip-path)
  | 'blur'       // entra desenfocada
  | 'swing3d'    // puerta 3D: gira desde un lateral (rotateY)
  | 'unfold3d'   // se despliega en 3D desde el plano (rotateY 90°)
  | 'depth3d'    // emerge desde la profundidad (escala + inclinación)
  | 'riseSoft'   // ascenso suave con escala (lujo editorial)
  | 'zoomScroll';// zoom continuo ligado al scroll (Ken Burns para fotos)

/** Preset global de transiciones de la invitación ("página 3D"). */
export type PageMotionPreset =
  | 'none' | 'minimal' | 'elegant' | 'editorial' | 'cinematic3d' | 'parallaxBook' | 'playful'
  | 'luxury3d' | 'gallery3d' | 'unfold';

/**
 * Configuración global de las transiciones de scroll/3D de una invitación.
 * Editable desde el panel; el mapper/render la inyecta vía `PageMotionProvider`.
 */
export interface PageMotion {
  /** Preset global; deriva la animación por sección por defecto. */
  preset?: PageMotionPreset;
  /** Profundidad de la perspectiva 3D en px (rango sugerido 600–1600). */
  perspective?: number;
  /** Multiplicador de intensidad de las animaciones (rango sugerido 0.5–1.5). */
  intensity?: number;
}

// ── Modelo de bloques (constructor visual, Fase 2) ────────────────────────────
// Cuando una invitación tiene `config.layout`, se renderiza por bloques editables
// (BlockRenderer) en vez de la plantilla legacy. Compatibilidad total: sin layout,
// se usa la plantilla de siempre.

export type BlockType =
  | 'cover'      // portada interna: nombres script (+ foto opcional)
  | 'heading'    // título (script / mayúsculas / serif)
  | 'text'       // párrafo / mensaje
  | 'countdown'  // cuenta regresiva
  | 'calendar'   // botón añadir al calendario
  | 'dateBadge'  // fecha en insignia
  | 'eventCard'  // ceremonia / recepción (icono + hora + lugar + mapa)
  | 'dressCode'  // código de vestimenta
  | 'itinerary'  // itinerario con iconos
  | 'gift'       // datos bancarios / QR
  | 'gallery'    // galería de fotos + compartir
  | 'rsvp'       // botón de confirmación
  | 'image'      // imagen libre
  | 'button'     // botón / enlace
  | 'divider'    // separador decorativo
  | 'spacer'     // espacio en blanco
  | 'ornament'   // adorno decorativo (orquídeas, laurel, floritura, aro…)
  | 'group'      // columnas: contenedor de bloques lado a lado
  | 'video'      // video embebido (YouTube / Vimeo)
  | 'map'        // mapa de Google embebido
  | 'quote'      // versículo / cita con autor
  | 'parents'    // padres y padrinos (lista de roles + nombres)
  | 'lodging'    // sugerencia de hospedaje (tarjeta con foto + enlace)
  | 'hashtag'    // hashtag del evento
  | 'monogram'   // iniciales en corona floral que se dibuja
  | 'timeline'   // "nuestra historia": hitos con foto + año + texto
  | 'beforeAfter' // comparador de dos fotos con deslizador
  | 'tableFinder' // buscador de mesa por nombre del invitado
  | 'guestbook'  // libro de mensajes / muro de saludos en vivo
  | 'element';   // sticker decorativo flotante (librería curada o imagen subida)

/** Animación de scroll de un bloque (override del preset global). */
export interface BlockAnimation {
  preset?: ScrollPreset;
  /** Retraso de entrada en ms. */
  delay?: number;
}

/** Estilo editable de un bloque (fondo, color, alineación, espaciado). */
export interface BlockStyle {
  bgKind?: 'none' | 'solid' | 'gradient' | 'primary' | 'image';
  bg?: string;
  /** Imagen de fondo a sangre (cuando bgKind = 'image'). */
  bgImage?: string;
  /** Encuadre del fondo (object-position, ej. "50% 30%"). */
  bgFocal?: string;
  /** Oscurecido sobre la imagen de fondo (0–0.85) para legibilidad. */
  overlay?: number;
  /** Sección a pantalla completa (hero), con contenido centrado vertical. */
  fullHeight?: boolean;
  /** Alto mínimo en px (0 = automático). */
  minHeight?: number;
  text?: string;
  align?: 'left' | 'center' | 'right';
  padTop?: number;     // px
  padBottom?: number;  // px
  maxWidth?: number;   // px (0 = ancho completo)
}

/** Override por breakpoint del layout libre de un bloque. */
export interface BlockViewportLayout {
  x?: number;
  y?: number;
  w?: number;
  rotate?: number;
  anchor?: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';
  z?: number;
}

/**
 * Transformación libre del bloque ("lienzo libre"): desplazamiento, ancho y giro.
 * Se aplica como transform sobre un envoltorio (no rompe el flujo; permite
 * solapamiento y colocación libre). Editable con sliders o arrastrando en el preview.
 */
export interface BlockLayout {
  x?: number;       // desplazamiento horizontal en px (offset desde el ancla si flota)
  y?: number;       // desplazamiento vertical en px (offset desde el ancla si flota)
  w?: number;       // ancho en px (0/undefined = automático)
  rotate?: number;  // giro en grados
  /** Ocultar el bloque en un tamaño de pantalla. */
  hideOn?: 'mobile' | 'desktop';
  /**
   * Ancla de un elemento flotante (sticker) respecto a la página: esquinas,
   * bordes o centro. Si se define, el bloque se renderiza en una capa absoluta
   * por encima del contenido (estilo Canva) en lugar del flujo vertical.
   */
  anchor?: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';
  /** Profundidad de apilado del elemento flotante (mayor = más al frente). */
  z?: number;
  /** Ajustes específicos de móvil. */
  mobile?: BlockViewportLayout;
  /** Ajustes específicos de escritorio. */
  desktop?: BlockViewportLayout;
}

export type BlockBindings = Record<string, string>;

/** Un bloque del documento: tipo + contenido + estilo + animación. */
export interface Block {
  id: string;
  type: BlockType;
  /** false = oculto (se conserva pero no se renderiza). */
  enabled?: boolean;
  /** Contenido específico del tipo (ver field schema en blocks/registry). */
  props: Record<string, unknown>;
  style?: BlockStyle;
  animation?: BlockAnimation;
  /** Transformación libre (posición/tamaño/giro) del lienzo. */
  layout?: BlockLayout;
  /** Enlaces opcionales a datos globales de la invitación. */
  bindings?: BlockBindings;
  /** Bloques hijos (solo para el tipo 'group' = columnas). */
  children?: Block[];
  /** Bloqueado: no se puede seleccionar/mover en el lienzo (panel de capas). */
  locked?: boolean;
}

/** Una confirmación de asistencia (RSVP) de un invitado. */
export interface RsvpEntry {
  id: string;
  name: string;
  attending: 'yes' | 'no';
  passes?: number;
  message?: string;
  at: string; // ISO
}

/**
 * Un invitado de la lista de una invitación (tabla `guests` en Postgres).
 * El `publicId` viaja en el link único `?g=<publicId>`; el `accessToken` se
 * genera al confirmar y es el contenido del QR de acceso.
 */
export interface Guest {
  id: string;            // UUID interno
  publicId: string;      // corto, va en el link ?g= y resuelve el QR
  name: string;
  tableNo?: string;      // mesa (opcional)
  passes: number;
  allowKids: boolean;    // false → la invitación muestra el párrafo "no niños"
  sent: boolean;         // "invitación enviada" (manual)
  status: 'pending' | 'confirmed' | 'declined';
  /** Cuántos pases confirmó realmente usar (≤ passes). */
  confirmedPasses?: number;
  confirmName?: string;  // nombre(s) que escribió al confirmar
  message?: string;
  respondedAt?: string;  // ISO
  accessToken?: string;  // contenido del QR (se genera al confirmar)
  accessCode?: string;   // ID de acceso visual legible (ENK-XXXX)
}

/** Asiento/persona de un invitado para el check-in parcial individual. */
export interface Attendee {
  id: string;
  guestId: string;
  seatNo: number;        // 1..passes
  label?: string;
  state: 'in' | 'out';   // in = dentro del evento, out = afuera / no ha llegado
  checkedInAt?: string;
  checkedOutAt?: string;
}

/** Documento por bloques de una invitación. */
export const LAYOUT_VERSION = 2 as const;
export interface PageLayout {
  version: 1 | 2;
  /** Plantilla de la que se generó (para referencia). */
  basePreset?: InvitationTemplate;
  /** ID del preset con el que se sembró. */
  presetKey?: string;
  blocks: Block[];
}

export interface Invitation {
  id: string;
  slug: string;
  status: InvitationStatus;
  template: InvitationTemplate;
  type: InvitationType;

  // Main data
  names: string | null;
  event_date: string | null;
  ceremony_time: string | null;
  ceremony_place: string | null;
  ceremony_address: string | null;
  reception_time: string | null;
  reception_place: string | null;
  reception_address: string | null;

  // Guest personalization
  guest_name: string | null;
  guest_passes: number;

  // Optional content
  message: string | null;
  dress_code: string | null;
  no_kids: boolean;
  parents_groom: string | null; // JSON string
  parents_bride: string | null; // JSON string
  sponsors: string | null; // JSON string
  itinerary: string | null; // JSON string
  gift_message: string | null;
  bank_account: string | null;
  cover_image_url: string | null;
  gallery_url: string | null;

  // Custom colors
  color_primary: string;
  color_secondary: string;
  color_accent: string;

  // Link expiration
  expires_at: string | null;        // ISO date — null = sin expiración
  is_active: boolean;               // false = dado de baja manualmente

  // Stats
  views_count: number;

  // Builder config (tipografía, transiciones, etc.)
  builder_config: string | null;    // JSON string

  // Gestión de invitados / control de acceso (migración 002)
  host_email: string | null;
  host_password_hash: string | null;
  rsvp_deadline: string | null;     // fecha límite de confirmación (ISO date)
  whatsapp_template: string | null; // mensaje de envío configurable

  // Metadata
  created_at: string;
  phone_raw: string | null;
  phone_whatsapp: string | null;
}

// Parsed versions of JSON fields
export interface InvitationParsed extends Omit<Invitation, 'parents_groom' | 'parents_bride' | 'sponsors' | 'itinerary'> {
  parents_groom: string[];
  parents_bride: string[];
  sponsors: Sponsor[];
  itinerary: ItineraryItem[];
  /** builder_config ya parseado a objeto (las plantillas y el builder editan esto) */
  config: BuilderConfig;
}

// Helper to parse JSON fields
export function parseInvitation(inv: Invitation): InvitationParsed {
  return {
    ...inv,
    parents_groom: safeParseJSON<string[]>(inv.parents_groom, []),
    parents_bride: safeParseJSON<string[]>(inv.parents_bride, []),
    sponsors: safeParseJSON<Sponsor[]>(inv.sponsors, []),
    itinerary: safeParseJSON<ItineraryItem[]>(inv.itinerary, []),
    config: parseConfig(inv.builder_config),
  };
}

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * builder_config puede llegar como objeto (columna JSONB → supabase-js lo
 * devuelve parseado) o como string (texto/JSON legacy). Manejamos ambos.
 */
export function parseConfig(value: unknown): BuilderConfig {
  if (!value) return {};
  if (typeof value === 'object') return migrateBuilderConfig(value as BuilderConfig);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed ? migrateBuilderConfig(parsed as BuilderConfig) : {};
    } catch {
      return {};
    }
  }
  return {};
}

// Form data for creating/editing
export interface InvitationFormData {
  slug: string;
  template: InvitationTemplate;
  type: InvitationType;
  names: string;
  event_date: string;
  ceremony_time: string;
  ceremony_place: string;
  ceremony_address: string;
  reception_time: string;
  reception_place: string;
  reception_address: string;
  guest_name: string;
  guest_passes: number;
  message: string;
  dress_code: string;
  no_kids: boolean;
  parents_groom: string[];
  parents_bride: string[];
  sponsors: Sponsor[];
  itinerary: ItineraryItem[];
  gift_message: string;
  bank_account: string;
  cover_image_url: string;
  gallery_url: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
}

export const TEMPLATE_OPTIONS: { value: InvitationTemplate; label: string; description: string; premium?: boolean }[] = [
  // ── Premium (con editor visual) ──
  { value: 'azure', label: 'Azure', description: 'Acuarela azul con orquídeas', premium: true },
  { value: 'primicia', label: 'Primicia', description: 'Estilo periódico elegante', premium: true },
  { value: 'passport', label: 'Passport', description: 'Pasaporte de viaje', premium: true },
  { value: 'paradise', label: 'Paradise', description: 'Tropical verde y dorado', premium: true },
  { value: 'obsidiana', label: 'Obsidiana', description: 'Negro y dorado de lujo', premium: true },
  { value: 'dolcevita', label: 'Dolce Vita', description: 'Verde bosque y dorado', premium: true },
  { value: 'grazia', label: 'Grazia', description: 'Champán sofisticado', premium: true },
  { value: 'carmesi_v2', label: 'Carmesí', description: 'Vino y dorado con rosas', premium: true },
  { value: 'napoly', label: 'Napoly', description: 'Taupe y rosa empolvado', premium: true },
  { value: 'euforia', label: 'Euforia', description: 'Mocha cálido y pastel', premium: true },
  { value: 'rosegold', label: 'Rose Gold', description: 'Durazno y rosa dorado', premium: true },
  { value: 'allegria', label: 'Allegría', description: 'Salvia minimalista', premium: true },
  // ── Clásicas (legacy) ──
  { value: 'perla', label: 'Perla', description: 'Elegante con hojas verdes y dorado' },
  { value: 'marmol', label: 'Mármol', description: 'Sofisticado con texturas de mármol' },
  { value: 'terra', label: 'Terra', description: 'Tonos tierra, rústico y cálido' },
  { value: 'sobre', label: 'Sobre', description: 'Clásico estilo sobre real' },
  { value: 'carmesi', label: 'Carmesí (clásica)', description: 'Dramático en rojos profundos' },
  { value: 'gerbera', label: 'Gerbera', description: 'Floral y vibrante con atardecer' },
];

export const TYPE_OPTIONS: { value: InvitationType; label: string }[] = [
  { value: 'boda', label: 'Boda' },
  { value: 'xv', label: 'XV Años' },
  { value: 'cumpleanos', label: 'Cumpleaños' },
  { value: 'baby_shower', label: 'Baby Shower' },
  { value: 'bautizo', label: 'Bautizo' },
];
