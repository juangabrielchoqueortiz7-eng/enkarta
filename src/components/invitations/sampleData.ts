import { InvitationContent, PassportContent, PrimiciaContent, ParadiseContent, ObsidianaContent, DolceVitaContent, GraziaContent } from './types';

// Sample content used by the preview route. Mirrors the Invitali demo data
// so we can match the reference designs 1:1 while building.
export const azureSample: InvitationContent = {
  groom: 'Lorena',
  bride: 'Marcos',
  initials: ['L', 'M'],
  guestName: 'Daniel Martinez',
  guestPasses: '2 pases',
  coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80',

  isoDate: '2026-07-04T16:00:00',
  weekday: 'Sábado',
  day: '04',
  month: 'Julio',
  year: '2026',
  city: 'Bogotá',

  introMessage:
    'Nos llena el corazón de gran alegría, poder compartir con ustedes este momento tan especial, y tener el honor de invitarte a celebrar con nosotros nuestro matrimonio.',

  welcomeTitle: 'Bienvenidos a la invitación de nuestra boda',

  blessing: 'Con la bendición de Dios y de nuestros padres',
  parentsGroom: ['Juan Pablo Castaño Herrera', 'Ana Sofía Morales Uribe'],
  parentsBride: ['Carlos Andrés Pinzón López', 'Laura Fernanda Cubillos Martínez'],

  ceremony: {
    time: '16:00 h',
    place: 'Capilla de los Santos Apóstoles',
    address: 'Gimnasio Moderno',
    mapsUrl: 'https://maps.google.com',
  },
  reception: {
    time: '18:00 h',
    place: 'Club Los Lagartos Salón Principal',
    address: '',
    mapsUrl: 'https://maps.google.com',
  },

  dressCode: { men: 'Smoking', women: 'Traje de noche' },

  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '16:00 H' },
    { icon: 'cheers', label: 'Cóctel de Bienvenida', time: '18:00 H' },
    { icon: 'dance', label: 'Ingreso al salón principal', time: '19:00 H' },
  ],

  gift: {
    message:
      'Siendo su compañía el mejor de los regalos, estaremos muy agradecidos con su apoyo en esta nueva etapa de nuestra vida juntos.',
    bank: {
      bank: 'Bancolombia',
      account: '498-4432324355',
      ci: '652342346667',
      holder: 'Lorena Marcela R.',
    },
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Enkarta-Regalo-Lorena-Marcos',
  },

  gallery: {
    message:
      'Te invitamos a compartir los momentos especiales de nuestro evento a través de tus fotografías. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasión tan especial.',
    shareUrl: 'https://photos.google.com',
  },

  rsvp: {
    message: 'Es muy importante que nos confirmes tu asistencia',
    whatsappUrl: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
  },
};

