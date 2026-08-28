import { STARTER_DESIGNS } from './enkarta-collections';
import { invitationStarter } from './template-starters';

/** The same source document feeds the catalogue, sample and new editor. */
export function collectionCatalog() {
  return STARTER_DESIGNS.map(identity => {
    const starter = invitationStarter(identity.key);
    const [n1, n2 = ''] = starter.names.split(/\s*&\s*|\s+y\s+/i);
    const theme = starter.builder_config.theme;
    return {
      ...identity, image: starter.cover_image_url || identity.image,
      img: starter.cover_image_url || identity.image, n1, n2,
      names: starter.names, date: starter.event_date,
      dateStr: starter.event_date ? new Date(`${starter.event_date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '',
      bg: theme?.bg || '#FAF7F2', text: theme?.text || '#302B24',
      name: identity.name, desc: identity.description,
      demoPath: `/muestra/${identity.demoKey ?? identity.key}`,
    };
  });
}
