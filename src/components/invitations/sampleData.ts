import { InvitationContent } from './types';

// Sample content used by the preview route. Mirrors the Invitali demo data
// so we can match the reference designs 1:1 while building.
export const azureSample: InvitationContent = {
  groom: 'Lorena',
  bride: 'Marcos',
  initials: ['L', 'M'],
  guestName: 'Daniel Martinez',
  guestPasses: '2 pases',

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
    whatsappUrl: 'https://wa.me/0000000000?text=Confirmo%20mi%20asistencia%20a%20la%20boda',
  },
};
