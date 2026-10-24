# Ópera · mármol negro y dorado

Muestra independiente inspirada en [Obsidiana de Invitali](https://invitali.com/obsidiana/), con `config.designKey = 'opera'` y familia SQL `obsidiana`. Conserva Nocturna/Obsidiana y las demás invitaciones. Ruta `/muestra/opera`; `?full=1` abre sin sobre y `?preview=1` muestra el interior sin audio ni movimiento decorativo. No se incorpora automáticamente al catálogo o selector de Socios, siguiendo el alcance de las variantes independientes anteriores.

## Dirección y composición

Modo de la superficie: experiencia. La referencia se observó en 1440×900 y 390×844, incluyendo su portada abierta y sus recursos exactos. El escritorio combina una fotografía a la izquierda con nombres caligráficos, fecha y frase en un marco dorado sobre mármol negro a la derecha. En móvil la fotografía precede a la composición centrada. La fecha se mantiene en un grupo simétrico; el follaje original ocupa el borde y no sustituye contenido.

El usuario pidió fotografías nuevas y sobre. Esta edición usa pareja y lugares ficticios, frase propia editable y un sobre de hojas reales con lacre negro, distinto de la pantalla de botón de la referencia. La cabecera conserva el lenguaje compositivo de la muestra; no se certifica identidad píxel a píxel. Se añaden familias y confirmación compatibles con Enkarta; no se copian fotografías ajenas, huéspedes, cuentas bancarias, QR de pago ni formularios externos.

Paleta: negro `#090909`, dorado `#f7e0a5`, superficie `#17150f`. Los controles dorados tienen tinta oscura. Romantic Lovely, Raleway, Poiret One y Apple Chancery son fuentes originales archivadas. El cuerpo usa 16 px en escritorio y 17 px en móvil; los controles mantienen un área mínima de 44 px. El sobre matiza el papel mediante inversión y escala de grises en la instancia, conservando los bytes del raster; el lacre no se altera.

## Fotografías y originales

Tres imágenes generadas con la herramienta integrada `image_gen`, sin referencias externas: pareja adulta ficticia en patio de piedra al anochecer, retrato complementario en escalinata y mesa con lino negro, flores marfil y velas. Los PNG maestros están en `assets/generated/opera/2026-10/` y los WebP en `public/invitations/opera/`; cada archivo tiene 1536×1024 y los WebP suman 759.130 bytes. Prompts, textos alternativos y SHA-256: [opera-images.json](assets/opera-images.json).

Se reutilizan 184 originales anteriores sin cambiar sus filas ni sus bytes. Solo se incorporaron siete originales faltantes: `2025/05/31-Brindis.json`, `2025/06/vestido-sin-cola.json`, música `2025/03/Sleeping-At-Last.mp3`, mármol, dos follajes y una hoja dorada SVG. Los nuevos JSON quedan disponibles en la biblioteca reutilizable. El registro de distribución crece a 191. El sobre, su lacre y las cuatro fuentes ya estaban archivados; no se descargaron nuevamente.

El mapa contiene 14 roles de JSON. Los seis momentos del itinerario usan iglesia, recepción social, cena, pastel, ramo y canción; la recepción principal usa el brindis específico y vestimenta muestra traje y vestido con destinos separados. Regalo, sobres, cámara, música y adultos completan el mapa. Las animaciones conservan su estructura original y los parámetros de reproducción de la referencia: alternancia salvo regalos/sobres. Color, tamaño y velocidad se aplican a la instancia. Procedencia de 27 registros por URL completa y SHA-256: [opera-originals.json](assets/opera-originals.json) y `Iconos INVITALI/opera-recursos.json`. El inventario conserva también el follaje y la hoja estática para reutilización; no se presentan como JSON animados.

## Edición e interacción

Catorce campos de texto propios, dos imágenes de sección y ocho selectores de iconos se integran en el constructor. El traje usa `sectionIcons.jacket` y el vestido `sectionIcons.dressCode`; editar uno no reemplaza el otro. Las leyendas acompañan a su imagen al cambiar el orden. Los valores vacíos y las listas personalizadas no restauran automáticamente la muestra. El calendario utiliza el día siguiente como límite exclusivo.

El sobre protege el interior con `inert` hasta abrir, contiene el foco y lo entrega al título después del commit. Ofrece apertura con música o silenciosa, Escape abre sin música y los dobles toques no duplican la apertura. La música requiere gesto del usuario y no reaparece si el organizador la vacía. Los originales y efectos respetan movimiento reducido, ahorro de datos, pestaña oculta, vista previa y desmontaje; el documento queda visible por defecto. Fotos y textos tienen entradas distintas al aparecer.

El RSVP real recibe únicamente el formulario autorizado por el servidor de Enkarta. La muestra no envía respuestas y los parámetros externos no fabrican nombres ni pases. Los planes y permisos se conservan. BCP continúa desactivado.

## Verificación proporcional

32 regresiones propias (11 de SSR/perfil/editor/ruta/procedencia, diez de entrada, cuatro del reproductor y siete de revelados), 36 de controles de iconos y cinco de distribución: **73 aprobadas**. TypeScript aprobado. No se ejecutó la suite completa del repositorio. La revisión agrupada local cubrió portada, lectura móvil, música y pausa, seis JSON del itinerario listos con SVG y los dos JSON distintos de vestimenta. No hubo desbordamiento horizontal en 1440×900 y 390×844. Se ajustaron en una sola tanda el tono neutro del sobre y el tamaño de nombres en escritorio. Capturas en `tmp/opera-release-20261023/visual/`; no sustituyen una aceptación física.

El detector de Impeccable señaló cinco fuentes/alias y cinco colores propios frente al sistema del portal. Son decisiones locales documentadas en esta ficha y DESIGN.md; no autorizan cambiar las otras invitaciones. La entrega utiliza subida incremental y omite físicamente maestros, documentación y archivos `.env` antes de enviar el paquete a Vercel.