export const primiciaSample: PrimiciaContent = {
  groom: 'Jhonna',
  bride: 'Nikol',
  initials: ['J', 'N'],
  guestName: 'Nombre del Invitado',
  guestPasses: '2 pases',
  isoDate: '2027-03-27T16:00:00',
  dateWeekday: 'Sabado',
  dateDay: '27',
  dateMonth: 'Marzo',
  dateYear: '2027',
  dateLine: 'Sabado, 27 de Marzo, 2027',
  coupleMessage: [
    'Nos conocimos entre risas y miradas complices, sin percibir como la amistad se transformo en un amor profundo.',
    'Con la bendicion de nuestras familias y el corazon rebosante de gratitud, nos unimos ante Dios para celebrar este regalo de vida compartida. Gracias a todos por su apoyo y carino en este nuevo capitulo que apenas comienza.',
  ],
  parentsBride: ['Mateo Martinez Paz', 'Santiago Lopez Saenz'],
  parentsGroom: ['Isabela Vargas', 'Catalina Mamani'],
  itinerary: [
    { label: 'Ceremonia Civil y Religiosa', time: '16:00 h', icon: 'church' },
    { label: 'Recepcion Social', time: '18:00 h', icon: 'rings' },
    { label: 'Vals y Brindis', time: '18:30 h', icon: 'cheers' },
    { label: 'Cena', time: '20:00 h', icon: 'dinner' },
    { label: 'A bailar', time: '20:30 h', icon: 'dance' },
    { label: 'Fin de la fiesta', time: '00:00 h', icon: 'cheers' },
  ],
  dressCode: 'Formal',
  locations: [
    {
      name: 'Iglesia La Resurreccion',
      time: '4:00 PM',
      place: 'Iglesia La Resurreccion',
      desc: 'Un espacio sagrado donde uniremos nuestras vidas, rodeados del amor de nuestros seres queridos y la bendicion que marcara el inicio de nuestra nueva etapa juntos.',
      maps: 'https://maps.google.com',
    },
    {
      name: 'Coctel de Bienvenida',
      time: '6:00 PM',
      place: 'La Floresta',
      desc: 'Un espacio perfecto para compartir con nuestros seres queridos y brindar por el amor de los recien casados.',
      maps: 'https://maps.google.com',
    },
    {
      name: 'Recepcion Social',
      time: '7:00 PM',
      place: 'La Floresta',
      desc: 'Una noche llena de alegria, musica y celebracion en honor a nuestra union.',
      maps: 'https://maps.google.com',
    },
  ],
  rsvpMessage:
    'Nos emociona profundamente compartir este momento sagrado con ustedes y hacer de este dia un recuerdo inolvidable. Los esperamos con toda la alegria y energia, con ganas de disfrutar y crear recuerdos que permanezcan en nuestros corazones. Su compania iluminara nuestra celebracion.',
  giftMessage:
    'Ya tenemos pensado el Ferrari, la mansion y el velero. Ahora lo unico que nos falta es el dinero.',
  giftAccount: {
    no: '191-0848715-0-50',
    cci: '002-1911084087157',
  },
  whatsapp: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
  photoUrl: '/catalog/primicia.jpg',
};

export const passportSample: PassportContent = {
  groom: 'Robert',
  bride: 'Isabella',
  initials: ['R', 'I'],
  guestName: 'Invitado',
  guestPasses: '2 pases',
  coverImage: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=900&q=80',
  isoDate: '2027-05-15T16:00:00',
  announce: 'Nos casamos',
  verse:
    'Uno solo puede ser vencido, pero dos pueden resistir. La cuerda de tres hilos no se rompe facilmente: Dios, esposo y esposa.',
  verseRef: '(Eclesiastes 4:12)',
  callout: 'Prepara tus maletas y acompananos en esta aventura.',
  callout2: 'Te unes?',
  parentsBride: ['Mateo Martinez Paz', 'Marc Lopez Saenz'],
  parentsGroom: ['Isabela Vargas', 'Catalina Flores'],
  escala: {
    place: 'Centro de eventos Notre Dame',
    time: '15:00 h',
    maps: 'https://maps.google.com',
  },
  dress: {
    note: '(Etiqueta rigurosa)',
    women: ['Vestido largo', 'Evitar tonos similares al blanco'],
    men: ['Con traje'],
  },
  itinerary: [
    { label: 'Ceremonia Civil y Religiosa', time: '16:00 h', icon: 'church' },
    { label: 'Recepcion Social', time: '18:00 h', icon: 'rings' },
    { label: 'Vals y Brindis', time: '18:30 h', icon: 'cheers' },
    { label: 'Cena', time: '20:00 h', icon: 'dinner' },
    { label: 'A bailar', time: '20:30 h', icon: 'dance' },
    { label: 'Fin de la fiesta', time: '00:00 h', icon: 'cheers' },
  ],
  noKids:
    'Amamos a sus ninos y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitacion es solo para adultos.',
  galleryMsg:
    'Te invitamos a compartir los momentos especiales de nuestro evento a traves de tus fotografias. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasion tan especial.',
  galleryUrl: 'https://photos.google.com',
  whatsapp: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
};

const PARADISE_PHOTO = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80';
const PARADISE_PHOTO2 = 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=900&q=80';

