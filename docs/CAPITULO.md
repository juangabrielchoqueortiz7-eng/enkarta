# Capítulo · edición editorial

Variante independiente sobre la familia SQL `primicia`, con `config.designKey = 'capitulo'`. La invitación Primicia/Áurea, sus presets y sus recursos permanecen intactos. Referencia de estructura: [Primicia de Invitali](https://invitali.com/muestra-primicia/), observada en navegador el 23 de octubre de 2026. La petición de imágenes nuevas se aplica con composición, fotografías y textos propios; esta edición no se presenta como una réplica idéntica.

## Dirección de esta edición

Una invitación como edición especial de una historia compartida: papel `#f8f7f3`, tinta `#242825`, piedra `#e4e1d9` y acento `#8c453b`. Baskervville y Raleway se sirven desde los archivos locales existentes. La revisión del usuario incorpora un sobre de papel con solapa, sello tipográfico y carta, y centra la composición. La portada conserva cabecera editorial, fecha, nombres y fotografía. El itinerario prescinde de líneas divisorias; las reglas de la cabecera pertenecen únicamente a esta edición.

Recorrido: portada → bienvenida → invitado verificado, si existe → fecha y cuenta regresiva → historia → familias → celebración → itinerario y vestimenta → lugares → adultos, si se configura → galería de la pareja → fotografías compartidas → RSVP → regalos, solo con datos del anfitrión → Enkarta.

La apertura del sobre dura 800 ms, o es inmediata con movimiento reducido o ahorro de datos. Conserva foco, límite inerte y bloqueo de scroll únicamente mientras la entrada está cerrada. El RSVP recibe el formulario autorizado por el servidor; los parámetros libres de nombre o cupos no autorizan invitaciones. La muestra explica que no envía confirmaciones.

Se omite una ronda de alternativas porque el usuario ya eligió continuar con otra referencia, con recursos nuevos y variantes independientes. El cierre usa una inspección agrupada móvil/escritorio, pruebas pertinentes y un único despliegue.

## Imágenes nuevas y procedencia

Tres fotografías sintéticas generadas con `image_gen`, sin imágenes de referencia: una pareja adulta ficticia, un cuaderno de votos en blanco y un patio imaginario para la celebración. Los prompts completos, dimensiones y hashes están en [capitulo-images.json](assets/capitulo-images.json).

Los PNG maestros permanecen sin alteración en `assets/generated/capitulo/2026-10/`. Las copias WebP de distribución mantienen contenido y dimensiones de 1536×1024; solo cambia la codificación. Suman **637.786 bytes** y se sirven desde `public/invitations/capitulo/`. Los PNG maestros y documentos no se publican en Vercel. Estos medios no se registran como originales de Invitali ni sustituyen los existentes. La muestra informa de las imágenes creadas con IA y los lugares ficticios; la procedencia no constituye una certificación legal del diseño completo.

## Constructor e integración

Los campos existentes editan nombres, fecha, familias, lugares e itinerario. Fotos y música controla la portada y la pista elegida; Config controla la entrada. Los campos propios añaden ciudad, mensajes y dos imágenes interiores. Las actualizaciones se fusionan con el borrador vigente; vaciar texto o imágenes conserva ese valor sin restaurar la muestra.

`premiumFor()` resuelve Capítulo antes que Primicia. La ruta pública monta una sola entrada y un único RSVP interior; la variante cinematográfica mantiene la entrada compartida. La vista previa utiliza la acción de muestra sin duplicar el formulario exterior.

Los nuevos borradores y la muestra incluyen Perfect · violín, ya archivada. La página pública conserva la pista configurada; vaciarla mantiene el silencio. El audio comienza al abrir con música o al usar su control. «Abrir sin música» y Escape abren el sobre en silencio. Las otras variantes conservan su comportamiento musical. BCP permanece bloqueado y no hay cuentas o QR bancarios de muestra.

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

## Corrección de secciones y animaciones

La primera entrega omitió los Lottie de la referencia y dejó el itinerario como lista textual; también faltó el carrusel de la pareja. Esta corrección incorpora los originales exactos identificados en el DOM de Primicia, con sus patrones de reproducción: novia y novio para las familias; iglesia, recepción, vals, cena, baile y despedida para los seis pasos; traje y vestido; ubicación; adultos; recepción en RSVP; regalo. El contrato de cada URL completa y ruta local vive en `src/lib/capitulo-assets.ts`.

Se reutilizaron los originales existentes y se adquirieron únicamente `2025/05/novia.json`, `2025/05/marido.json` y `2025/05/Lugar-03.json`. La novia coincide por SHA-256 con el archivo previo sin procedencia; ahora queda identificada por la URL exacta. Los tres conservan bytes originales en la carpeta maestra y se importaron mediante `scripts/import-invitali-originals.cjs`, con hash en los manifiestos y en el lock de distribución. Se conservaron las 166 entradas previas y se añadieron tres: 169 en total. No se añadieron corazones ni un calendario aproximado, que no pertenecen a esta referencia.

El reproductor de Capítulo carga al acercarse al viewport, respeta movimiento reducido y ahorro de datos, pausa fuera de vista o con la pestaña oculta y no sustituye un original ausente por un dibujo. Colores, tamaño y velocidad se aplican a la instancia sin reescribir el archivo. El itinerario respeta `icon`, `iconColors` e `iconSpeed`; los nueve controles de sección tienen una rama exclusiva de Capítulo. Quitar un icono lo mantiene vacío, las imágenes propias seguras siguen admitidas y las respuestas obsoletas no restauran recursos anteriores.

La galería usa `galleryImages` y sus leyendas vinculadas a cada foto, limita la cantidad según el paquete y ofrece anterior, siguiente y pausa. Sus tres imágenes de muestra son las fotografías generadas ya conservadas; no se descargaron fotos adicionales. Vaciar la galería no restaura los valores de muestra. La muestra de regalos no contiene cuentas ni QR bancarios y BCP permanece bloqueado.

Procedencia versionada de los trece roles: [capitulo-originals.json](assets/capitulo-originals.json). No se publican los manifiestos maestros históricos completos. La corrección pasó 18 pruebas de Capítulo/reproducción, 36 de iconos de sección, 33 del importador y 5 de protección de despliegue: **92 pruebas puntuales**, además de TypeScript. El importador se verificó fuera del sandbox porque sus pruebas de junctions requieren esa capacidad de Windows. La revisión local a 1440×900 y 390×844 confirmó el itinerario con JSON renderizados, la vestimenta, los lugares y la navegación del carrusel con la leyenda de la foto 2/3, sin desbordamiento horizontal.

### Corrección publicada y verificada

Código `82e970789b48825ec028d05685a3382d05e51394`, despliegue Ready `dpl_6t25AZxfNctqMQ7fEgijSb62F99q`, confirmado desde `enkarta.vercel.app`. Compilación, lint y tipos aprobados; 59 archivos críticos atestados. Se verificaron los 169 originales distribuidos, incluidos los 166 anteriores intactos; los tres PNG/WebP de Capítulo y Travesía conservan sus bytes.

Cuatro modos públicos pasaron la comprobación HTTP: entrada, muestra completa, preview y parámetros falsificados. Los tres nuevos JSON y las tres fotografías devolvieron sus hashes previstos. El navegador de producción confirmó las 15 instancias Lottie listas con SVG, los seis pasos del itinerario y un cambio real de cuadro del vals. Escritorio y móvil no presentaron desbordamiento; el carrusel avanzó a 2/3 con su leyenda asociada y el RSVP de muestra informó que no envió confirmación. No se observaron errores de consola. No hubo cuentas, eventos, pagos ni mensajes creados y no quedó limpieza de datos pendiente. BCP sigue bloqueado.

Evidencia de esta corrección: [capitulo-motion-production-2026-10-23.json](evidence/capitulo-motion-production-2026-10-23.json). Capturas en `tmp/capitulo-motion-20261023/visual/`, con el itinerario completo a 1440×1100 y revisión móvil a 390×844. El servidor local está detenido y el viewport restaurado.

## Revisión de centrado, sobre y legibilidad

El usuario pidió sustituir la entrada fotográfica por un sobre, añadir música, aumentar la letra móvil, centrar las secciones y retirar las líneas del itinerario. La nueva composición conserva la paleta, las tres fotografías generadas y los JSON originales. El sobre es geometría CSS propia: solapa, carta y sello tipográfico con las iniciales del evento. Tiene apertura de 800 ms, inmediata con movimiento reducido o ahorro de datos, y ofrece la etiqueta de apertura configurada y «Abrir sin música». Escape abre en silencio. Los dos botones conservan el foco dentro de la entrada y el contenido permanece inerte hasta abrir.

La pista del nuevo preset es `/audio/invitali-originales/2025-05-Ed-Sheran-Perfect-Violin.mp3` (1.287.764 bytes; SHA-256 `3c620d851139ead919cb446cff2a646661325e50507d3cdfbf662cb75d0d8c8c`). Se reutiliza el archivo archivado. El gesto inicia el audio antes de la transición; el botón flotante permite pausar y reanudar. No hay autoplay al montar. Los borradores con pista vaciada permanecen silenciosos y el permiso del paquete continúa aplicándose.

Fecha, contador, familias, historia, lugares, galería y RSVP se centran. Día, mes y año se apilan. El cuerpo móvil usa 16 px, las horas 15–16 px y las etiquetas auxiliares al menos 12 px. El itinerario distribuye seis momentos sin bordes ni líneas: tres columnas en computadora y una en móvil y en el lienzo estrecho del constructor. Ambas familias muestran el señor formal aprobado por el usuario, con etiquetas de familia de la novia y del novio y ajustes independientes; el original de la novia continúa conservado en la biblioteca.

Los revelados de sección mantienen el contenido visible por defecto y comienzan después de abrir el sobre. Se desactivan en vista previa, movimiento reducido, ahorro de datos o preset sin movimiento, y cancelan observadores y animaciones cuando la página se oculta o desmonta. No se modifican los efectos de otras invitaciones.

Comprobaciones: 14 pruebas del perfil y sus medios, 6 del reproductor de JSON, 9 de apertura/teclado/audio del sobre, 36 de iconos de sección y 5 de protección del despliegue: **70 pruebas relacionadas**. TypeScript aprobado. La revisión local agrupada a 1440×900 y 390×844 confirmó sobre completo, reproducción real y pausa del violín, apertura silenciosa, fecha y contador centrados y seis momentos sin bordes. Capturas en `tmp/capitulo-centered-20261023/visual/`; no sustituyen pruebas físicas en Android/iOS.

### Revisión publicada y verificada

Aplicación `662c03825fe879d56629e664f62ad796cf430e04`, despliegue Ready `dpl_3zYrHyhxmC3CF5j5SjRti9aprcAJ`. El dominio canónico confirmó esa versión. Vercel aprobó compilación, lint y tipos; se atestaron 60 archivos críticos y la preservación exacta de los 169 originales y de las fotografías generadas frente al estado anterior.

La verificación pública cubrió cuatro modos y los hashes de las tres fotografías. En el navegador de producción se confirmó la solapa animada del sobre, sus dos opciones y la apertura silenciosa con foco al H1; también reproducción real del violín y pausa desde el control. En móvil, día/mes/año y contador comparten el centro del lienzo, el texto usa 16 px y las horas 15 px, y las seis filas no tienen bordes. En escritorio se verificaron las secciones centradas y el itinerario en tres columnas. Ambas familias cargaron el JSON de adulto formal, sin la novia incorrecta. No se observaron errores de consola.

El navegador se reconectó durante la verificación; las observaciones finales de composición y controles se guardaron después de reconectar. No hubo datos de prueba guardados, pagos ni mensajes, y no quedó limpieza de datos pendiente. El servidor local está detenido y el viewport restaurado. BCP sigue bloqueado. Evidencia: [capitulo-centered-production-2026-10-23.json](evidence/capitulo-centered-production-2026-10-23.json). El enlace principal abre el sobre; `?full=1` continúa disponible para saltarlo expresamente.

## Corrección del sobre rechazado y las familias

El sobre geométrico y el sello circular tipográfico de la revisión anterior fueron rechazados por el usuario. Se sustituyen por los recursos exactos de la entrada pública de Paradise, observada a 1440×900 y 390×844: dos hojas blancas con relieve, ancladas a la unión central y cubriendo cada mitad del viewport; un lacre verde fotográfico de 100 px con flores doradas. No se renderizan los titulares grandes ni el botón rectangular anterior. La acción «Ver invitación» conserva la elección musical y «Abrir sin música» permanece discreta. El foco de teclado se delimita alrededor del lacre.

Las tres imágenes ya formaban parte de los 169 originales archivados. No se descargaron, reimportaron ni modificaron recursos. Su contrato de URL completa, ruta, SHA-256, bytes y dimensiones está en [capitulo-entry-originals.json](assets/capitulo-entry-originals.json). Los originales de la novia y el novio siguen disponibles en la biblioteca, pero las familias de Capítulo muestran solo nombres y etiquetas. Se retiran los dos controles de avatar que ya no tendrían efecto, conservando intacta la configuración heredada.

La apertura mantiene 800 ms, movimiento reducido, ahorro de datos, bloqueo de doble gesto, foco al H1, contenido inerte y limpieza de temporizadores. Las fotografías generadas, el violín, las animaciones interiores, el centrado y el resto de variantes se conservan. Regresiones: 15 del perfil y procedencia, 6 de JSON, 9 de entrada y audio, 36 de controles del constructor y 5 de despliegue: 71 pruebas puntuales aprobadas. La revisión local confirmó entrada móvil y escritorio, música real y pausa, apertura silenciosa y familias sin imágenes. Las capturas se conservan en `tmp/capitulo-lacre-20261023/visual/`.
