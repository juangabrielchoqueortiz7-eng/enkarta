export type MarketingCampaignKey = 'bodas' | 'xv-anos' | 'cumpleanos';
export type MarketingFormatKey = 'story' | 'portrait' | 'square';

export const MARKETING_FORMATS: Record<MarketingFormatKey, { label: string; width: number; height: number; content: string }> = {
  story: { label: 'Historia / Reel', width: 1080, height: 1920, content: 'story' },
  portrait: { label: 'Carrusel vertical', width: 1080, height: 1350, content: 'carousel' },
  square: { label: 'Publicación cuadrada', width: 1080, height: 1080, content: 'post' },
};

export const MARKETING_CAMPAIGNS: Record<MarketingCampaignKey, { label: string; eyebrow: string; headline: string; subline: string; cta: string; path: string; image: string; accent: string; ink: string; reelScript: string[] }> = {
  bodas: { label: 'Bodas', eyebrow: 'Invitaciones digitales', headline: 'Su historia comienza antes del sí', subline: 'Diseño, música, itinerario y confirmaciones en una experiencia para compartir.', cta: 'Explora la colección', path: '/bodas', image: '/catalog/solar-original.png', accent: '#c5a465', ink: '#30291f', reelScript: ['La invitación también puede emocionar.', 'Presenta cada detalle con claridad.', 'Confirma invitados y organiza el acceso.', 'Conoce Enkarta.'] },
  'xv-anos': { label: 'XV años', eyebrow: 'Una entrada inolvidable', headline: 'Sus XV merecen una experiencia propia', subline: 'Fotografías, música, agenda y pases con una identidad que se siente desde el celular.', cta: 'Ver invitaciones de XV', path: '/xv-anos', image: '/catalog/rosegold.jpg', accent: '#c58b96', ink: '#3c2830', reelScript: ['Una fecha que solo ocurre una vez.', 'Una invitación hecha para su estilo.', 'Todo el programa en un solo enlace.', 'Descubre Enkarta para XV años.'] },
  cumpleanos: { label: 'Cumpleaños', eyebrow: 'Celebra desde el primer mensaje', headline: 'Tu fiesta empieza con la invitación', subline: 'Ubicación, programa, música y confirmaciones en un enlace fácil de compartir.', cta: 'Ver diseños de cumpleaños', path: '/cumpleanos', image: '/catalog/euforia.jpg', accent: '#c27b51', ink: '#3f2c22', reelScript: ['No envíes otra imagen que se pierde en el chat.', 'Comparte fecha, mapa y programa.', 'Actualiza sin volver a enviar.', 'Crea tu invitación Enkarta.'] },
};

export function marketingTrackingPath(campaign: MarketingCampaignKey, format: MarketingFormatKey, source = 'instagram'): string {
  const item = MARKETING_CAMPAIGNS[campaign];
  const safeSource = String(source).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'instagram';
  const medium = safeSource === 'alianzas' ? 'referral' : safeSource === 'whatsapp' ? 'message' : 'organic';
  const params = new URLSearchParams({ utm_source: safeSource, utm_medium: medium, utm_campaign: `lanzamiento_${campaign.replace('-', '_')}`, utm_content: MARKETING_FORMATS[format].content });
  return `${item.path}?${params}`;
}

export type LaunchCalendarItem = {
  day: number;
  channel: 'Instagram' | 'WhatsApp' | 'Alianzas' | 'Operación';
  campaign: MarketingCampaignKey;
  format: MarketingFormatKey;
  objective: string;
  action: string;
  caption: string;
};