export const paradiseSample: ParadiseContent = {
  groom: 'ELVIS',
  bride: 'LAURA',
  brideLast: 'Ruggeri',
  groomLast: 'Garrido',
  guestName: 'Daniel Martinez',
  guestPasses: '2 pases',

  isoDate: '2026-03-29T16:00:00',
  dateLabel: '29 / 03 / 26',
  city: 'SANTA CRUZ',

  coverImage: PARADISE_PHOTO,
  secondaryImage: PARADISE_PHOTO2,
  footerImage: PARADISE_PHOTO,

  introMessage:
    'Nuestro gran día se aproxima y nos encantaría que formaras parte de él. Nos hace mucha ilusión invitarlos a nuestra boda.',
  blessing: 'Con la bendición de Dios y guiados por el amor de nuestros padres:',
  verse: 'Dos son mejor que uno, porque obtienen más fruto de su esfuerzo. Si caen, el uno levanta al otro.',
  verseRef: 'Eclesiastés 4:9-10',

  parentsBride: ['Alicia Mariluz Roca', 'Jorge Pachas Avalos'],
  parentsGroom: ['Liduzmila Damián Acosta', 'José Zeña Santamaría'],

  ceremonyReligious: { time: '18:00 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  ceremonyCivil: { time: '20:00 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  dressCode: 'Formal',

  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '16:00 h' },
    { icon: 'gift', label: 'Recepción Social', time: '18:00 h' },
    { icon: 'cheers', label: 'Vals y Brindis', time: '18:30 h' },
    { icon: 'dinner', label: 'Cena', time: '20:00 h' },
    { icon: 'dance', label: 'A bailar', time: '20:30 h' },
    { icon: 'rings', label: 'Fin de la fiesta', time: '00:00 h' },
  ],

  giftMessage:
    'Su presencia y sus buenos deseos son nuestro mejor regalo. Si desean hacernos llegar algún presente estaremos muy agradecidos.',
  giftRegistryUrl: 'https://www.falabella.com',
  giftRegistryLabel: 'falabella.',
  giftQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Enkarta-Paradise-Regalo',

  lodgingTitle: 'Sugerencia de hospedaje',
  lodging: [
    { name: 'Madisson Inn Hotel & Luxury Suites', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80' },
  ],

  noKids:
    'Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos.',
  galleryMsg:
    'Te invitamos a capturar y compartir los momentos especiales de nuestro evento, para que juntos podamos revivir esta ocasión tan especial.',
  galleryUrl: 'https://photos.google.com',

  rsvpMessage:
    'Es muy importante para nosotros confirmar tu asistencia. Por favor, confirma tu presencia antes del 01 de Marzo para poder organizar todo adecuadamente.',
  rsvpDeadline: '01 de Marzo',
  rsvpClosing: 'Creemos que mereces una noche alegre y divertida es por eso que esperamos contar con tu presencia',
  whatsapp: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
};

const OBS_PHOTO = 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1000&q=80';
const OBS_PHOTO2 = 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1000&q=80';

