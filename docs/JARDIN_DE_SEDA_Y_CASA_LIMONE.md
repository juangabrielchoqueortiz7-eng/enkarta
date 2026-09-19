> Actualización: Casa Limone fue sustituida por **Votos** a petición del usuario. Se conserva la ruta `/muestra/casa-limone` para los enlaces existentes. La descripción mediterránea de abajo es histórica.
>
> Votos usa apertura de papel con sello, fotografía envolvente y caligrafía blanca sobre degradado, tonos marfil y taupe, parallax fotográfico, revelados suaves, línea de itinerario que avanza con el scroll y aparición escalonada del álbum. No renderiza limones ni cerámica. Los recursos de limonero permanecen archivados, sin uso en esta invitación. El constructor conserva invitados, pases, fechas, sedes, RSVP y encuadres editables.
>
> Verificación de esta revisión: TypeScript y lint de los archivos modificados sin errores; 73 pruebas aprobadas. Portada revisada en móvil y escritorio durante el trabajo. La última revisión visual del recorrido completo quedó pendiente porque la revisión automática del navegador bloqueó el acceso por límite de uso. No afirmar verificación visual completa de esta versión.

# Jardín de Seda y Casa Limone

Dos composiciones originales añadidas el 10 de septiembre de 2026. No sustituyen las réplicas anteriores ni las cinco propuestas previas.

- `/muestra/jardin-de-seda`: sobre floral con sello, portada partida de foto y caligrafía, tarjeta de invitado, dos lugares en arco, programa horizontal, galería uniforme de seis fotos y confirmación.
- `/muestra/casa-limone`: postal abatible, portada de papelería con cerámica y limonero, relato con fotografía, invitado en postal, programa vertical, álbum de seis fotos y confirmación en dos columnas.
- `?full=1` omite la apertura. `?m=Familia%20Pérez&n=3` personaliza la muestra. Las publicaciones utilizan `activeGuest` y los contratos normales del sistema.

Ambas se eligen en el catálogo y usan renderizadores independientes. Los datos de nombres, fechas, familiares, sedes, invitados, pases, itinerario, vestimenta, regalos y música utilizan los campos habituales. En contenido están las secciones visibles, textos, álbum, acuarela y encuadres. En elementos están los iconos originales, color y velocidad. La galería respeta el límite del paquete. El formulario reutiliza `ConfirmationForm`; las muestras no escriben respuestas reales.

Los tres corazones siguen usando el JSON original archivado. Las acuarelas se crearon con la herramienta incorporada **image_gen** (modo builtin), con alfa real, y se guardaron como PNG original y WebP de distribución. No son recursos originales de Invitali. Los diseños reutilizan fotografías de muestra ya archivadas de Nicole/Francisco y María/Mario; las fotografías no se presentan como creaciones nuevas. Se reemplazan desde el constructor.

## Archivos de ilustración

- `public/invitations/jardin-de-seda/botanica-original.png` y `botanica.webp`.
- `public/invitations/casa-limone/limonero-original.png` y `limonero.webp`.
- PNG: 1024 × 1536, RGBA. WebP: conversión calidad 90 conservando transparencia. No se alteraron los originales de la biblioteca de Invitali.

## Prompt de Jardín de Seda

Create a premium wedding stationery botanical illustration asset, portrait 2:3 composition, transparent background (real alpha), no text, no letters, no frame, no typography. A single gracefully flowing asymmetrical branch arrangement: fine dusty olive eucalyptus and delicate branching leaves, ivory white garden roses, a few blush pink ranunculus and tiny pale cream buds, painted in sophisticated translucent watercolor with visible fine pigment and very delicate graphite botanical veins. Organic shape rising from lower left to upper right, lots of transparent negative space around branch. Muted romantic palette, high-end fine art wedding invitation commissioned watercolor, natural and airy, not cartoon, not vector line art, not clipart, not neon, not plastic. Botanical sprig should occupy ~70% of image with no cropping of any petals or leaves. This will be layered on warm ivory wedding webpage margins; preserve beautiful small details and soft translucent petal edges.

## Prompt de Casa Limone

Create an original fine-art wedding stationery illustration asset, transparent background with real alpha, portrait 2:3. An airy graceful lemon tree branch with three beautiful pale golden yellow lemons, glossy natural deep sage and dusty blue-green leaves, tiny ivory citrus blossoms, delicate stems. Hand painted sophisticated Italian botanical watercolor with translucent pigment, nuanced natural shading and subtle paper granulation on painted areas only. Arrange diagonally from lower left to upper right, clean generous transparent space around it, entire branch visible, no cropped elements. Elegant Amalfi wedding stationery illustration. No text, no logo, no borders, no mockup, no objects besides botanical branch, no solid background. Refined, romantic, natural botanical proportions, not cartoon or flat clipart, no neon colors. High detail.

## Verificación

TypeScript sin errores; 73 pruebas del constructor aprobadas. Verificadas aperturas, galería modal y respuesta de muestra en ambas composiciones. Revisadas las vistas móvil (390 px) y escritorio, sin imágenes rotas ni desbordamiento horizontal. Lint mantiene avisos preexistentes en otras páginas. Los formularios de producción mantienen el flujo existente; no se enviaron respuestas a eventos reales.


## Separadores propios (10 de septiembre de 2026)
Jardín de Seda incorpora bordes de pétalos superpuestos sobre la fotografía de portada y las secciones de lugares y confirmación. Votos utiliza curvas amplias en tres capas, similares a pliegues de tela, en portada, lugares y confirmación. Los trazados SVG son propios y decorativos; no sustituyen ningún JSON original. Se ajustan al ancho móvil y no reciben eventos de puntero.
