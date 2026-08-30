export type CommercialEventSlug = 'bodas' | 'xv-anos' | 'cumpleanos';

export interface CommercialEventPage {
  slug: CommercialEventSlug;
  eventType: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  accent: string;
  soft: string;
  designKeys: string[];
  features: Array<{ title: string; text: string }>;
  moments: string[];
}

export const COMMERCIAL_EVENT_PAGES: Record<CommercialEventSlug, CommercialEventPage> = {
  bodas: {
    slug: 'bodas', eventType: 'Boda', navLabel: 'Bodas', eyebrow: 'Invitaciones digitales para bodas',
    title: 'Una invitación que se siente como el comienzo de su historia',
    intro: 'Reunimos diseño editorial, música, itinerario, confirmaciones y acceso en una experiencia limpia que funciona desde cualquier celular.',
    accent: '#7c6949', soft: '#eee5d6', designKeys: ['marfil-vivo', 'dolcevita', 'carmesi_v2'],
    features: [
      { title: 'Recorrido completo', text: 'Ceremonia, recepción, itinerario, dress code, regalos, hospedaje y mapas en una sola dirección.' },
      { title: 'Cada invitado importa', text: 'Según el paquete, personaliza nombres y pases, administra confirmaciones y organiza mesas.' },
      { title: 'Entrada cuidada', text: 'Apertura, música, fotografías y transiciones mantienen una misma dirección artística.' },
    ],
    moments: ['Save the date', 'Ceremonia y recepción', 'Itinerario', 'Mesa de regalos', 'RSVP', 'Acceso QR'],
  },
  'xv-anos': {
    slug: 'xv-anos', eventType: 'XV Años', navLabel: 'XV años', eyebrow: 'Invitaciones digitales para XV años',
    title: 'Una celebración con identidad propia, movimiento y mucha emoción',
    intro: 'Construimos una experiencia móvil que presenta a la quinceañera, organiza cada momento y facilita las confirmaciones sin perder el estilo de la fiesta.',
    accent: '#9b6671', soft: '#f4e5e8', designKeys: ['rosegold', 'euforia', 'azure'],
    features: [
      { title: 'Presentación protagonista', text: 'Portada, fotografías, mensaje familiar y una dirección visual adaptada a la personalidad de la celebración.' },
      { title: 'Momentos bien ordenados', text: 'Ceremonia, recepción, vals, brindis, cena y fiesta se leen con claridad desde el celular.' },
      { title: 'Pases sin confusión', text: 'Los paquetes compatibles permiten nombres, cantidad de pases y control de confirmaciones.' },
    ],
    moments: ['Presentación', 'Ceremonia', 'Vals', 'Código de vestimenta', 'Confirmaciones', 'Galería'],
  },
  cumpleanos: {
    slug: 'cumpleanos', eventType: 'Cumpleaños', navLabel: 'Cumpleaños', eyebrow: 'Invitaciones digitales para cumpleaños',
    title: 'Toda la energía de tu celebración, en un enlace fácil de compartir',
    intro: 'Desde una reunión íntima hasta una gran fiesta: fecha, ubicación, programa, música y confirmaciones permanecen claros, alegres y accesibles.',
    accent: '#a56645', soft: '#f3e2d5', designKeys: ['euforia', 'allegria', 'primicia'],
    features: [
      { title: 'Personalidad antes que plantilla', text: 'Adaptamos textos, colores contratados, fotografías y ritmo visual a la edad y estilo del evento.' },
      { title: 'Información inmediata', text: 'El invitado encuentra cuándo, dónde, cómo llegar, qué llevar y cómo confirmar sin buscar mensajes anteriores.' },
      { title: 'Compartir es sencillo', text: 'Un único enlace funciona en WhatsApp y puede actualizarse sin reenviar una nueva imagen.' },
    ],
    moments: ['Cuenta regresiva', 'Ubicación', 'Programa', 'Dress code', 'Regalos', 'RSVP'],
  },
};

export const COMMERCIAL_EVENT_SLUGS = Object.keys(COMMERCIAL_EVENT_PAGES) as CommercialEventSlug[];

