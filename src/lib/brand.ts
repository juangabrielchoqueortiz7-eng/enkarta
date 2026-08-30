export const BRAND_NAME = 'Enkarta';
export const LEGAL_PROVIDER = 'Grupo JABA';
export const LEGAL_EFFECTIVE_DATE = '29 de agosto de 2026';
export const LEGAL_VERSION = '1.1';
export const BUSINESS_WHATSAPP = process.env.NEXT_PUBLIC_WA_PHONE || '59162449491';
export const BUSINESS_WHATSAPP_URL = '/contacto/whatsapp?placement=legal_support';

export const LEGAL_LINKS = [
  { href: '/legal', label: 'Centro legal' },
  { href: '/legal/privacidad', label: 'Privacidad' },
  { href: '/legal/terminos', label: 'Términos' },
  { href: '/legal/pagos', label: 'Pagos y cancelaciones' },
] as const;