/** Lanzamiento orgánico antes de invertir en pauta: una acción clara por día. */
export const LAUNCH_CALENDAR: LaunchCalendarItem[] = [
  { day: 1, channel: 'Instagram', campaign: 'bodas', format: 'story', objective: 'Presentación', action: 'Publicar historia y Reel de marca.', caption: 'La invitación también puede emocionar. Conoce Enkarta y descubre una experiencia creada para compartir cada detalle de tu boda.' },
  { day: 2, channel: 'WhatsApp', campaign: 'bodas', format: 'portrait', objective: 'Red cercana', action: 'Compartir el carrusel con contactos pertinentes, sin envíos masivos.', caption: 'Estamos lanzando Enkarta: invitaciones digitales con diseño, música, itinerario y confirmaciones. Si conoces a alguien organizando su boda, puedes compartirle esta muestra.' },
  { day: 3, channel: 'Instagram', campaign: 'bodas', format: 'portrait', objective: 'Demostración', action: 'Carrusel: imagen tradicional vs. invitación web.', caption: 'Una imagen anuncia. Una invitación Enkarta guía, emociona y ayuda a organizar. Desliza para ver la diferencia.' },
  { day: 4, channel: 'Alianzas', campaign: 'bodas', format: 'square', objective: 'Referidos', action: 'Contactar a cinco fotógrafos, planners o salones.', caption: 'Hola, somos Enkarta. Creamos invitaciones digitales editoriales para bodas y buscamos aliados que quieran ofrecer una experiencia más completa a sus clientes.' },
  { day: 5, channel: 'Instagram', campaign: 'bodas', format: 'story', objective: 'Interacción', action: 'Historia con encuesta sobre estilos favoritos.', caption: '¿Qué estilo elegirías para tu boda: botánico, editorial, romántico o nocturno?' },
  { day: 6, channel: 'Instagram', campaign: 'bodas', format: 'story', objective: 'Producto', action: 'Reel recorriendo una muestra completa.', caption: 'Así se siente abrir una invitación Enkarta: portada, música, agenda, ubicación y confirmación en un solo enlace.' },
  { day: 7, channel: 'Operación', campaign: 'bodas', format: 'square', objective: 'Aprendizaje', action: 'Revisar visitas, WhatsApp, conversaciones y preguntas repetidas.', caption: 'Revisión interna: registrar objeciones, tiempos de respuesta y el contenido que generó más consultas.' },
  { day: 8, channel: 'Instagram', campaign: 'xv-anos', format: 'story', objective: 'Segundo segmento', action: 'Publicar Reel de XV años.', caption: 'Sus XV merecen una experiencia propia: fotografías, música, agenda y pases con una identidad que se siente desde el celular.' },
  { day: 9, channel: 'WhatsApp', campaign: 'bodas', format: 'square', objective: 'Seguimiento', action: 'Responder y dar seguimiento a propuestas abiertas.', caption: '¿Pudiste revisar la propuesta? Podemos ajustar fecha, paquete o estilo antes de reservar.' },
  { day: 10, channel: 'Instagram', campaign: 'bodas', format: 'portrait', objective: 'Claridad comercial', action: 'Carrusel explicando Plus, Premium y Exclusive.', caption: 'Tres formas de vivir Enkarta. Compara funciones, confirmaciones y control de invitados para elegir lo que realmente necesita tu evento.' },
  { day: 11, channel: 'Alianzas', campaign: 'xv-anos', format: 'square', objective: 'Referidos', action: 'Contactar a cinco fotógrafos o salones de XV años.', caption: 'Creamos experiencias digitales para XV años y buscamos aliados con una propuesta visual cuidada. Podemos mostrarte una demostración navegable.' },
  { day: 12, channel: 'Instagram', campaign: 'cumpleanos', format: 'story', objective: 'Amplitud', action: 'Historia de cumpleaños con CTA a la muestra.', caption: 'Tu fiesta empieza con la invitación: fecha, mapa, programa y confirmaciones en un enlace fácil de compartir.' },
  { day: 13, channel: 'Instagram', campaign: 'bodas', format: 'story', objective: 'Objeciones', action: 'Responder tres preguntas frecuentes en historias.', caption: '¿Cuánto tarda? ¿Puedo cambiar colores? ¿Cómo confirman los invitados? Hoy respondemos las dudas más frecuentes.' },
  { day: 14, channel: 'Operación', campaign: 'bodas', format: 'square', objective: 'Decisión', action: 'Comparar el embudo y decidir si conviene iniciar una prueba pagada.', caption: 'Revisión interna: solo escalar si ya sabemos qué audiencia, pieza y argumento producen conversaciones calificadas.' },
];
