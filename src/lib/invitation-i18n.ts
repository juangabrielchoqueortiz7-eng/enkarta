import type { BuilderConfig, InvitationLocale } from './types';

export interface InvitationCopy {
  confirmation: string; confirmAttendance: string; loading: string; unavailable: string; queryFailed: string;
  offline: string; nameRequired: string; passesBetween: (max: number) => string; saveFailed: string; uncertain: string;
  confirmed: string; thanks: string; placesReserved: (count: number) => string; cannotAttend: string; editAnswer: string;
  closed: string; yourName: string; attendingQuestion: string; yes: string; no: string; people: string;
  hostMessage: string; usedPasses: string; saving: string; retrySame: string; saveChanges: string; cancelEdit: string;
  refresh: string; demo: string; browserNote: string; preparationTitle: string; preparationText: string;
  pausedTitle: string; pausedText: string; finishedTitle: string; finishedText: string; expiredText: string;
  enter: string; skip: string; footerQuestion: string; contactUs: string; preconfirmTitle: string;
  preconfirmName: string; preconfirmInterest: string; interested: string; maybe: string; unavailableOption: string;
  preconfirmGuests: string; preconfirmMessage: string; preconfirmButton: string; preconfirmSaved: string; invitationButton: string;
}

const es: InvitationCopy = {
  confirmation: 'Confirmación', confirmAttendance: 'Confirmar asistencia', loading: 'Consultando tu confirmación…', unavailable: 'La confirmación no está disponible en esta vista.', queryFailed: 'No pudimos consultar tu respuesta.',
  offline: 'Sin conexión. No se enviaron cambios.', nameRequired: 'Escribe tu nombre para confirmar.', passesBetween: max => `Elige entre 1 y ${max} personas.`, saveFailed: 'No se pudo guardar tu respuesta.', uncertain: 'No pudimos comprobar el resultado. Reintenta sin cambiar los datos: no se duplicará la respuesta.',
  confirmed: '¡Asistencia confirmada!', thanks: 'Gracias por avisarnos', placesReserved: count => `${count} ${count === 1 ? 'lugar reservado' : 'lugares reservados'}.`, cannotAttend: 'Lamentamos que no puedas acompañarnos.', editAnswer: 'Modificar mi respuesta',
  closed: 'El período de confirmación ya cerró. Contacta a los anfitriones.', yourName: 'Tu nombre', attendingQuestion: '¿Asistirás?', yes: 'Sí, asistiré', no: 'No podré asistir', people: 'N.º de personas', hostMessage: 'Mensaje para los anfitriones (opcional)',
  usedPasses: 'Ya se utilizaron pases. Puedes corregir tus datos, pero no cancelar ni reducir esos cupos.', saving: 'Guardando…', retrySame: 'Reintentar la misma respuesta', saveChanges: 'Guardar cambios', cancelEdit: 'Cancelar edición', refresh: 'Actualizar mi respuesta', demo: 'Modo de muestra: no se envía ninguna respuesta.', browserNote: 'Podrás modificar esta respuesta desde este navegador hasta la fecha límite. Para otra familia, utiliza otro navegador o solicita un enlace personal.',
  preparationTitle: 'Invitación en preparación', preparationText: 'Esta invitación aún no está disponible. Pronto estará lista para ti.', pausedTitle: 'Invitación temporalmente fuera de línea', pausedText: 'El anfitrión ha pausado esta invitación. Vuelve a intentarlo más adelante.', finishedTitle: 'Evento finalizado', finishedText: 'Gracias por acompañarnos. Esta invitación ya no está disponible.', expiredText: 'Gracias por acompañarnos. El acceso a esta invitación ya expiró.', enter: 'Ingresar a mi invitación', skip: 'Omitir animación', footerQuestion: '¿Deseas una invitación para tu evento?', contactUs: 'Contáctanos',
  preconfirmTitle: 'Reserva la fecha', preconfirmName: 'Tu nombre', preconfirmInterest: '¿Crees que podrás acompañarnos?', interested: 'Sí, me encantaría', maybe: 'Aún no estoy seguro/a', unavailableOption: 'No podré acompañarlos', preconfirmGuests: 'Personas estimadas', preconfirmMessage: 'Mensaje (opcional)', preconfirmButton: 'Guardar mi preconfirmación', preconfirmSaved: '¡Gracias! Guardamos tu respuesta previa.', invitationButton: 'Ver invitación completa',
};

