# Travesía · edición de viaje

Variante independiente sobre la familia SQL `passport`, con `config.designKey = 'travesia'`. Atlas/Passport conserva su componente, sus presets y sus recursos. Referencia de estructura observada: [Passport de Invitali](https://invitali.com/muestra-pasport/). La petición posterior del usuario exige imágenes nuevas e identidad propia: esta edición no pretende ser una réplica idéntica.

## Dirección de esta edición

**Idea:** una invitación de viaje que abre con los nombres y una tarjeta de embarque. El invitado descubre fecha, lugares y celebración y confirma mediante el flujo autorizado de Enkarta.

**Identidad:** laguna `#153e45`, papel `#f4f1e8`, bruma `#dce8e3` y arcilla `#af6550`; tipografía Baskervville y Raleway local. La entrada fotográfica da paso a una portada asimétrica y bandas editoriales amplias. Esta paleta pertenece a Travesía y no cambia el portal ni otras invitaciones.

**Primer pantallazo:** en escritorio, nombres grandes a la izquierda sobre la costa imaginaria y tarjeta con destino, fecha y acción a la derecha; en móvil, nombres arriba y tarjeta abajo. Al entrar, los nombres y la fotografía ocupan columnas distintas en escritorio y se apilan en móvil.

**Recorrido:** bienvenida → invitado verificado, cuando existe → familias → fecha/cuenta regresiva → ceremonia y recepción → imagen de celebración y vestimenta → itinerario → historia con imagen de recuerdos → adultos y regalos, solo si se configuran → fotografías → RSVP → Enkarta.

**Interacción:** apertura de 650 ms, inmediata con movimiento reducido; foco al H1, contenido inerte y scroll bloqueado únicamente mientras la entrada permanece cerrada. La confirmación procede del servidor; la muestra explica que no envía una respuesta. No interpreta nombres ni cupos desde parámetros libres de URL.

**Cierre:** revisión agrupada de escritorio/móvil, pruebas relacionadas, fuentes y recursos verificados, documentación y confirmación del despliegue. Se omite una ronda de propuestas visuales porque el usuario ya indicó la referencia de viaje, la independencia y el uso de nuevas imágenes.

## Imágenes nuevas y procedencia

Tres fotografías sintéticas creadas con la herramienta integrada `image_gen`, sin imagen de referencia: costa imaginaria, papelería de viaje y celebración en un jardín imaginario. Los prompts completos y los hashes están en [travesia-images.json](assets/travesia-images.json). No se copiaron fotografías, ilustraciones, sellos, monogramas, datos personales ni formularios de Passport.

Los PNG originales se conservan sin cambios en `assets/generated/travesia/2026-10/`. Las copias WebP de distribución conservan el contenido y las dimensiones (1536×1024): solo cambia la codificación. Se sirven desde `public/invitations/travesia/`, con 1.155.276 bytes en total. Los PNG maestros se excluyen de Vercel y no se publican. Los originales archivados de otras invitaciones permanecen intactos; estos tres recursos nuevos no se registran como originales de Invitali.

La muestra indica que sus imágenes son generadas y sus lugares ficticios. Esta procedencia no es una certificación legal sobre la totalidad de un diseño. El editor permite reemplazar portada, imagen de historia e imagen de celebración; los valores vaciados no restauran la muestra.

## Constructor y controles

Nombres, fecha, padres, lugares e itinerario usan los campos existentes. La portada y música se editan en Fotos y música; la entrada en Config. Los campos propios de Travesía añaden ciudad, mensajes y las dos imágenes interiores. Sus cambios se fusionan mediante el borrador vigente y conservan la configuración ajena.

`premiumFor()` resuelve el componente nuevo antes que Passport. La página pública monta una sola entrada y suministra el RSVP autorizado al cierre interior. El override cinematográfico conserva la entrada compartida. La vista previa muestra la acción de muestra interior y no duplica el formulario exterior.

La música empieza sin pista seleccionada, también en la página pública: Travesía no recibe automáticamente una canción del catálogo. Si el anfitrión elige una pista y su paquete la habilita, se utiliza el controlador multimedia existente. Las demás variantes conservan su comportamiento.

BCP sigue desactivado. La variante no incluye cuentas de demostración, QR bancarios ni operaciones de pago.

## Comprobaciones

- Perfil y procedencia: 8 pruebas.
- Página pública, RSVP y enlaces: 28 pruebas, incluidos entrada nativa/cinematográfica, cupos verificados y música de Travesía sin alterar el fallback de otras variantes.
- Campos del constructor: 29 pruebas, incluida fusión de texto e imágenes, vaciados y rechazo de callbacks obsoletos.
- Protección de recursos del despliegue: 5 pruebas.

Total: **70 pruebas relacionadas**. TypeScript local aprobado. Revisión local a 1440×900 y 390×844: entrada, portada, imágenes, itinerario, cierre, foco, desplazamiento y aviso de muestra comprobados; sin desbordamiento horizontal. La imagen principal carga de inmediato y las interiores de forma diferida.

La muestra independiente se publica en `/muestra/travesia`, sin indexación. `?full=1` omite la entrada. Añadirla al catálogo comercial o al selector de Socios es un paso separado, como en Azure de referencia.

## Entrega en producción · 23 de octubre de 2026

[Ver Travesía](https://enkarta.vercel.app/muestra/travesia). Código de aplicación `b295c525609ad05e8f368e0d43dbf2f33ac07ce3`, despliegue `dpl_Be8umqqmxcCxeeqgQLy74jos4uEm`, Ready y confirmado desde el dominio canónico. Vercel completó compilación, lint y tipos, con las advertencias existentes de imágenes. Se atestaron 47 archivos críticos, los 166 originales anteriores y los tres derivados nuevos; los tres PNG maestros permanecen sin publicar.

Verificación de lectura en producción: muestra con entrada, muestra completa y parámetros de nombre/cupos falsificados sin efecto. Las tres imágenes nuevas devolvieron WebP con bytes y SHA-256 idénticos al manifiesto. El navegador confirmó apertura y foco, las tres imágenes cargadas, composición sin desbordamiento a 1440×900 y 390×844, ausencia de música no seleccionada y aviso de confirmación de muestra sin envío. No se crearon eventos, cuentas ni pagos y no hubo datos ficticios que eliminar. Se cerró el servidor local y se restauró el viewport.

Atlas, Lunaria, Verdealma, Azure y Paradise conservan sus fuentes de diseño; los 166 recursos existentes mantienen sus bytes. BCP sigue bloqueado. Evidencia resumida: [travesia-production-2026-10-23.json](evidence/travesia-production-2026-10-23.json). Capturas locales en `tmp/travesia-release-20261023/visual/`; no sustituyen aceptación manual en un dispositivo físico.