export const obsidianaSample: ObsidianaContent = {
  bride: 'María',
  groom: 'Rubén',
  guestName: 'Daniel Marth',
  guestPasses: '2 pases',

  isoDate: '2025-08-30T20:00:00',
  dateWeekday: 'Sábado',
  dateDay: '30',
  dateMonth: 'Agosto',
  datePlace: 'Italacume · 2025',

  coverImage: OBS_PHOTO,
  aboutImage: OBS_PHOTO2,
  footerImage: OBS_PHOTO2,

  introMessage: 'Así que, no son ya más dos, sino una sola carne; por tanto, lo que Dios juntó, no lo separe el hombre. / Mateo 19:6',
  blessing: 'Con la bendición de Dios y nuestros padres',
  parentsBride: ['Mateo Emiliano Rojas Velasco', 'Camila Isabela Fernández Rivas'],
  parentsGroom: ['Lucas Adrián Méndez Arce', 'Valeria Sofía Escobar León'],

  ceremonyReligious: { time: '10:00 am', place: 'Catedral Metropolitana', maps: 'https://maps.google.com' },
  reception: { time: '15:00 pm', place: 'Salón de eventos Los Jardines', maps: 'https://maps.google.com' },
  dressCode: 'Formal',

  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '20:00 h' },
    { icon: 'cheers', label: 'Recepción Social', time: '21:30 h' },
    { icon: 'dinner', label: 'Cena', time: '22:00 h' },
    { icon: 'gift', label: 'Torta', time: '23:00 h' },
    { icon: 'dance', label: 'Lanzamiento del ramo', time: '23:30 h' },
    { icon: 'rings', label: 'Fin de la fiesta', time: '00:00 h' },
  ],

  lodgingTitle: 'Sugerencia de hospedaje',
  lodging: [{ name: 'Copacabana', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=80' }],

  giftMessage: 'Su presencia es nuestro mejor regalo. Si desean tener un detalle con nosotros, lo agradeceremos con todo el corazón.',
  giftEnvelopes: 'Lluvia de sobres',
  giftQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Enkarta-Obsidiana-Regalo',

  thanksTitle: 'Agradecimiento',
  thanksMessage:
    'A Dios por ser pieza fundamental en nuestro matrimonio, a nuestros padres y hermanos por ser nuestro apoyo y soporte, a nuestros padrinos por el compromiso y apoyo incondicional:',
  padrinos: [
    { role: 'Padrinos de Civil', names: ['Gabriel Andrés Salazar Orellana', 'Natalia Fernanda Ruiz Aguilar'] },
    { role: 'Padrinos de Religión', names: ['Diego Sebastián Vargas Céspedes', 'Emma Victoria Soto Maldonado'] },
    { role: 'Padrinos de Torta', names: ['Bruno Alejandro Gutiérrez Peña', 'Isabella Renata Flores Herrera'] },
  ],

  galleryMsg:
    'Te invitamos a compartir los momentos especiales de nuestro evento a través de tus fotografías. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasión tan especial.',
  galleryUrl: 'https://photos.google.com',

  rsvpClosing: 'Creemos que mereces una noche alegre y divertida es por eso que esperamos contar con tu presencia',
  rsvpMessage: 'Es muy importante que nos confirmes tu asistencia.',
  whatsapp: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
  galleryImages: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&q=80',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=500&q=80',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&q=80',
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&q=80',
    'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=500&q=80',
    'https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=500&q=80',
  ],
};

const DV_PHOTO = 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=900&q=80';
const dvGallery = [
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&q=80',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=500&q=80',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&q=80',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&q=80',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&q=80',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=500&q=80',
  'https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=500&q=80',
];

