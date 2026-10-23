/**
 * Original resources for the independent Paradise reference profile.
 * Matched by the complete source URL; distribution bytes are locked separately.
 * Do not propagate this profile's choices to Verdealma or other invitations.
 */
const upload = 'https://invitali.com/wp-content/uploads/';

export const PARADISE_REFERENCE_ASSETS = {
  marble: '/invitations/paradise-referencia/2025-03-Fondo-verde-marmol-copia.webp',
  cover: '/invitations/paradise-referencia/2025-12-pasport.webp',
  music: '/audio/invitali-originales/2025-05-Ed-Sheran-Perfect-Violin.mp3',
  giftLogo: '/invitations/paradise-referencia/2025-06-Logo-Falabella-1024x400.webp',
  gallery: [
    '/invitations/paradise-referencia/2025-12-paradise-muestras3.webp',
    '/invitations/paradise-referencia/2025-12-paradise-muestras6.webp',
    '/invitations/paradise-referencia/2025-12-paradise-muestras5.webp',
  ],
  closingGallery: [
    '/invitations/paradise-referencia/2025-12-muestras-PARADISE2.webp',
    '/invitations/paradise-referencia/2025-12-muestras-PARADISE1.webp',
  ],
  hotels: [
    { name: 'Hotel Four Points', image: '/invitations/paradise-referencia/2025-09-Hotel-Sheraton-copia.webp' },
    { name: 'Madisson Inn', image: '/invitations/paradise-referencia/2025-09-Hotel-MAdison-copia.webp' },
  ],
  icons: {
    music: '/lottie/invitali-originales/2025-03-Animation-1741383787701.json',
    bible: '/lottie/invitali-originales/2025-05-biblia.json',
    ceremony: '/lottie/invitali-originales/2025-05-17-Iglesia.json',
    civil: '/lottie/invitali-originales/2025-07-boda.json',
    suit: '/lottie/invitali-originales/2025-05-chaqueta-de-sport.json',
    dress: '/lottie/invitali-originales/2025-05-vestido-de-novia.json',
    reception: '/lottie/invitali-originales/2025-05-11-recepcion-social.json',
    dinner: '/lottie/invitali-originales/2025-05-14-Cena.json',
    farewell: '/lottie/invitali-originales/2025-05-23-adios-fin-de-fiesta-1.json',
    firstDance: '/lottie/invitali-originales/2025-05-vals.json',
    dance: '/lottie/invitali-originales/2025-05-baile.json',
    gift: '/lottie/invitali-originales/2025-05-37-regalo-1.json',
    adults: '/lottie/boda/invitali-sin-ninos-original.json',
    camera: '/lottie/invitali-originales/2025-02-Animation-1740029697999.json',
  },
} as const;

/** Source settings declared in the archived public sample, not measured timings. */
const lottieInstance = (source: string, localPath: string, reverse: boolean) => ({
  source: upload + source,
  localPath,
  loop: true,
  speed: 1,
  reverse,
  renderer: 'svg' as const,
  trigger: 'arriving_to_viewport' as const,
});

export const PARADISE_REFERENCE_LOTTIE_INSTANCES = {
  music: lottieInstance('2025/03/Animation-1741383787701.json', PARADISE_REFERENCE_ASSETS.icons.music, true),
  bible: lottieInstance('2025/05/biblia.json', PARADISE_REFERENCE_ASSETS.icons.bible, false),
  ceremony: lottieInstance('2025/05/17-Iglesia.json', PARADISE_REFERENCE_ASSETS.icons.ceremony, true),
  civil: lottieInstance('2025/07/boda.json', PARADISE_REFERENCE_ASSETS.icons.civil, true),
  suit: lottieInstance('2025/05/chaqueta-de-sport.json', PARADISE_REFERENCE_ASSETS.icons.suit, true),
  dress: lottieInstance('2025/05/vestido-de-novia.json', PARADISE_REFERENCE_ASSETS.icons.dress, true),
  reception: lottieInstance('2025/05/11-recepcion-social.json', PARADISE_REFERENCE_ASSETS.icons.reception, true),
  dinner: lottieInstance('2025/05/14-Cena.json', PARADISE_REFERENCE_ASSETS.icons.dinner, true),
  farewell: lottieInstance('2025/05/23-adios-fin-de-fiesta-1.json', PARADISE_REFERENCE_ASSETS.icons.farewell, true),
  firstDance: lottieInstance('2025/05/vals.json', PARADISE_REFERENCE_ASSETS.icons.firstDance, true),
  dance: lottieInstance('2025/05/baile.json', PARADISE_REFERENCE_ASSETS.icons.dance, true),
  gift: lottieInstance('2025/05/37-regalo-1.json', PARADISE_REFERENCE_ASSETS.icons.gift, false),
  adults: lottieInstance('2025/05/10-no-ninos.json', PARADISE_REFERENCE_ASSETS.icons.adults, true),
  camera: lottieInstance('2025/02/Animation-1740029697999.json', PARADISE_REFERENCE_ASSETS.icons.camera, true),
} as const;

export const PARADISE_REFERENCE_SLIDESHOW = {
  gallery: { images: PARADISE_REFERENCE_ASSETS.gallery, intervalMs: 2000, transitionMs: 1000, kenBurns: true },
  closing: { images: PARADISE_REFERENCE_ASSETS.closingGallery, intervalMs: 2000, transitionMs: 1000, kenBurns: false },
} as const;