const en: InvitationCopy = { ...es,
  confirmation: 'RSVP', confirmAttendance: 'Confirm attendance', loading: 'Loading your response…', unavailable: 'RSVP is not available in this view.', queryFailed: 'We could not load your response.', offline: 'You are offline. No changes were sent.', nameRequired: 'Enter your name to continue.', passesBetween: max => `Choose between 1 and ${max} guests.`, saveFailed: 'We could not save your response.', uncertain: 'We could not verify the result. Retry without changing the details; it will not create a duplicate.', confirmed: 'Attendance confirmed!', thanks: 'Thank you for letting us know', placesReserved: count => `${count} ${count === 1 ? 'place reserved' : 'places reserved'}.`, cannotAttend: 'We are sorry you cannot join us.', editAnswer: 'Edit my response', closed: 'RSVP is now closed. Please contact the hosts.', yourName: 'Your name', attendingQuestion: 'Will you attend?', yes: 'Yes, I will attend', no: 'I will not be able to attend', people: 'Number of guests', hostMessage: 'Message for the hosts (optional)', usedPasses: 'Some passes have already been used. You may correct your details, but cannot cancel or reduce those places.', saving: 'Saving…', retrySame: 'Retry the same response', saveChanges: 'Save changes', cancelEdit: 'Cancel editing', refresh: 'Refresh my response', demo: 'Preview mode: no response will be sent.', browserNote: 'You can update this response from this browser until the deadline. Use another browser or request a personal link for another household.', preparationTitle: 'Invitation in progress', preparationText: 'This invitation is not available yet. It will be ready soon.', pausedTitle: 'Invitation temporarily offline', pausedText: 'The hosts have paused this invitation. Please try again later.', finishedTitle: 'Event finished', finishedText: 'Thank you for joining us. This invitation is no longer available.', expiredText: 'Thank you for joining us. Access to this invitation has expired.', enter: 'Open my invitation', skip: 'Skip animation', footerQuestion: 'Would you like an invitation for your event?', contactUs: 'Contact us', preconfirmTitle: 'Save the Date', preconfirmName: 'Your name', preconfirmInterest: 'Do you think you can join us?', interested: 'Yes, I would love to', maybe: 'I am not sure yet', unavailableOption: 'I will not be able to attend', preconfirmGuests: 'Estimated guests', preconfirmMessage: 'Message (optional)', preconfirmButton: 'Save my early response', preconfirmSaved: 'Thank you! Your early response was saved.', invitationButton: 'View full invitation',
};

const pt: InvitationCopy = { ...es,
  confirmation: 'Confirmação', confirmAttendance: 'Confirmar presença', loading: 'Consultando sua resposta…', yourName: 'Seu nome', attendingQuestion: 'Você irá?', yes: 'Sim, estarei presente', no: 'Não poderei ir', people: 'Número de pessoas', hostMessage: 'Mensagem para os anfitriões (opcional)', saving: 'Salvando…', saveChanges: 'Salvar alterações', editAnswer: 'Alterar minha resposta', refresh: 'Atualizar minha resposta', enter: 'Abrir meu convite', skip: 'Pular animação', footerQuestion: 'Deseja um convite para o seu evento?', contactUs: 'Fale conosco', preconfirmTitle: 'Reserve a data', preconfirmName: 'Seu nome', preconfirmInterest: 'Você acha que poderá estar conosco?', interested: 'Sim, adoraria', maybe: 'Ainda não tenho certeza', unavailableOption: 'Não poderei comparecer', preconfirmGuests: 'Pessoas estimadas', preconfirmMessage: 'Mensagem (opcional)', preconfirmButton: 'Salvar minha pré-confirmação', preconfirmSaved: 'Obrigado! Salvamos sua resposta prévia.', invitationButton: 'Ver convite completo',
};

const fr: InvitationCopy = { ...es,
  confirmation: 'Confirmation', confirmAttendance: 'Confirmer ma présence', loading: 'Chargement de votre réponse…', yourName: 'Votre nom', attendingQuestion: 'Serez-vous présent(e) ?', yes: 'Oui, je serai présent(e)', no: 'Je ne pourrai pas venir', people: 'Nombre de personnes', hostMessage: 'Message pour les hôtes (facultatif)', saving: 'Enregistrement…', saveChanges: 'Enregistrer', editAnswer: 'Modifier ma réponse', refresh: 'Actualiser ma réponse', enter: 'Ouvrir mon invitation', skip: "Passer l’animation", footerQuestion: 'Vous souhaitez une invitation pour votre événement ?', contactUs: 'Contactez-nous', preconfirmTitle: 'Réservez la date', preconfirmName: 'Votre nom', preconfirmInterest: 'Pensez-vous pouvoir être des nôtres ?', interested: 'Oui, avec plaisir', maybe: 'Je ne suis pas encore sûr(e)', unavailableOption: 'Je ne pourrai pas venir', preconfirmGuests: 'Nombre estimé de personnes', preconfirmMessage: 'Message (facultatif)', preconfirmButton: 'Enregistrer ma pré-confirmation', preconfirmSaved: 'Merci ! Votre réponse provisoire est enregistrée.', invitationButton: "Voir l’invitation complète",
};

export const invitationCopy = (locale: InvitationLocale = 'es-BO'): InvitationCopy => locale === 'en-US' ? en : locale === 'pt-BR' ? pt : locale === 'fr-FR' ? fr : es;

export function activeInvitationLocale(config?: BuilderConfig | null): InvitationLocale {
  const language = config?.additionalServices?.language;
  return language?.status === 'ready' && language.targetLocale ? language.targetLocale : 'es-BO';
}

export function formatInvitationDate(value: string | null | undefined, locale: InvitationLocale) {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}