export const dolceVitaSample: DolceVitaContent = {
  groom: 'Ricardo',
  bride: 'Nicole',
  guestName: 'José Martinelli',
  guestPasses: '2 pases',

  isoDate: '2026-09-04T13:00:00',
  dateCity: 'La Paz',
  dateWeekday: 'Domingo',
  dateDay: '04',
  dateMonth: 'Septiembre',
  dateYear: '2026',

  coverImage: DV_PHOTO,
  introMessage: 'Casarse es de locos, pero es que nos queremos con locura. Por eso, lo vamos a celebrar con una fiesta y queremos que nos acompañes.',
  blessing: 'Con la bendición de Dios y de nuestros padres',
  parentsGroom: ['Mateo Martinez Paz', 'Santiago Lopez Saenz'],
  parentsBride: ['Isabela Vargas', 'Catalina Mamani'],
  padrinos: ['José Ballivian', 'Marcos Savedra Zaenz'],

  ceremonyReligious: { time: '13:00 h', place: 'Parroquia la Recoleta', maps: 'https://maps.google.com' },
  ceremonyCivil: { time: '14:00 h', place: 'Centro de eventos Notre Dame', maps: 'https://maps.google.com' },
  reception: { time: '14:00 h', place: 'Centro de eventos Notre Dame', maps: 'https://maps.google.com' },
  dressCode: 'Traje Formal',

  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '16:00 h' },
    { icon: 'rings', label: 'Ceremonia Civil', time: '14:00 h' },
    { icon: 'cheers', label: 'Fiesta', time: '15:00 h' },
    { icon: 'dinner', label: 'Cena', time: '16:30 h' },
    { icon: 'dance', label: 'Baile de Novios', time: '17:00 h' },
    { icon: 'gift', label: 'Torta', time: '20:30 h' },
  ],
  galleryImages: dvGallery,

  lodgingTitle: 'Sugerencia de hospedaje',
  lodging: [{
    name: 'El Paraíso Hotel',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&q=80',
    desc: 'El Paraíso Hotel está en Samaipata, a 11 km de Fuerte de Samaipata, y dispone de alojamiento con piscina al aire libre, parking privado gratis, jardín y salón de uso común.',
  }],
  lodgingContact: 'Jazmin Smith',

  galleryMsg: 'Te invitamos a compartir los momentos especiales de nuestro evento a través de tus fotografías. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasión tan especial.',
  galleryUrl: 'https://photos.google.com',
  noKids: 'Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos',

  giftMessage: 'Su presencia y sus buenos deseos son nuestro mejor regalo. Si desean hacernos llegar algún presente estaremos muy agradecidos.',
  giftThanks: 'Gracias por tu muestra de cariño',
  giftCash: 'Efectivo en sobres (Habrá un buzón)',
  giftBank: { bank: 'Cuenta bancaria BCP', account: '2015151233123330', holder: 'Jose Mattiel' },
  giftQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Enkarta-DolceVita-Regalo',
  giftOther: 'Obsequios tradicionales (Escríbenos)',

  rsvpClosing: 'No olvides confirmar tu asistencia',
  whatsapp: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
};

const GZ_COVER = 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80';
const gzGallery = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&q=80',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&q=80',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=500&q=80',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&q=80',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&q=80',
];

