# Capítulo · edición editorial

Variante independiente sobre la familia SQL `primicia`, con `config.designKey = 'capitulo'`. La invitación Primicia/Áurea, sus presets y sus recursos permanecen intactos. Referencia de estructura: [Primicia de Invitali](https://invitali.com/muestra-primicia/), observada en navegador el 23 de octubre de 2026. La petición de imágenes nuevas se aplica con composición, fotografías y textos propios; esta edición no se presenta como una réplica idéntica.

## Dirección de esta edición

Una invitación como edición especial de una historia compartida: papel `#f8f7f3`, tinta `#242825`, piedra `#e4e1d9` y acento `#8c453b`. Baskervville y Raleway se sirven desde los archivos locales existentes. La entrada divide texto y fotografía en escritorio; en móvil, la fotografía cierra la pantalla. La portada organiza cabecera editorial, fecha, nombres y una fotografía junto al mensaje de apertura. Las reglas finas y dobles pertenecen a esta edición, sin trasladarse al portal.

Recorrido: portada → bienvenida → invitado verificado, si existe → fecha y cuenta regresiva → historia → familias → celebración → itinerario y vestimenta → lugares → adultos, si se configura → fotografías compartidas → RSVP → regalos, solo con datos del anfitrión → Enkarta.

La apertura dura 650 ms, o es inmediata con movimiento reducido. Conserva foco, límite inerte y bloqueo de scroll únicamente mientras la entrada está cerrada. El RSVP recibe el formulario autorizado por el servidor; los parámetros libres de nombre o cupos no autorizan invitaciones. La muestra explica que no envía confirmaciones.

Se omite una ronda de alternativas porque el usuario ya eligió continuar con otra referencia, con recursos nuevos y variantes independientes. El cierre usa una inspección agrupada móvil/escritorio, pruebas pertinentes y un único despliegue.

## Imágenes nuevas y procedencia

Tres fotografías sintéticas generadas con `image_gen`, sin imágenes de referencia: una pareja adulta ficticia, un cuaderno de votos en blanco y un patio imaginario para la celebración. Los prompts completos, dimensiones y hashes están en [capitulo-images.json](assets/capitulo-images.json).

Los PNG maestros permanecen sin alteración en `assets/generated/capitulo/2026-10/`. Las copias WebP de distribución mantienen contenido y dimensiones de 1536×1024; solo cambia la codificación. Suman **637.786 bytes** y se sirven desde `public/invitations/capitulo/`. Los PNG maestros y documentos no se publican en Vercel. Estos medios no se registran como originales de Invitali ni sustituyen los existentes. La muestra informa de las imágenes creadas con IA y los lugares ficticios; la procedencia no constituye una certificación legal del diseño completo.

## Constructor e integración

Los campos existentes editan nombres, fecha, familias, lugares e itinerario. Fotos y música controla la portada y la pista elegida; Config controla la entrada. Los campos propios añaden ciudad, mensajes y dos imágenes interiores. Las actualizaciones se fusionan con el borrador vigente; vaciar texto o imágenes conserva ese valor sin restaurar la muestra.

`premiumFor()` resuelve Capítulo antes que Primicia. La ruta pública monta una sola entrada y un único RSVP interior; la variante cinematográfica mantiene la entrada compartida. La vista previa utiliza la acción de muestra sin duplicar el formulario exterior.

No se selecciona música automáticamente, tampoco en la página pública. Una pista elegida se reproduce con el controlador existente y el permiso del paquete. Las otras variantes conservan su fallback musical. BCP permanece bloqueado y no hay cuentas o QR bancarios de muestra.

La ruta independiente es `/muestra/capitulo`, sin indexación. `?full=1` omite la entrada. Esta entrega no añade la variante al catálogo comercial ni al selector de Socios y no requiere migración SQL.

## Comprobaciones locales

- Capítulo y procedencia: 8 pruebas.
- Página pública, RSVP, enlaces y música: 30 pruebas.
- Campos del constructor y concurrencia: 30 pruebas.
- Protección de recursos del despliegue: 5 pruebas.

**73 pruebas pertinentes aprobadas**, además de TypeScript. La guardia real confirmó los 166 originales sin diferencias. Revisión local a 1440×900 y 390×844: entrada, jerarquía, historia, imágenes, cierre y acción RSVP de muestra; foco al H1 al abrir, sin desbordamiento horizontal, tres imágenes cargadas y ninguna canción no seleccionada. Capturas en `tmp/capitulo-release-20261023/visual/`. No sustituyen aceptación manual en dispositivos físicos.

## Entrega en producción · 23 de octubre de 2026

[Ver Capítulo](https://enkarta.vercel.app/muestra/capitulo). Código de aplicación `50bb45977a3f6203d2215eb5f9f8e5bbccefbefe`, despliegue `dpl_8JGfRHdA5byomo1PDczvaBuWyfis`, Ready y confirmado desde el dominio canónico. Vercel completó compilación, lint y tipos; permanecen las advertencias existentes de imágenes. Se comprobaron 54 archivos críticos, los 166 originales, las tres imágenes nuevas y las imágenes anteriores de Travesía; los PNG maestros permanecen excluidos de la publicación.

La verificación de lectura cubrió entrada, muestra completa, `preview=1` y parámetros falsificados sin efecto; las tres imágenes devolvieron WebP con los bytes y SHA-256 previstos. El navegador de producción confirmó apertura, foco al H1, carga de las imágenes y ausencia de desbordamiento a 1440×900 y 390×844. El RSVP de muestra informó que no envió confirmaciones, sin errores de consola observados.

No se crearon cuentas, eventos, pagos ni mensajes: no quedaron datos ficticios que eliminar. Se cerraron las pestañas de revisión local, se detuvo el servidor local y se restauró el viewport. Áurea/Primicia, Atlas, Verdealma, Lunaria, Paradise, Azure y Travesía conservan sus fuentes y recursos. BCP sigue bloqueado. Evidencia: [capitulo-production-2026-10-23.json](evidence/capitulo-production-2026-10-23.json).
