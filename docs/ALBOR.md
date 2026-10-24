# Albor · jardín luminoso y aro floral

Variante independiente inspirada en [Euforia de Invitali](https://invitali.com/euforia/), con `config.designKey = 'albor'` y familia SQL `euforia`. Conserva Terracota y las demás invitaciones. Ruta `/muestra/albor`; `?full=1` abre el interior y `?preview=1` ofrece una vista silenciosa sin movimiento decorativo. No se añade automáticamente al catálogo comercial o al selector de Socios.

## Dirección y composición

Modo de la superficie: experiencia. La referencia abierta se observó en escritorio a 1440×900: fotografía izquierda, frase sobre aro floral con nombres caligráficos a la derecha, papel marfil y serif de cuerpo. El intento de reducir el ancho de la pestaña de referencia conservó 1440×900; no se certifica una observación móvil renderizada de la fuente ni identidad píxel a píxel. Albor sí se revisó a 1440×900 y 390×844.

La paleta propia conserva el papel `#f9f6ef`, acento decorativo `#8e6f55`, bronce oscuro `#67513e` y tinta `#493c30`. La frase pequeña usa el bronce oscuro: 6,89:1 sobre el papel; el acento decorativo queda para los nombres grandes y adornos. Romantic Lovely, Cormorant Infant, Great Vibes, Apple Chancery, Raleway y Cormorant Garamond son fuentes originales archivadas y configuradas localmente. El cuerpo mide 22 px en escritorio y 21 px en móvil; los controles tienen objetivos de al menos 44 px.

El sobre solicitado reutiliza hojas reales y lacre floral verde. Los nombres y la fecha aparecen sin aro decorativo en el sobre; el aro original se conserva únicamente en la cabecera interior. El fondo vigente usa la acuarela original de Euforia como un póster continuo fijo a la ventana, con `cover` en escritorio y `contain` en móvil, sobre papel `#f9f6ef`. Cabecera y familias dejan ver ese mismo fondo. Se descartaron la banda salvia y las hojas verdes duplicadas de las iteraciones anteriores; no hay filtros, máscaras, espejos ni sombra añadida a la fotografía. En vista previa, el póster se pinta dentro del propio lienzo del constructor. Los archivos originales conservan sus bytes. Las fotografías nuevas muestran una pareja adulta ficticia en un jardín de día; la frase es propia y editable, sin atribución bíblica inventada. La fecha es el 22 de abril de 2028 y todos los lugares son de muestra. No se copian invitados, fotografías personales, cuentas bancarias ni QR de pago de la referencia.

## Fotografías y originales

Tres fotografías nuevas generadas con la herramienta integrada `image_gen`, sin imágenes de referencia: retrato de pareja en jardín, paseo de la mano y mesa de celebración con flores marfil. Los PNG maestros están en `assets/generated/albor/2026-10/` y las distribuciones WebP en `public/invitations/albor/`. Cada archivo mide 1536×1024; los WebP suman 905.710 bytes. Prompts, textos alternativos y SHA-256: [albor-images.json](assets/albor-images.json).

Se conservan 191 originales heredados y se agregan siete: JSON introductorio de abril de 2024, música, aro floral, tres ornamentos SVG y Cormorant Garamond normal. El lock contiene 198 originales. Hojas, lacre, follaje de cuerpo, otras fuentes y restantes JSON ya estaban archivados; no se descargaron nuevamente.

La introducción usa exactamente `https://invitali.com/wp-content/uploads/2024/04/Animation-1714111678127.json`, de 19.001 bytes, 450×450 y 93 cuadros a 30 fps. Es distinta del original de corazones de mayo de 2024 aportado por el usuario. Conserva su paleta original salvo una personalización explícita de instancia. El mapa tiene 16 roles; los siete momentos del itinerario son ceremonia, primer baile, brindis, cena, fiesta, pastel y despedida. Traje y vestido tienen configuraciones separadas. Tamaño, velocidad y color se aplican a instancias sin alterar los bytes originales.

El fondo vigente es `https://invitali.com/wp-content/uploads/2024/09/jairo-y-GabrielaRecurso-47cuerpo-1-copia.webp`, ya archivado en `/invitations/karla-y-mauricio/jairo-y-GabrielaRecurso-47cuerpo-1-copia.webp`: 308.336 bytes, SHA-256 `b1650a27e371642f625fd6f26b9fd051caad15354f4e160fbb1fdb0c59dfc6ab`. No se confunde con `48cuerpo`, que permanece intacto en la biblioteca y Serenata, pero ya no se usa en Albor. Las iteraciones históricas descritas al final se conservan como evidencia, no como especificación vigente.

El separador `https://invitali.com/wp-content/uploads/2024/04/Recurso-60SEparador.png` devuelve HTTP 404 y se omite visualmente. El alias heredado del mapa queda documentado como recurso de biblioteca y no se usa para simular identidad. Procedencia completa: [albor-originals.json](assets/albor-originals.json), `Iconos INVITALI/albor-recursos.json` y `src/lib/albor-assets.ts`.

## Edición e interacción

Catorce campos de texto propios, dos imágenes de sección y ocho controles de iconos se integran en el constructor. Vaciar contenido o personalizar listas no restaura datos de muestra. Los textos de galería permanecen asociados a su fotografía. La fecha de fin del calendario es el día siguiente, como límite exclusivo.

El sobre contiene el foco y mantiene el interior `inert` hasta abrir. Permite música o silencio; Escape abre sin música y los dobles toques no repiten la acción. La música requiere gesto del usuario. Originales y revelados respetan movimiento reducido, ahorro de datos, pestaña oculta, vista previa y desmontaje. El contenido permanece visible si no se ejecutan los efectos.

La muestra no envía confirmaciones. Los parámetros externos no fabrican invitados ni pases; la publicación real conserva los formularios y permisos de servidor de Enkarta. BCP continúa desactivado.

## Verificación proporcional

32 regresiones propias (11 de perfil/SSR/editor/ruta/procedencia, diez de entrada, cuatro de reproducción y siete de revelados), 36 de controles de iconos y cinco de distribución: **73 aprobadas**. TypeScript aprobado. No se ejecutó la suite completa.

Revisión local agrupada: sobre, cabecera, apertura con música y pausa, siete JSON de itinerario listos con SVG, legibilidad y ausencia de desbordamiento horizontal a 1440×900 y 390×844. Capturas en `tmp/albor-release-20261023/visual/`. No sustituyen aceptación en un teléfono físico.

El detector de Impeccable señaló dos colores y siete fuentes/alias respecto del portal. Son decisiones locales documentadas, no instrucciones para normalizar las otras invitaciones. La entrega utiliza subida incremental y excluye físicamente maestros, documentación, skills y archivos `.env` del paquete enviado a Vercel.

## Producción · 23 de octubre de 2026

Publicado [Albor](https://enkarta.vercel.app/muestra/albor) desde `6d8641b9274fb5435c67283ba75b04513c5cdb08`, despliegue `dpl_8GqJ97GqVEWX6t82BdQKKhAwWhkX` Ready. El dominio público se consultó por separado y apunta al mismo despliegue. Compilación, lint y tipos aprobaron con avisos no bloqueantes registrados en la evidencia.

La revisión del navegador de producción comprobó el sobre con sus dos opciones, apertura con música y pausa, apertura silenciosa con audio en cero, siete momentos listos con SVG y traje/vestido separados. Se observó un cambio real de cuadro del JSON introductorio de abril. La galería avanzó a «2 / 3» con «Los pequeños momentos» y la confirmación de muestra explicó que no envió respuestas. No hubo errores de consola ni desbordamiento horizontal a 1440×900 y 390×844; el cuerpo móvil conserva 21 px.

La captura automática de producción no devolvió imagen en escritorio ni móvil. Se conservan las capturas locales y la referencia de escritorio, junto con las lecturas del DOM, accesibilidad, audio y SVG publicado. Se registra esta limitación sin afirmar comparación visual completa de píxeles ni aceptación en un dispositivo físico.

Diez GET verificaron cuatro modos de muestra, los tres WebP por SHA-256 y tres rutas privadas con HTTP 404. La vista previa no monta audio y los parámetros falsificados no generan invitados ni pases. La atestación de los archivos realmente subidos verificó 41 fuentes críticas, 271 fuentes anteriores, los 198 originales y las quince fotografías previas. Los 191 originales heredados conservaron sus bytes. Los maestros y fuentes privadas quedaron fuera del paquete antes de subir; no se utilizó archivo comprimido de entrega.

Solo se usó contenido ficticio de muestra: no se crearon cuentas, eventos, confirmaciones, mensajes ni pagos; no hay datos pendientes de limpieza. El SQL 021 local del usuario quedó intacto y fuera del commit. BCP continúa desactivado. Registro sanitizado: [evidencia de producción](evidence/albor-production-2026-10-23.json).

## Ajuste solicitado del sobre y familias · 23 de octubre de 2026

El aro que rodeaba los nombres se quitó del sobre; nombres, fecha, hojas y lacre permanecen, y el aro original continúa en la cabecera interior. El pequeño fondo rectangular de familias se sustituyó por una superficie salvia de todo el ancho. El mismo follaje original aparece en bordes con mezcla y máscaras suaves, conservando sus bytes. Título y cuerpo superan 5,96:1 y 8,54:1 respectivamente sobre el fondo sólido calculado. No se modificaron otras variantes.

Se ejecutaron 22 pruebas pertinentes (12 de perfil, incluida una nueva regresión, y diez de entrada). No se repitió la suite completa. El cambio de runtime se limita a `Albor.module.css`. Impeccable produjo avisos de fuentes y colores del diseño independiente frente a los tokens del portal; la banda y sus colores son la decisión solicitada, documentada en DESIGN.md.

Publicado desde `2790bef11bf27b3f1fe8d8f047b9b43a0656458a`, despliegue `dpl_9F6KVXvyxbAsaQp6ch5pBJX8ra82` Ready, con compilación, lint y tipos aprobados. Alias público verificado por separado; 14 fuentes críticas, 281 fuentes de invitaciones/biblioteca intactas, 198 originales y 18 fotografías comprobados contra los hashes de los archivos subidos. Sin archivos maestros privados en la entrega y sin nuevas descargas.

Se comprobó en el DOM publicado el sobre sin fondo detrás de los nombres, el aro interior conservado, el fondo de familias, su máscara y ausencia de desbordamiento a 1440×900 y 390×844. La captura de familias de escritorio en producción sí se obtuvo; la del sobre móvil no estuvo disponible y se conserva su captura local. No hubo errores de consola ni escrituras de datos, pagos o mensajes; no requiere limpieza. BCP sigue desactivado. [Evidencia del ajuste](evidence/albor-polish-production-2026-10-23.json).

## Laterales del cuerpo · 23 de octubre de 2026

Ante la captura del usuario en pantalla amplia, se incorporó una composición botánica verde/dorada a ambos lados de las secciones interiores. El recurso `48cuerpo` ya archivado se mezcla con el papel y se desvanece hacia el centro. Una segunda máscara suaviza las uniones verticales; el lado derecho se desplaza para evitar una simetría rígida. La opacidad es 0,68 en escritorio y 0,18 en móvil y contenedores pequeños. El centro mantiene su fondo de lectura; la foto en arco gana una sombra suave. No se añaden descargas, imágenes nuevas ni cambios en música o JSON.

Se extendió una regresión existente y aprobaron las 22 pruebas pertinentes (12 de perfil y diez de entrada). Revisión local agrupada en 2560×1200 y 390×844, con una ronda de corrección para las uniones del fondo. El detector informó fuentes/colores propios ya documentados frente al portal, sin justificar cambios en otras invitaciones.

Publicado desde `fa8cb3fdb6ba2e6c2ac918603d7012115c2fe297`, despliegue `dpl_e1jRLdeawc8riL5Jky8dist6i5U5` Ready. Compilación, lint y tipos aprobaron, y el alias público coincide. La verificación de archivos subidos conserva 198 originales, 18 fotografías y 281 fuentes anteriores; solo cambió el CSS de Albor en runtime. Maestros y documentación privada quedaron físicamente excluidos.

El DOM de producción confirmó el recurso, las dos máscaras, las opacidades de escritorio/móvil, ausencia de desbordamiento y sobre sin aro decorativo. La captura pública amplia no estuvo disponible: se conserva la captura local final y no se certifica identidad de píxeles ni aceptación física. Cero errores de consola, escrituras o datos pendientes de limpieza. BCP sigue desactivado. [Evidencia de los laterales](evidence/albor-body-production-2026-10-23.json).
