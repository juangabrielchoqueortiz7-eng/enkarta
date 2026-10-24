# Serenata · celebración entre olivos

Variante independiente con familia SQL `dolcevita` y `config.designKey = 'serenata'`. Conserva Oliva/Dolcevita y todas las demás invitaciones. Ruta propia: `/muestra/serenata`, con metadata noindex; `?full=1` abre sin sobre y `?preview=1` ofrece vista estática. Los parámetros libres no inventan invitados, cupos ni permisos.

## Dirección

Referencia observada: [Dolcevita de Invitali](https://invitali.com/dolcevita/). Se conserva su lenguaje botánico verde/marfil, caligrafía Meow Script, tipografía Cormorant Infant, ceremonia religiosa/civil/recepción, vestimenta e itinerario con originales. El usuario pidió imágenes nuevas y sobre: esta edición tiene pareja, imágenes y texto ficticios propios, fotografía en arco y entrada con dos hojas reales y lacre floral archivados. Es una variante inspirada en la muestra, no una certificación de identidad píxel a píxel.

La portada presenta fotografía y nombres en dos columnas; en móvil aparecen nombres y fotografía apilados. La fecha, el contador, las familias y los padrinos se centran. Una banda verde reúne tres lugares; el civil se edita como elemento del itinerario, con hora, nombre y ubicación propios. Los seis momentos se disponen en tres columnas y dos filas, o una columna en móvil. Historia, fotografía de celebración y carrusel de tres imágenes completan el recorrido. Hospedaje y enlace para compartir fotos solo aparecen cuando están configurados y el paquete los permite. La muestra no copia hoteles, cuentas, QR bancarios ni formularios de Invitali.

Colores: verde `#51765d`, bosque `#2d4c2e`, papel `#fcfbf6`, texto `#2b342b` y bronce `#89734e`. El cuerpo usa Cormorant Infant de 21 px; las acciones y etiquetas Raleway, y los nombres/títulos Meow Script. Las fuentes originales se alojan localmente. Los adornos se mantienen detrás del contenido; en móvil y en el lienzo estrecho se atenúan para evitar que cubran el saludo.

## Fotografías nuevas

Tres imágenes generadas sin referencias ajenas: pareja adulta ficticia entre olivos, manos con votos y flores, y jardín imaginario preparado para la celebración. Los PNG maestros permanecen intactos en `assets/generated/serenata/2026-10/`; las copias WebP conservan contenido y dimensiones 1536×1024 y suman 765.404 bytes. Los maestros no se publican. Prompts completos y hashes: [serenata-images.json](assets/serenata-images.json). La muestra informa que las imágenes y lugares son ficticios.

## Originales y movimiento

El inventario previo permitió reutilizar música Contigo Aprendí en guitarras, corazones aportados por el usuario, iglesia, recepción, cena, vals, pastel, cámara, adultos, regalo, lluvia de sobres y botón musical, además de sobres, lacre, fuentes y adornos. Se incorporaron solo nueve originales faltantes: cinco JSON específicos, la fuente Meow Script Latin, dos fondos de hojas y un separador. Los cinco JSON son los certificados civil y civil-itinerario, `vestiementa-1.json` (errata original), `39-musica.json` y `Pajarito.json`.

Los 169 registros previos se conservan sin cambios. El lock se amplía a 179: nueve descargas nuevas y el corazón ya existente, ahora también protegido por el despliegue. No se descargó otra vez ese corazón: la copia maestra se tomó de sus bytes existentes. URL completa, ruta, dimensiones cuando corresponden y SHA-256: [serenata-originals.json](assets/serenata-originals.json). Los dos manifiestos maestros scoped viven en `Iconos INVITALI/serenata-recursos.json` y `serenata-media-recursos.json`; los manifiestos históricos completos continúan locales.

El documento incluye 17 instancias de contenido de 15 fuentes JSON; el botón musical usa la decimosexta fuente. Se conservan reproducción original, inversión cuando corresponde y pausa fuera de vista, con pestaña oculta, ahorro de datos o movimiento reducido. Corazones y pájaro conservan su paleta original salvo una personalización explícita. Los demás colores se aplican a la copia de la instancia con ajustes del organizador prioritarios, sin reescribir los originales. Las expresiones internas de color no sustituyen la paleta elegida; las de movimiento se conservan.

Fotografías, títulos y párrafos tienen entradas propias al aparecer, sin ocultar el documento por defecto. Las tres fotos editoriales se descubren suavemente y el carrusel conserva controles de anterior, siguiente y pausa. La entrada abre en 800 ms, o inmediatamente con movimiento reducido/ahorro de datos. La música se inicia únicamente con gesto del usuario; se ofrece «Abrir sin música». El contenido permanece inerte hasta abrir, el foco va al H1 y la señal para los efectos se emite después del commit. El calendario usa un final exclusivo al día siguiente, con cruce de mes y año bisiesto cubiertos.

## Integración y validación

Los campos de contenido, imágenes de historia/celebración y siete selectores de iconos tienen rama propia del constructor. La vista previa evita duplicar el RSVP. El renderer público conserva validación del servidor, snapshots, tokens y cupos; monta un solo sobre y un solo formulario. Vaciar la música no restaura una pista genérica. Los arrays, colores y textos vaciados se conservan al guardar. Esta muestra independiente no se añade automáticamente al catálogo comercial ni al selector de Socios, como las ediciones anteriores Capítulo y Travesía.

Pruebas puntuales: 31 de Serenata (10 perfil/editor/procedencia, 4 reproductor, 10 entrada y 7 revelados), 36 de los controles de iconos del constructor y 5 del despliegue: **72 aprobadas**. TypeScript local aprobado. La primera revisión visual agrupada cubrió 1440×900 y 390×844; confirmó fotos, fuentes, música real y pausa, apertura silenciosa y tres JSON de ceremonias listos. Se corrigió el follaje que interfería con el saludo móvil en una única tanda. Las capturas se conservan en `tmp/serenata-release-20261023/visual/` y no sustituyen aceptación física.

Impeccable condujo la composición; su detector solo señaló cinco avisos sobre fuentes/alias y tres colores propios frente a tokens del portal. Son decisiones locales documentadas, no una autorización para normalizar las demás invitaciones. BCP continúa desactivado. No se realizaron pagos ni envíos de WhatsApp.
