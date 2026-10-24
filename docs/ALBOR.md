# Albor · jardín luminoso y aro floral

Variante independiente inspirada en [Euforia de Invitali](https://invitali.com/euforia/), con `config.designKey = 'albor'` y familia SQL `euforia`. Conserva Terracota y las demás invitaciones. Ruta `/muestra/albor`; `?full=1` abre el interior y `?preview=1` ofrece una vista silenciosa sin movimiento decorativo. No se añade automáticamente al catálogo comercial o al selector de Socios.

## Dirección y composición

Modo de la superficie: experiencia. La referencia abierta se observó en escritorio a 1440×900: fotografía izquierda, frase sobre aro floral con nombres caligráficos a la derecha, papel marfil y serif de cuerpo. El intento de reducir el ancho de la pestaña de referencia conservó 1440×900; no se certifica una observación móvil renderizada de la fuente ni identidad píxel a píxel. Albor sí se revisó a 1440×900 y 390×844.

La paleta propia conserva el papel `#f9f6ef`, acento decorativo `#8e6f55`, bronce oscuro `#67513e` y tinta `#493c30`. La frase pequeña usa el bronce oscuro: 6,89:1 sobre el papel; el acento decorativo queda para los nombres grandes y adornos. Romantic Lovely, Cormorant Infant, Great Vibes, Apple Chancery, Raleway y Cormorant Garamond son fuentes originales archivadas y configuradas localmente. El cuerpo mide 22 px en escritorio y 21 px en móvil; los controles tienen objetivos de al menos 44 px.

El sobre solicitado reutiliza hojas reales con aro botánico y lacre floral verde. Las fotografías nuevas muestran una pareja adulta ficticia en un jardín de día; la frase es propia y editable, sin atribución bíblica inventada. La fecha es el 22 de abril de 2028 y todos los lugares son de muestra. No se copian invitados, fotografías personales, cuentas bancarias ni QR de pago de la referencia.

## Fotografías y originales

Tres fotografías nuevas generadas con la herramienta integrada `image_gen`, sin imágenes de referencia: retrato de pareja en jardín, paseo de la mano y mesa de celebración con flores marfil. Los PNG maestros están en `assets/generated/albor/2026-10/` y las distribuciones WebP en `public/invitations/albor/`. Cada archivo mide 1536×1024; los WebP suman 905.710 bytes. Prompts, textos alternativos y SHA-256: [albor-images.json](assets/albor-images.json).

Se conservan 191 originales heredados y se agregan siete: JSON introductorio de abril de 2024, música, aro floral, tres ornamentos SVG y Cormorant Garamond normal. El lock contiene 198 originales. Hojas, lacre, follaje de cuerpo, otras fuentes y restantes JSON ya estaban archivados; no se descargaron nuevamente.

La introducción usa exactamente `https://invitali.com/wp-content/uploads/2024/04/Animation-1714111678127.json`, de 19.001 bytes, 450×450 y 93 cuadros a 30 fps. Es distinta del original de corazones de mayo de 2024 aportado por el usuario. Conserva su paleta original salvo una personalización explícita de instancia. El mapa tiene 16 roles; los siete momentos del itinerario son ceremonia, primer baile, brindis, cena, fiesta, pastel y despedida. Traje y vestido tienen configuraciones separadas. Tamaño, velocidad y color se aplican a instancias sin alterar los bytes originales.

El separador `https://invitali.com/wp-content/uploads/2024/04/Recurso-60SEparador.png` devuelve HTTP 404 y se omite visualmente. El alias heredado del mapa queda documentado como recurso de biblioteca y no se usa para simular identidad. Procedencia completa: [albor-originals.json](assets/albor-originals.json), `Iconos INVITALI/albor-recursos.json` y `src/lib/albor-assets.ts`.

## Edición e interacción

Catorce campos de texto propios, dos imágenes de sección y ocho controles de iconos se integran en el constructor. Vaciar contenido o personalizar listas no restaura datos de muestra. Los textos de galería permanecen asociados a su fotografía. La fecha de fin del calendario es el día siguiente, como límite exclusivo.

El sobre contiene el foco y mantiene el interior `inert` hasta abrir. Permite música o silencio; Escape abre sin música y los dobles toques no repiten la acción. La música requiere gesto del usuario. Originales y revelados respetan movimiento reducido, ahorro de datos, pestaña oculta, vista previa y desmontaje. El contenido permanece visible si no se ejecutan los efectos.

La muestra no envía confirmaciones. Los parámetros externos no fabrican invitados ni pases; la publicación real conserva los formularios y permisos de servidor de Enkarta. BCP continúa desactivado.

## Verificación proporcional

32 regresiones propias (11 de perfil/SSR/editor/ruta/procedencia, diez de entrada, cuatro de reproducción y siete de revelados), 36 de controles de iconos y cinco de distribución: **73 aprobadas**. TypeScript aprobado. No se ejecutó la suite completa.

Revisión local agrupada: sobre, cabecera, apertura con música y pausa, siete JSON de itinerario listos con SVG, legibilidad y ausencia de desbordamiento horizontal a 1440×900 y 390×844. Capturas en `tmp/albor-release-20261023/visual/`. No sustituyen aceptación en un teléfono físico.

El detector de Impeccable señaló dos colores y siete fuentes/alias respecto del portal. Son decisiones locales documentadas, no instrucciones para normalizar las otras invitaciones. La entrega utiliza subida incremental y excluye físicamente maestros, documentación, skills y archivos `.env` del paquete enviado a Vercel.
