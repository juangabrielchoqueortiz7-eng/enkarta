# Véspera · una noche para recordar

Variante independiente inspirada en [Grazia de Invitali](https://invitali.com/grazia/), con `config.designKey = 'vespera'` y familia SQL `grazia`. Conserva Seda/Grazia y las demás invitaciones. Ruta pública: `/muestra/vespera`; `?full=1` abre sin sobre y `?preview=1` presenta el interior con movimiento decorativo y audio desactivados. No se añade automáticamente al catálogo ni al selector de Socios, siguiendo el alcance de las muestras independientes anteriores.

## Composición y límites

La referencia se observó renderizada en 1440×900 y 390×844. La cabecera usa fotografía nocturna a ancho completo y un medallón marfil centrado con nombres, ampersand y fecha. El recorrido conserva saludo, retrato, fecha/cuenta regresiva/calendario, familias, dos lugares, ocho momentos del itinerario, hospedaje opcional, regalos, historia, fotografías, adultos, vestimenta, recuerdos y RSVP.

El usuario pidió fotografías nuevas y sobre: esta edición usa tres escenas generadas sin imágenes de referencia y entrada propia con hojas y lacre originales archivados. El retrato interior presenta a la pareja junta, en lugar de las dos fotografías individuales de la muestra. No se copian fotografías ajenas, hoteles, cuentas bancarias, QR de pago ni formularios externos. No se certifica identidad píxel a píxel.

Paleta propia: `#fbf8f4`, `#292622`, `#967f60` y `#5c4a36`. Poiret One, Cinzel, Tangerine y Great Vibes originales se alojan localmente; las acciones usan Raleway para conservar legibilidad. Cuerpo de 21 px en escritorio y 20 px en móvil, controles táctiles de al menos 44 px. Los títulos, la fecha, las familias y los ocho momentos se centran. La cabecera mantiene los rostros visibles por encima de los nombres.

## Recursos

Tres fotografías de pareja adulta ficticia, retrato complementario y celebración imaginaria: PNG maestros en `assets/generated/vespera/2026-10/`, copias WebP en `public/invitations/vespera/`. Dimensiones 1536×1024 y distribución total 732.968 bytes. Prompts, procedencia y hashes: [vespera-images.json](assets/vespera-images.json). Generadas mediante la herramienta integrada `image_gen`, sin fotografías de entrada. Los maestros no se publican.

Se reutilizaron papel del sobre, lacre floral negro, música Contigo Aprendí en guitarras, Poiret One, Cinzel, separador y los JSON archivados. Solo faltaban el abrazo y tres archivos de fuentes: Tangerine regular/negrita y Great Vibes Latin. El lacre negro ya existía: se archivó una copia de sus bytes, sin volver a descargarlo. El lock pasa de 179 a 184 conservando sus 179 filas originales sin cambios; son cuatro descargas nuevas y un original preexistente ahora protegido. Procedencia completa por URL y SHA-256: [vespera-originals.json](assets/vespera-originals.json) y `Iconos INVITALI/vespera-recursos.json`.

El itinerario usa abrazo, Biblia, recepción, pareja `2025/08/boda.json`, cena, canción, pastel y despedida. La Biblia reproduce hacia delante; los demás alternan según la referencia. Adultos, vestimenta, cámara, regalos y sobres completan los 14 roles disponibles. La biblioteca del constructor incorpora Abrazo como original reutilizable. Los bytes se conservan: color, tamaño, velocidad y reproducción se aplican a la instancia. No se sustituye ninguna animación por un dibujo aproximado.

## Interacción, edición y seguridad

El sobre bloquea el contenido interior hasta abrir; ofrece música o entrada silenciosa, atrapa el foco y lo entrega al título al terminar. Escape abre sin música; los dobles toques no duplican la apertura. La música requiere gesto, conserva el control de pausa y no vuelve a aparecer si el organizador la vacía. El movimiento respeta vista previa, movimiento reducido, ahorro de datos, pestaña oculta y desmontaje. Las fotos se descubren con un recorte suave; los textos aparecen una sola vez, conservando contenido visible por defecto.

Las imágenes, copias y siete selectores de iconos tienen controles propios del constructor. Los vacíos explícitos, la lista de galería y las personalizaciones de cada momento se conservan. Las leyendas se asocian a la imagen, no a su posición. El calendario usa un final exclusivo al día siguiente. La muestra ignora parámetros que intenten fabricar nombres o pases; el RSVP real se recibe únicamente del servidor de Enkarta. La muestra informa que no envió confirmación. BCP continúa desactivado.

## Validación puntual

32 regresiones de Véspera (11 de perfil/SSR/editor/procedencia/ruta, 10 de entrada, cuatro del reproductor y siete de revelados), 36 de controles de iconos del constructor y cinco del despliegue: **73 aprobadas**. TypeScript aprobado. No se ejecutó la suite completa del repositorio para esta variante aislada. El primer intento de TypeScript coincidió con la regeneración de `.next/types` al iniciar el servidor y encontró archivos temporales ausentes; la repetición tras estabilizar la vista local aprobó.

La revisión local agrupada verificó sobre móvil, cabecera en ambos tamaños, música real y pausa, apertura silenciosa, ocho JSON listos con SVG, galería 2 / 3 con leyenda y aviso de RSVP sin envío. No hubo desbordamiento horizontal en 1440×900 y 390×844 ni errores de consola. Se corrigió la unidad duplicada en la hora. Capturas en `tmp/vespera-release-20261023/visual/`. Esta revisión del navegador no sustituye aceptación física. El detector de Impeccable señaló fuentes/alias y colores propios frente a tokens del portal; se documentan aquí y en DESIGN.md, sin normalizar otras invitaciones.