export const graziaSample: GraziaContent = {
  groom: 'Lorenzo',
  bride: 'Isabella',
  groomName: 'Lorenzo Bianchi',
  brideName: 'Isabella Moretti',
  guestName: 'José Martinelli',
  guestPasses: '2 pases',

  isoDate: '2025-10-19T16:00:00',
  dateText: '19 de Octubre 2025',
  timeText: '16:00 hrs.',
  coverLabel: 'La boda de',

  coverImage: GZ_COVER,
  groomPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  bridePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',

  saveDateMsg: 'Después de mucho tiempo caminando juntos hemos decidido unir nuestras vidas en matrimonio, por lo que nos complace que sean partícipes de esta unión …',
  parentsGroom: ['Alessandro Bianchi', 'Vittoria Rossi'],
  parentsBride: ['Giovanni Moretti', 'Eleonora Ricci'],

  ceremonyReligious: { date: '19 abril 2025', time: '16:00 pm', place: 'Salón de Eventos Notre Dame', maps: 'https://maps.google.com' },
  reception: { date: '19 abril 2025', time: '16:00 pm', place: 'Salón de Eventos Notre Dame', maps: 'https://maps.google.com' },

  itinerary: [
    { icon: 'rings', label: 'Concentración', time: '10:00 h' },
    { icon: 'church', label: 'Discurso Bíblico', time: '10:30 h' },
    { icon: 'camera', label: 'Recepción Finca San Lorenzo', time: '16:00 h' },
    { icon: 'dance', label: 'Ingreso de los Novios', time: '17:00 h' },
    { icon: 'dinner', label: 'Banquete', time: '18:00 h' },
    { icon: 'cheers', label: 'Fiesta', time: '19:30 h' },
    { icon: 'gift', label: 'Corte de Torta', time: '11:30 h' },
    { icon: 'rings', label: 'Fin de la Fiesta', time: '00:00 h' },
  ],

  lodgingTitle: 'Sugerencia de hospedaje',
  lodging: [{
    name: 'El Paraíso Hotel',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&q=80',
    desc: 'El Paraíso Hotel está en Samaipata, a 11 km de Fuerte de Samaipata, y dispone de alojamiento con piscina al aire libre, parking privado gratis, jardín y salón de uso común.',
  }],
  lodgingContact: 'Jazmin Smith',

  giftMessage: 'El mejor regalo que nos das es tu presencia, pero si quieres tener un detalle con nosotros agradeceríamos tu ayuda para nuestra luna de miel.',
  giftAccounts: [
    { name: 'Lorenzo Bianchi', account: 'CTA. 1234567123' },
    { name: 'Isabella Moretti', account: 'CTA. 765430123' },
  ],
  giftQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Enkarta-Grazia-Regalo',

  storyTitle: 'Nuestra Historia',
  storyMessage: 'Nuestros caminos se unieron de una forma inesperada, y desde entonces hemos recorrido juntos un sinfín de momentos especiales. Entre risas, complicidad y sueños compartidos, nuestro amor ha crecido y hoy queremos dar un nuevo paso. Nos encantaría que fueras parte de esta gran aventura: ¡Nuestra boda!',
  galleryImages: gzGallery,

  noKids: 'Amamos a nuestros niños y queremos que disfrutes sin preocupaciones, es por eso, que la invitación es solo para adultos.',
  dressCode: 'Elegante',
  dressCodeTitle: 'Código de vestimenta',

  galleryMsg: 'Te invitamos a compartir los momentos especiales de nuestro evento a través de tus fotografías. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasión tan especial.',
  galleryUrl: 'https://photos.google.com',
  rsvpMessage: 'Es muy importante para nosotros confirmar tu asistencia. Por favor, confirma tu presencia antes del 05 de Julio para poder organizar todo adecuadamente.',
  whatsapp: 'https://wa.me/59162449491?text=Hola%20Enkarta%2C%20vi%20la%20invitaci%C3%B3n%20de%20muestra%20y%20quiero%20una%20para%20mi%20evento%20%F0%9F%8E%89',
};

// Napoly reutiliza el tipo DolceVitaContent (misma estructura)
export const napolySample: DolceVitaContent = {
  ...dolceVitaSample,
  groom: 'Nestor',
  bride: 'Sandra',
  dateCity: 'SCZ',
  dateWeekday: 'Sábado',
  dateDay: '07',
  dateMonth: 'Septiembre',
  dateYear: '2026',
  isoDate: '2026-09-07T14:00:00',
  guestName: 'Jose y Maria',
  guestPasses: 'Sin pases',
  coverImage: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1100&q=80',
  introMessage: 'Tenemos el agrado de compartir el día más especial de nuestras vidas, en el cual ante Dios y ustedes comenzamos un camino nuevo unidos en matrimonio.',
  parentsGroom: ['Jose Nelson Ruiz Cabrera', 'Cecilia Elva Manuel Aguirre'],
  parentsBride: ['Roberto Eduardo Gil Suarez', 'Romy Céspedes Arandia'],
  padrinos: [],
  ceremonyReligious: { time: '14:00 h', place: 'Catedral Los Angeles', maps: 'https://maps.google.com' },
  ceremonyCivil: undefined,
  reception: { time: '17:00 h', place: 'Centro de eventos Notre Dame', maps: 'https://maps.google.com' },
  dressCode: 'Formal',
  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '04:40 PM' },
    { icon: 'camera', label: 'Recepción Social', time: '06:30 PM' },
    { icon: 'cheers', label: 'Brindis y Vals', time: '07:30 PM' },
    { icon: 'dinner', label: 'Cena', time: '20:30 PM' },
    { icon: 'dance', label: 'Fiesta', time: '21:15 PM' },
    { icon: 'gift', label: 'Bouquet', time: '12:15 AM' },
  ],
};

