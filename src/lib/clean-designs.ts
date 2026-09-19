export const CLEAN_DESIGNS=[
 {key:'aurelia',name:'Aurelia',tag:'Perla y orquídeas',description:'Retrato ovalado, flores suspendidas y galería de retratos',accent:'#c6ad91',ink:'#544a43',paper:'#fbf7f0',layout:'aurelia'},
 {key:'velada',name:'Velada',tag:'Jardín nocturno',description:'Luz cálida, jardín profundo y recuerdos cinematográficos',accent:'#a79770',ink:'#f3eadd',paper:'#172b26',layout:'velada'},
 {key:'promesa',name:'Promesa',tag:'Álbum de boda',description:'Carta personal, recuerdos impresos y álbum de páginas interactivas',accent:'#c4a59a',ink:'#51433f',paper:'#fbf8f4',layout:'promesa'},
 {key:'casa-limone',name:'Votos',tag:'Fotográfico',description:'Fotografía envolvente, papelería marfil y transiciones suaves',accent:'#b59a79',ink:'#443e38',paper:'#faf7f1',layout:'limone'},
 {key:'jardin-de-seda',name:'Jardín de Seda',tag:'Acuarela',description:'Papelería floral, sobre y fotografía de jardín',accent:'#b69c8e',ink:'#4c5047',paper:'#fcf9f3',layout:'seda'},
 {key:'siena-editorial',name:'Siena',tag:'Editorial',description:'Villa ilustrada, cipreses y relato editorial en terracota',accent:'#a75a3e',ink:'#603722',paper:'#fbf4e9',layout:'siena'},
 {key:'jardin-salvia',name:'Jardín de Salvia',tag:'Botánico',description:'Jardín grabado, fotografías en pareja y recorrido botánico',accent:'#698371',ink:'#294a3a',paper:'#f4f6ef',layout:'salvia'},
 {key:'carta-malva',name:'Carta Malva',tag:'Romántico',description:'Carta con sello interactivo, flores y álbum de recuerdos',accent:'#96768f',ink:'#594052',paper:'#faf3f7',layout:'malva'},
 {key:'costa-celeste',name:'Costa Celeste',tag:'Destino',description:'Postal de destino, mapa animado y pase personalizado',accent:'#468397',ink:'#204e60',paper:'#f0f7f8',layout:'costa'},
 {key:'noche-champagne',name:'Noche Champagne',tag:'Noche',description:'Constelaciones, órbitas y celebración bajo las estrellas',accent:'#ceaf7b',ink:'#f0dfbf',paper:'#172533',layout:'noche'},
] as const;
export type CleanDesignKey=typeof CLEAN_DESIGNS[number]['key'];
export function isCleanDesign(key?:string):key is CleanDesignKey{return CLEAN_DESIGNS.some(d=>d.key===key);}
