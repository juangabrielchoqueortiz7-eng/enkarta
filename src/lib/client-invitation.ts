import type { InvitationParsed } from './types';
import { publicAdditionalServices } from './additional-services';

/** Nunca serializar credenciales de operación o revisión en componentes del cliente. */
export function clientInvitation(invitation: InvitationParsed, hideGuestMetadata = false): InvitationParsed {
  const config = { ...invitation.config, additionalServices: publicAdditionalServices(invitation.config?.additionalServices) };
  delete config.qualityControl;
  if (hideGuestMetadata) { delete config.guestMeta; delete config.activeGuest; }
  return { ...invitation, phone_raw: null, builder_config: null, host_email: null, host_password_hash: null, review_email: null, review_password_hash: null, door_email: null, door_password_hash: null, config };
}
