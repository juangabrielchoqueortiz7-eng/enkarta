# María Angélica y Mario

Referencia: https://invitali.com/150-maria-angelica-y-mario/?id=fZ7bK3
Muestra: /muestra/maria-angelica-y-mario (añadir ?full=1 para saltar el sobre).

Implementación nativa independiente, seleccionable en el constructor. Configuración en `mariaMario`: textos, visibilidad, videos y posters, sobre, sellos, brújulas, aviones, mapas, cuatro conjuntos de fotografías, velocidades y hospedajes con imágenes/enlaces. Nombres, fecha, padres, lugar, regalos, música y JSON usan campos habituales. El sello de fecha original se oculta al cambiar los nombres o la fecha, salvo que se sustituya por un recurso personalizado.

Originales archivados en `Iconos INVITALI/maria-mario-recursos.json`: 38 recursos nuevos con URL completa y SHA-256. Las copias de distribución mantienen bytes originales; los dos posters JPEG son derivados de los videos. Se reutilizan fuentes, sobres y JSON archivados. Vestimenta playera (2025/05/vestimenta-2.json), hotel (2025/05/hotel.json) y música Contigo Aprendí (2024/10) importados mediante el importador habitual. Total biblioteca: 32 originales JSON/audio.

Incluye fondo de mar en video, video del viaje, carruseles originales, collage con movimiento de scroll, brújulas giratorias, GIF de aviones y Lottie originales. Respeta movimiento reducido y ahorro de datos en videos/carruseles. El formulario es el de Enkarta; fotos y playlist tienen destinos editables propios.

Limitaciones de la referencia verificadas el 2026-09-09:
- Maria-Angelica-Mario13.webp devuelve HTTP 404; se excluye del carrusel y no se sustituye por una fotografía inventada.
- El ID de invitado devuelve error en el original; no se copia ese error ni los formularios de terceros.
- El calendario original indica 18:30 y la ceremonia visible 17:00. Enkarta usa la hora editable de ceremonia (17:00).
- El itinerario de la referencia está oculto; no se agrega una sección visible inventada.
- No se afirma identidad píxel por píxel. La adaptación conserva las secciones y recursos verificados.

Validación: TypeScript, lint de componentes nuevos y 69 pruebas del constructor, incluida persistencia independiente, límites de fotos y bytes de archivos. Navegador: videos reproduciendo, hoteles navegables, apertura y confirmación de muestra, sin imágenes rotas ni desbordamiento horizontal a 390 px.

Corrección 2026-09-09: cada brújula superpone los dos SVG originales (letras y rosa) en el mismo marco, con una única transformación de scroll. Los dos recursos de mundo/aviones también se superponen y giran sobre un centro común. El mapa de viaje es un MP4: canvas elimina el blanco en reproducción sin cambiar el archivo archivado. Control `travelRemoveWhite` en Videos y enlaces; desactivarlo si se reemplaza por una película que deba conservar blancos. Cambiar las ciudades requiere el proyecto editable del autor o generar otra animación; no son textos separados dentro del MP4. Recursos remotos personalizados necesitan CORS para procesar transparencia; si no lo permiten se muestra el video normal.
