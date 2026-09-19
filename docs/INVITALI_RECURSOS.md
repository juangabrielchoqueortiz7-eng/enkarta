# Memoria de recursos de invitaciones

Preferencia del usuario: reproducir la referencia fielmente. Reutilizar los JSON originales recibidos en todas las invitaciones, conservándolos en la biblioteca del constructor. No volver a solicitar un recurso ya archivado.

| Original | Biblioteca local | Estado |
| --- | --- | --- |
| `2024/05/Animation-1715978306775.json` | `/lottie/boda/annie-corazones-original.json` | Original aportado por el usuario. 1920×1080, 176 cuadros, 29.97 fps. Corazones con giros y desplazamientos; no sustituir por tres corazones con pulso. |
| `2025/05/10-no-ninos.json` | `/lottie/boda/invitali-sin-ninos-original.json` | Original de la carpeta de iconos del usuario. |

Las rutas completas están registradas en `src/lib/invitation-assets.ts`. Los originales están en el repositorio: no dependen de la carpeta externa del usuario.
Las variantes `laura-corazones`, `annie-tres-corazones`, `annie-pareja`, `annie-reloj`, `annie-auto` y `annie-fotografia` son recreaciones o derivados, no originales descargados. No confundirlas con coincidencias exactas.

La descarga directa de JSON de Invitali devuelve 403 desde las herramientas disponibles. El navegador puede mostrar las animaciones, pero su exportador de recursos no exporta JSON. Si falta un original, informar cuál y conservar el trabajo restante.

Actualización: se confirmó que la aplicación puede reproducir los originales por HTTPS directamente desde el navegador. Los 12 originales de Roly y Yeliana están en REMOTE_ORIGINAL_ICONS y en el catálogo del constructor. Conservan fuente completa y animación original; dependen por ahora del servidor de Invitali. Si se importa un JSON local, agregarlo a ORIGINAL_INVITATION_ASSETS: las instancias existentes usarán automáticamente la copia local. No pedir nuevamente los dos JSON ya archivados.

Nicole y Francisco reutiliza iglesia, cóctel, vals, cena, anillos, pareja, regalo y adultos. Se añadieron a la biblioteca los originales 2025/05/baile.json, chaqueta-de-sport.json, vestido-de-novia.json y camara-fotos.json. No confundir esta cámara con Animation-1740029697999.json de Roly. Fotografías, fuentes, sobre y fondo se conservan en public/invitations/nicole-y-francisco.


Actualización 2026-09-08: el usuario entregó 18 JSON y 3 MP3 en `Iconos INVITALI/`. Todos están verificados por estructura/cabecera y SHA-256 e importados sin modificar bytes. Las URLs exactas se resuelven mediante `src/lib/invitali-local-assets.json` a `/lottie/invitali-originales/` y `/audio/invitali-originales/`. Ya no están pendientes los recursos remotos enumerados arriba. La carpeta maestra y `manifest.json` se deben consultar ANTES de descargar. Solo agregar nuevos; nunca sobrescribir un original distinto ni descargar de nuevo uno archivado. El importador es idempotente y rechaza archivos distintos en un destino existente.

`/referencias-descargas.html` lista los recursos conocidos y omite los ya archivados al descargar. Los corazones originales y Solo adultos siguen conservados en sus rutas previas; no volver a solicitarlos. Manuel y Maya añade pastel.json y el botón de música original; ambos incluidos en los 18 importados.

Nicole: el collage usa ahora el desplazamiento y giro de la referencia, con velocidad horizontal .4, rotación .1, rango de columnas 52–100% (traslación izquierda desde 53%) y rotación individual 0–100%. Se respeta movimiento reducido y el scroll del constructor.


Mariana y Jesús (6) y Paula y Juan Felipe (7): variantes nativas independientes y editables. Nuevos originales archivados: `2025/05/Deslizar-mano.json`, `2025/05/mesa4.json`, `2025/09/carro-nuevo.json`, `2026/04/tiempo.json`, `2025/05/33-lluvia-de-sobres.json`, `2025/05/autobus.json`. Ya no queda pendiente la mano. Música Viva la Vida instrumental (6) y Bruno Mars Risk It All (7) importada con bytes originales. El importador informa 29 recursos locales, sin pendientes. Corazones: reutilizar siempre el original aportado por el usuario y conservar su paleta salvo configuración explícita.
Fotografías, fondos, video y tipografías adicionales: URL completa, SHA-256 y ruta local en `Iconos INVITALI/mariana-jesus-recursos.json` y `Iconos INVITALI/paula-juan-felipe-recursos.json`. No descargarlos otra vez. Paula reutiliza sobres de Manuel y sello verde de Laura; sus archivos anteriores permanecen intactos.
Mariana conserva el turquesa original #428d90; la validación comercial detecta contraste 2.9:1 y exige ajustar el texto antes de publicar. No se desactivó esa validación. El constructor permite cambiar el color. Las pruebas verifican este diagnóstico, no declaran la paleta accesible.
Paula: collage de tres columnas (3/4/3 fotos), desplazamiento central vertical .9 y extremos con giro .1/desplazamiento horizontal .4. Cuatro carruseles (2s, 1s, 2s, 2s), movimiento reducido respetado. Confirmación usa el formulario Enkarta; no copiar estados personales ni el error de ID ausente de la referencia.

Correcciones solicitadas: Mariana reproduce todos los JSON; la capa fija del mar usa overflow visible para no quedar recortada durante scroll y tiene mar-poster.jpg extraído del video local (derivado de respaldo; no reemplaza el original). Paula usa texto e iconos verde oscuro sobre tarjetas de papel para legibilidad. Nicole oculta flores de la cabecera exclusivamente en móvil; monograma sobre blanco.

Karla y Mauricio (8): archivos nuevos en `Iconos INVITALI/karla-mauricio-recursos.json`; reutilizar siempre estas copias. Corazón JSON ya archivado, con filtro de la referencia aplicado por instancia. Orquídeas y entrada móvil tienen tamaños propios; el diente de león es una imagen con partículas CSS de 10–50px, no un JSON ni una imagen gigante de fondo. Parámetros y edición documentados en `docs/KARLA_MAURICIO.md`. No había canción válida en la referencia observada; la música queda sin asignar. Se conserva el diagnóstico comercial de contraste 2.9:1 de la paleta original.

## María Angélica y Mario — 2026-09-09

Variante nativa `maria-angelica-y-mario`, posterior a Karla y Mauricio por selección explícita del usuario. Ver `docs/MARIA_MARIO.md` y archivo maestro `Iconos INVITALI/maria-mario-recursos.json`. Reutilizar estos recursos por URL completa; no descargar nuevamente. Nuevos JSON de vestimenta playera y hotel, más música Contigo Aprendí, ya importados. Fotografía 13 de esta pareja no disponible (404); documentada sin reemplazo aproximado. Las siguientes referencias de la lista no se realizan automáticamente; variantes/mejoras generales del constructor quedan para después.

## Nuevas variantes y mapa — 2026-09-09
El usuario autorizó cinco variantes propias: Siena, Jardín de Salvia, Carta Malva, Costa Celeste y Noche Champagne. Usan recursos existentes sin nuevas descargas de Invitali. La ruta SVG editable es nueva, no se presenta como JSON/MP4 original: ver `docs/COLECCION_LIMPIA_Y_MAPA.md`. El video anterior permanece disponible. Cartografía Natural Earth ya archivada en `public/maps/`, reutilizar sin descargar nuevamente.