// Allegria reutiliza el tipo DolceVitaContent (misma estructura)
export const allegriaSample: DolceVitaContent = {
  ...dolceVitaSample,
  groom: 'Vincent',
  bride: 'Maria',
  dateCity: 'TRJ',
  dateWeekday: 'Sábado',
  dateDay: '17',
  dateMonth: 'Enero',
  dateYear: '2026',
  isoDate: '2026-01-17T16:30:00',
  guestName: 'José Martinelli',
  guestPasses: '2 pases',
  coverImage: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=1100&q=80',
  introMessage: 'Deseamos celebrar el amor y la unión con la bendición de Dios, para unirnos y juntos recorrer un solo camino. Tenemos el honor de invitarlos a nuestra boda.',
  parentsGroom: [],
  parentsBride: [],
  padrinos: [],
  ceremonyReligious: { time: '16:30 h', place: 'Hacienda Casa Magna', maps: 'https://maps.google.com' },
  ceremonyCivil: undefined,
  reception: { time: '16:30 h', place: 'Hacienda Casa Magna', maps: 'https://maps.google.com' },
  dressCode: 'Elegante, inspirado en el viñedo. Piensa en algo sencillo, fresco y con lo que te sientas tú mismo. No hace falta estrenar: tu mejor look está en tu clóset o en el de un buen amigo. Lo más importante es que vengas cómodo, elegante y feliz.',
  itinerary: [
    { icon: 'rings', label: 'Ceremonia Civil', time: '16:30 h' },
    { icon: 'cheers', label: 'Brindis', time: '17:30 h' },
    { icon: 'dinner', label: 'Cena', time: '19:00 h' },
    { icon: 'dance', label: 'Fiesta', time: '20:30 h' },
  ],
  giftMessage: 'Su presencia y sus buenos deseos son un regalo invaluable para nuestra historia. Si consideran realizar un presente les damos nuestra mejor opción:',
  giftThanks: 'Gracias por tu muestra de cariño',
  noKids: 'Aunque amamos a los más pequeños y forman parte importante de nuestras vidas, deseamos que esta celebración sea solo para adultos. Agradecemos su comprensión y cariño.',
};

// Rose Gold reutiliza el tipo DolceVitaContent (misma estructura)
export const roseGoldSample: DolceVitaContent = {
  ...dolceVitaSample,
  groom: 'Pablo',
  bride: 'Lucia',
  dateCity: 'CBBA',
  dateWeekday: 'Sábado',
  dateDay: '29',
  dateMonth: 'Noviembre',
  dateYear: '2026',
  isoDate: '2026-11-29T15:00:00',
  guestName: 'Jose y Maria',
  guestPasses: 'Sin pases',
  coverImage: 'https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=1100&q=80',
  introMessage: '¡Viajamos desde otro continente para celebrar la boda con todos vosotros! No faltes, ha sido un largo viaje.',
  parentsBride: ['Sr. Isidro Figueredo Huarachi', 'Sra. Adela Fernández Herrera'],
  parentsGroom: ['Sr. Lucio Aduviri Poma', 'Sra. Elsa Rojas Choque'],
  padrinos: [],
  ceremonyReligious: { time: '15:00 h', place: 'Iglesia de Nuestra Señora de la Merced (Iglesia Sarco)', maps: 'https://maps.google.com' },
  ceremonyCivil: undefined,
  reception: { time: '16:30 h', place: 'La Terraza', maps: 'https://maps.google.com' },
  dressCode: 'Formal',
  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '15:00 h' },
    { icon: 'cheers', label: 'Recepción y mesa de Charcutería', time: '16:30 h' },
    { icon: 'dance', label: 'Entrada de los recién casados', time: '17:10 h' },
    { icon: 'dinner', label: 'Brindis y Música', time: '17:30 h' },
    { icon: 'gift', label: 'Cena', time: '19:30 h' },
    { icon: 'rings', label: 'Despedida de los recién casados', time: '01:15 h' },
  ],
  giftMessage: 'Tu presencia es el mejor regalo para compartir este momento único. Ya tenemos nuestra casita completa, nuestro ferrari y el yate! solo nos falta pagarlo. Como sugerencia de regalo te dejamos el siguiente QR.',
  thanksMessage: 'A Dios por ser pilar fundamental en nuestras vidas, a nuestros padres y hermanos por ser nuestro apoyo y soporte, a nuestros padrinos, testigos, amigos y familia por su apoyo incondicional.',
};

