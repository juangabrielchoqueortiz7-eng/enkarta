import type { BuilderConfig, InvitationParsed } from './types';
import { resolveFeatures } from './packages';
export const LA_ROOT = '/invitations/laura-andres/';
export const laPhoto = (n: number) => LA_ROOT + (n === 17 ? 'Laura-y-Andres17-1024x1536.webp' : `Laura-y-Andres${n}.webp`);
/** Etiqueta del constructor, texto inicial. Las cadenas vacías se conservan. */
export const LA_TEXTS = {
    announce: ['Anuncio de portada', '¡NOS CASAMOS!'],
    quote: ['Cita', '“El amor nunca se da por vencido, jamás pierde la fe, siempre tiene esperanzas y se mantiene firme en toda circunstancia”'],
    quoteRef: ['Autor de la cita', 'Corintios 13:7'],
    honor: ['Invitación principal', 'Tenemos el honor\nde invitarte a nuestra boda'],
    dateIntro: ['Introducción a la fecha', 'Queremos que nos acompañes en nuestro día:'],
    remaining: ['Cuenta regresiva', 'Faltan'], calendar: ['Botón de calendario', 'AGENDAR EL EVENTO'],
    ceremonyIntro: ['Introducción ceremonia', 'La Ceremonia Religiosa se\nrealizará en'],
    ceremonyNote: ['Detalle ceremonia', 'Jardín de las Puertas\n“El Rosal Cundinamarca”'],
    receptionIntro: ['Introducción recepción', 'Pasada la Ceremonia Religiosa, los esperamos en la Recepción Social que se llevará a cabo en «el salón del Bosque»'],
    receptionNote: ['Detalle recepción', '“El Rosal Cundinamarca”'], maps: ['Botón de ubicación', 'Ver Ubicación'],
    dressTitle: ['Título vestimenta', 'DRESS CODE'], women: ['Vestimenta de ellas', 'ELLAS\nVestido largo Colores\nreservados:'], men: ['Vestimenta de ellos', 'ELLOS\nTraje Elegante\nColor reservado:'],
    palette: ['Título paleta', 'Paleta de colores sugeridos'], program: ['Título itinerario', 'ITINERARIO'],
    giftTitle: ['Título regalos', 'SUGERENCIA DE REGALO'],
    noKidsTitle: ['Título sin niños', '“DULCES SUEÑOS”'], noKids: ['Mensaje sin niños', 'Queremos que esta celebración la disfrutes tanto como nosotros, por eso hemos decidido\nno extender la invitación a los niños'],
    share: ['Mensaje para compartir fotos', 'Ayúdanos a hacer eterno este día.\nComparte tus fotos y momentos especiales de nuestra boda para que todos podamos revivir esta celebración tan especial una y otra vez'],
    shareButton: ['Botón de fotos', 'Compartir fotografías'], rsvpTitle: ['Título confirmación', 'CONFIRMA TU ASISTENCIA'],
    rsvpThanks: ['Agradecimiento en el sobre', 'Gracias por acompañarnos en el día más especial de nuestra historia. Su compañía en este día es el mayor regalo que podemos recibir'],
    deadline: ['Texto antes de fecha límite', 'Confirma tu asistencia\nantes del:'], rsvpNote: ['Nota de confirmación', 'Para mantenerte en nuestra lista de invitados y unirte a nuestra celebración.'],
    closing: ['Despedida', 'CREEMOS QUE MERECES UNA NOCHE LLENA DE ALEGRÍA Y DE BUENOS MOMENTOS ES POR ESO QUE ESPERAMOS CONTAR CON TU COMPAÑÍA PARA HACERLA AÚN MÁS ESPECIAL.'],
    story: ['Historia de la pareja', 'Hace diez años nuestros corazones se encontraron por primera vez. La vida nos llevó por caminos distintos, nos enseñó a crecer y a esperar, hasta que el destino decidió unirnos de nuevo. Hoy, con la certeza que solo da el amor verdadero, elegimos no separarnos nunca más y caminar juntos para siempre.'],
    signature: ['Antes de la firma', 'Con todo nuestro amor'], family: ['Título de familia', 'Con la bendición de nuestras familias'],
} as const;
export const LA_SECTIONS = { quote: 'Cita', honor: 'Invitación principal', welcome: 'Bienvenida e invitado', date: 'Fecha y calendario', venues: 'Lugares', dress: 'Vestimenta', program: 'Itinerario', gallery: 'Galería', gift: 'Regalos', details: 'Indicaciones y compartir fotos', rsvp: 'Confirmación', portrait: 'Carrusel de despedida', farewell: 'Historia y firma', lastPortrait: 'Último carrusel', family: 'Familia y padrinos', lodging: 'Hospedaje' };
export function lauraAndresStarter() {
    const config: BuilderConfig = {
        designKey: 'laura-y-andres', theme: { bg: '#ffffff', primary: '#68693f', text: '#544e39', line: '#818566', primaryDeep: '#5e4b3c', onPrimary: '#ffffff' },
        entry: { enabled: true }, motion: { preset: 'elegant' },
        sectionIcons: { noKids: '/lottie/boda/laura-sin-ninos.json', hearts: '/lottie/boda/laura-corazones.json', giftEnvelope: '/lottie/boda/laura-lluvia-de-sobres.json' },
        musicUrl: 'https://invitali.com/wp-content/uploads/2025/03/Turning-Page-Sleeping-At-Last-Violin-cover-by-Daniel-Jang.mp3',
        galleryImages: [18, 12, 9, 17, 14, 7, 15, 11, 6].map(laPhoto),
        lauraAndres: { texts: Object.fromEntries(Object.entries(LA_TEXTS).map(([k, v]) => [k, v[1]])), sections: {}, coverImages: [laPhoto(7), laPhoto(6)], portraitImages: [18, 15, 14, 13, 12, 11, 10, 7].map(laPhoto), closingImages: [8, 9, 10, 6, 5, 4, 3, 11, 14].map(laPhoto), womenColors: ['#ffffff', '#e8ddbc'], menColors: ['#292291'], suggestedColors: ['#dfc8a8', '#ba9b7f', '#705750', '#95674d', '#c1c7af', '#58694d', '#000000'], slideSeconds: 6 },
    };
    return {
        template: 'dolcevita' as const, status: 'draft' as const, type: 'boda' as const, names: 'Andrés y Laura', event_date: '2026-02-21', ceremony_time: '15:30', ceremony_place: 'Casa Aragón', ceremony_address: 'https://maps.app.goo.gl/89RdJVRvaEY6EzKW6?g_st=ic', reception_time: '18:00', reception_place: 'Casa Aragón', reception_address: 'https://share.google/N6pOj9zrLOryVO4lJ',
        guest_name: null, guest_passes: 2, message: 'Nuestro gran día se aproxima y nos encantaría que formaras parte de el,', dress_code: 'Elegante', no_kids: true, parents_groom: [], parents_bride: [], sponsors: [],
        itinerary: [['03:00 pm', 'Recepción Social', 'invitacion'], ['03:30 pm', 'Ceremonia', 'anillos'], ['06:00 pm', 'Drunch', 'champan'], ['08:00 pm', 'Cena', 'cena'], ['10:00 pm', 'Fiesta', 'baile'], ['03:00 am', 'Felices para siempre', 'honeymoon']].map(([time, label, icon]) => ({ time, label, icon: `/lottie/boda/${icon}.json` })),
        gift_message: 'Lluvia de Sobres', bank_account: null, cover_image_url: LA_ROOT + 'portada-Laura-y-Andres16.webp', gallery_url: 'https://docs.google.com/forms/d/e/1FAIpQLSfk1buSg65qNeS4mfCky06PX7n4vVOdTr7CGFHC8wFFHSctSw/viewform?usp=header', color_primary: '#68693f', color_secondary: '#ffffff', color_accent: '#544e39', phone_whatsapp: null, builder_config: config,
    };
}
export function lauraAndresDemo(): InvitationParsed {
    const s = lauraAndresStarter();
    return { ...s, id: 'demo-laura-y-andres', slug: 'laura-y-andres', config: s.builder_config, builder_config: JSON.stringify(s.builder_config), is_active: true, expires_at: null, views_count: 0, host_email: null, host_password_hash: null, rsvp_deadline: null, whatsapp_template: null, created_at: '2026-09-05T00:00:00Z', phone_raw: null };
}
export function laText(data: InvitationParsed, key: keyof typeof LA_TEXTS) { return data.config.lauraAndres?.texts?.[key] ?? LA_TEXTS[key][1]; }
export function laMaps(address: string | null) { return !address ? '' : /^https?:\/\//i.test(address) ? address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`; }
/** Un presupuesto de fotos para toda la página; reutilizar una foto no gasta otro cupo. */
export function laMedia(data: InvitationParsed) {
    const limit = resolveFeatures(data.config).galleryMax;
    const allowed = new Set<string>();
    const take = (urls: string[] = []) => (urls.filter(url => {
        if (allowed.has(url))
            return true;
        if (allowed.size >= limit)
            return false;
        allowed.add(url);
        return true;
    }));
    const settings = data.config.lauraAndres;
    return { gallery: take(data.config.galleryImages), cover: take(settings?.coverImages), portrait: take(settings?.portraitImages), closing: take(settings?.closingImages) };
}
