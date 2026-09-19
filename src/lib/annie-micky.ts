import { resolveFeatures } from './packages';
import type { InvitationParsed, BuilderConfig } from './types';
import { LA_TEXTS, LA_SECTIONS, lauraAndresStarter, laMaps } from './laura-andres';
export const AM_ROOT='/invitations/annie-micky/';
const originals={
  "announce": "",
  "quote": "La alegría de encontrarnos. La certeza de elegirnos.",
  "quoteRef": "",
  "honor": "TENEMOS EL HONOR\nDE INVITARTE A NUESTRA BODA",
  "dateIntro": "QUEREMOS QUE NOS ACOMPAÑES EN NUESTRO DÍA:",
  "remaining": "FALTAN:",
  "calendar": "AGENDAR EL EVENTO",
  "ceremonyIntro": "Ceremonia y recepción",
  "ceremonyNote": "Cieneguilla",
  "receptionIntro": "La celebración continúa",
  "receptionNote": "",
  "maps": "Ubicación",
  "dressTitle": "DRESS CODE",
  "women": "Ellas\nVestido largo. Reservamos el blanco, marfil y perla para la novia.",
  "men": "Ellos\nTraje formal. Reservamos los tonos beige y arena para el novio.",
  "palette": "Celebra con comodidad: el evento será en un jardín. Te sugerimos calzado adecuado para el césped.",
  "program": "ITINERARIO",
  "giftTitle": "SUGERENCIA DE REGALO",
  "noKidsTitle": "“DULCES SUEÑOS”",
  "noKids": "Hemos preparado una celebración para adultos. Gracias por ayudarnos a disfrutar juntos de esta ocasión especial.",
  "share": "Cada mirada cuenta una historia. Comparte las fotografías de nuestros abrazos, risas y momentos favoritos.",
  "shareButton": "Compartir fotografías",
  "rsvpTitle": "CONFIRMA TU ASISTENCIA ANTES DEL:",
  "rsvpThanks": "",
  "deadline": "",
  "rsvpNote": "",
  "closing": "ESPERAMOS CONTAR CON TU COMPAÑÍA.",
  "story": "Entre conversaciones, viajes y pequeños instantes fuimos construyendo nuestro lugar favorito: estar juntos. Hoy abrimos un nuevo capítulo y queremos llenarlo de recuerdos con las personas que más queremos.",
  "signature": "",
  "family": "CON LA BENDICIÓN DE DIOS\nY DE NUESTRAS MADRES"
};
const baseTexts=(Object.keys(originals) as Array<keyof typeof originals>).reduce((result,key)=>{result[key]=[LA_TEXTS[key][0],originals[key]];return result;},{} as Record<keyof typeof originals,readonly [string,string]>);
export const AM_TEXTS={...baseTexts,programNote:['Nota del itinerario','Hay momentos que se viven una sola vez. Llega puntual y comparte con nosotros cada instante de este día tan especial.'],shareTitle:['Título compartir fotos','CAPTURA Y COMPARTE'],brideLabel:['Título familia novia','MADRE DE LA NOVIA'],groomLabel:['Título familia novio','MADRE DEL NOVIO']} as const;
export const AM_SECTIONS={...LA_SECTIONS,widePortrait:'Carrusel después de regalos',portrait:'Carrusel antes del itinerario',lastPortrait:'Fotografía final'};
export function annieMickyStarter(){
 const base=lauraAndresStarter();
 const config:BuilderConfig={designKey:'annie-y-micky',city:'CIENEGUILLA',entry:{enabled:true},motion:{preset:'elegant'},theme:{bg:'#ffffff',primary:'#68693f',text:'#544e39',line:'#818566',primaryDeep:'#535e41',onPrimary:'#ffffff'},tokens:{shadow:'none',cardRadius:0,buttonRadius:15,mediaRadius:20},sectionIcons:{noKids:'/lottie/boda/laura-sin-ninos.json',hearts:'/lottie/boda/annie-corazones-original.json',punctuality:'/lottie/boda/annie-corazones-original.json',gallery:'/lottie/boda/annie-fotografia.json'},galleryImages:Array.from({length:12},(_,i)=>AM_ROOT+['manos.webp','jardin.webp','celebracion.webp'][i%3]),annieMicky:{texts:{...originals},sections:{quote:false},coverImages:[],wideImages:[AM_ROOT+'jardin.webp',AM_ROOT+'celebracion.webp'],portraitImages:[AM_ROOT+'celebracion.webp',AM_ROOT+'manos.webp'],closingImages:[AM_ROOT+'jardin.webp'],womenColors:[],menColors:[],suggestedColors:[],slideSeconds:2}};
 return {...base,names:'Annie y Miguel',event_date:'2026-09-19',ceremony_time:'12:00',ceremony_place:'“La Provenza”',ceremony_address:'Cieneguilla, Lima, Perú',reception_time:null,reception_place:null,reception_address:null,message:'Con mucha ilusión, te invitamos a compartir un día que recordaremos toda la vida.',parents_bride:['Elena Montaño'],parents_groom:['Isabel García de Montoya'],sponsors:[{role:'Padrinos',names:'Sofía y Gabriel'}],itinerary:[['12:00 h','Ingreso de invitados','invitacion'],['13:00 h','Ceremonia religiosa','anillos'],['14:00 h','Ceremonia civil','marriage'],['14:45 h','Recepción','champan'],['15:00 h','Vals y brindis','baile'],['16:20 h','Fiesta','cena'],['21:00 h','Despedida','annie-auto']].map(([time,label,icon])=>({time,label,icon:'/lottie/boda/'+icon+'.json'})),gift_message:'Tu presencia es lo que más nos ilusiona. Si deseas regalarnos un detalle, puedes contribuir a los sueños que comenzamos a construir juntos.',dress_code:'Formal',cover_image_url:AM_ROOT+'jardin.webp',gallery_url:null,color_primary:'#68693f',color_secondary:'#ffffff',color_accent:'#544e39',rsvp_deadline:'2026-09-10',builder_config:config};
}
export function annieMickyDemo():InvitationParsed{const s=annieMickyStarter();return {...s,id:'demo-annie-y-micky',slug:'annie-y-micky',config:s.builder_config,builder_config:JSON.stringify(s.builder_config),is_active:true,expires_at:null,views_count:0,host_email:null,host_password_hash:null,whatsapp_template:null,created_at:'2026-09-06T00:00:00Z',phone_raw:null};}
export function amText(data:InvitationParsed,key:keyof typeof AM_TEXTS){return data.config.annieMicky?.texts?.[key]??AM_TEXTS[key][1];}
export const amMaps=laMaps;
export function amMedia(data:InvitationParsed){const limit=resolveFeatures(data.config).galleryMax,allowed=new Set<string>();const take=(urls:string[]=[])=>urls.filter(url=>{if(allowed.has(url))return true;if(allowed.size>=limit)return false;allowed.add(url);return true;});const settings=data.config.annieMicky;return {gallery:take(data.config.galleryImages),cover:take(settings?.coverImages),portrait:take(settings?.portraitImages),wide:take(settings?.wideImages),closing:take(settings?.closingImages)};}

/** Upgrade the previous demo defaults while preserving other selected library icons. */
export function amIconSource(source:string,section?:string){
 if(source==='/lottie/boda/annie-tres-corazones.json')return '/lottie/boda/annie-corazones-original.json';
 if(section==='hearts' && ['/lottie/boda/laura-corazones.json','/lottie/boda/annie-pareja.json'].includes(source))return '/lottie/boda/annie-corazones-original.json';
 if(section==='punctuality' && source==='/lottie/boda/annie-reloj.json')return '/lottie/boda/annie-corazones-original.json';
 if(source==='/lottie/boda/honeymoon.json')return '/lottie/boda/annie-auto.json';
 if(source==='/lottie/boda/photo.json')return '/lottie/boda/annie-fotografia.json';
 return source;
}