// Euforia reutiliza el tipo DolceVitaContent (misma estructura)
export const euforiaSample: DolceVitaContent = {
  ...dolceVitaSample,
  groom: 'Andres',
  bride: 'Margot',
  dateCity: 'La Paz',
  dateWeekday: 'Sábado',
  dateDay: '09',
  dateMonth: 'Noviembre',
  dateYear: '2024',
  isoDate: '2024-11-09T13:30:00',
  guestName: 'Eduardo Villalba',
  guestPasses: '2 pases',
  coverImage: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1100&q=80',
  introMessage: 'Todo lo hizo hermoso en su tiempo y ha puesto eternidad en el corazón de ellos. — Eclesiastés 3:11',
  parentsGroom: ['Jose Nelson Ruiz Cabrera', 'Cecilia Elva Manuel Aguirre'],
  parentsBride: ['Roberto Eduardo Gil Suarez', 'Romy Céspedes Arandia'],
  padrinos: [],
  ceremonyReligious: { time: '14:30 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  ceremonyCivil: undefined,
  reception: { time: '14:30 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  dressCode: 'Formal',
  itinerary: [
    { icon: 'church', label: 'Ceremonia', time: '15:00 h' },
    { icon: 'dance', label: 'Baile de los Novios', time: '17:30 h' },
    { icon: 'cheers', label: 'Brindis', time: '18:30 h' },
    { icon: 'dinner', label: 'Cena', time: '19:30 h' },
    { icon: 'camera', label: 'Fiesta', time: '20:30 h' },
    { icon: 'gift', label: 'Torta', time: '22:00 h' },
    { icon: 'rings', label: 'Despedida de los Novios', time: '23:30 h' },
  ],
};

// Carmesí reutiliza el tipo DolceVitaContent (misma estructura)
export const carmesiSample: DolceVitaContent = {
  ...dolceVitaSample,
  groom: 'José',
  bride: 'Nikol',
  dateCity: 'CBBA',
  dateWeekday: 'Sábado',
  dateDay: '06',
  dateMonth: 'Agosto',
  dateYear: '2025',
  isoDate: '2025-08-06T14:30:00',
  guestName: 'Eduardo Villalba',
  coverImage: 'https://images.unsplash.com/photo-1606490194859-07c18c9f0968?w=1100&q=80',
  introMessage: 'Más valen dos que uno, porque obtienen más fruto de su esfuerzo. Si caen, el uno levanta al otro. ¡Ay del que cae y no tiene quien lo levante! — Eclesiastés 4:9-10',
  parentsGroom: ['Martín García', 'Sofía López'],
  parentsBride: ['Alejandro Pérez', 'Daniela Gómez'],
  padrinos: [],
  ceremonyReligious: { time: '14:30 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  ceremonyCivil: { time: '16:30 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  reception: { time: '16:45 h', place: 'Centro de Eventos Notre Dame', maps: 'https://maps.google.com' },
  dressCode: 'Formal',
  itinerary: [
    { icon: 'church', label: 'Ceremonia Religiosa', time: '14:30 h' },
    { icon: 'rings', label: 'Ceremonia Civil', time: '16:30 h' },
    { icon: 'camera', label: 'Recepción Social', time: '16:45 h' },
    { icon: 'dance', label: 'Entrada de Novios', time: '17:00 h' },
    { icon: 'cheers', label: 'Baile de Novios', time: '17:40 h' },
    { icon: 'dinner', label: 'Cena', time: '18:00 h' },
  ],
  giftCash: 'Lluvia de sobres',
  giftBank: { bank: 'Cuenta bancaria BCP', account: '2015151233123330', holder: 'Jose Mattiel' },
  giftOther: 'Obsequios tradicionales (Escríbenos)',
};
