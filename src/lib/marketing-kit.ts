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

export function marketingTrackingPath(campaign: MarketingCampaignKey, format: MarketingFormatKey): string {
  const item = MARKETING_CAMPAIGNS[campaign];
  const params = new URLSearchParams({ utm_source: 'instagram', utm_medium: 'organic', utm_campaign: `lanzamiento_${campaign.replace('-', '_')}`, utm_content: MARKETING_FORMATS[format].content });
  return `${item.path}?${params}`;
}

