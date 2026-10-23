import importedOriginals from './invitali-local-assets.json';
/** Shared original asset registry. Match full URLs, never ambiguous filenames. */
export const ORIGINAL_INVITATION_ASSETS: Record<string,string> = {
  ...importedOriginals,
  'https://invitali.com/wp-content/uploads/2024/05/Animation-1715978306775.json': '/lottie/boda/annie-corazones-original.json',
  'https://invitali.com/wp-content/uploads/2025/05/10-no-ninos.json': '/lottie/boda/invitali-sin-ninos-original.json',
};
export function originalInvitationAsset(source:string){return ORIGINAL_INVITATION_ASSETS[source] ?? source;}

// These exact originals load in the browser. Keep their full source URL until
// an original file is imported; then add its local path to the map above.
export const REMOTE_ORIGINAL_ICONS = [
 ['biblia','Biblia','2025/05/biblia.json'],
 ['vestimenta-playera','Vestimenta playera','2025/05/vestimenta-2.json'],
 ['hotel','Hotel','2025/05/hotel.json'],
 ['mano','Deslizar mano','2025/05/Deslizar-mano.json'],
 ['mesa','Mesa','2025/05/mesa4.json'],
 ['carro-nuevo','Desplazamiento','2025/09/carro-nuevo.json'],
 ['tiempo','Puntualidad','2026/04/tiempo.json'],
 ['sobres','Lluvia de sobres','2025/05/33-lluvia-de-sobres.json'],
 ['autobus','Transporte','2025/05/autobus.json'],
 ['pastel','Torta','2025/05/pastel.json'],
 ['musica','Botón de música','2025/03/Animation-1741383787701.json'],
 ['baile','Fiesta con baile','2025/05/baile.json'],
 ['chaqueta','Traje','2025/05/chaqueta-de-sport.json'],
 ['vestido','Vestido','2025/05/vestido-de-novia.json'],
 ['camara','Cámara de fotos','2025/05/camara-fotos.json'],
 ['ceremonia-civil','Ceremonia civil','2025/07/boda.json'],
 ['iglesia','Iglesia','2025/05/17-Iglesia.json'],
 ['coctel','Cóctel','2025/05/coctel.json'],
 ['recepcion','Recepción','2025/05/11-recepcion-social.json'],
 ['vals','Vals','2025/05/vals.json'],
 ['cena','Cena','2025/05/14-Cena.json'],
 ['fiesta','Fiesta','2025/05/cancion.json'],
 ['flores','Bouquet','2025/05/flores.json'],
 ['auto','Despedida','2025/05/23-adios-fin-de-fiesta-1.json'],
 ['regalo','Regalo','2025/05/37-regalo-1.json'],
 ['fotografia','Fotografía','2025/02/Animation-1740029697999.json'],
 ['pareja','Pareja','2025/08/boda.json'],
].map(([id,label,source])=>({id:'invitali-original-'+id,label:label+' · Original',path:'https://invitali.com/wp-content/uploads/'+source,tags:['original','invitali','boda',id]}));
