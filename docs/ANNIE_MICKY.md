# Annie y Micky · Jardín editorial

Muestra: /muestra/annie-y-micky. Constructor: /admin/new → Annie y Micky → Usar y editar.

Inspiración estructural: https://invitali.com/239-annie-y-micky/?id=D1xaaR . La referencia muestra un ID inválido en su confirmación y su sobre no respondió a Ingresar en esta revisión; se pudo inspeccionar la estructura y estilos del documento. La nueva muestra usa la confirmación propia de Enkarta en modo demostración.

Nueva dirección gráfica: marfil, oliva, composición editorial, sello y rama SVG creados en código. Textos redactados de nuevo y datos de ejemplo; no se reutilizan fotografías, video, música, enlaces de regalo ni formularios de la pareja original. La portada utiliza fotografía en lugar del video ajeno. La música se puede añadir desde Medios.

## Fotografías originales
Generadas con la herramienta image_gen integrada, sin fotografías de referencia. Sujetos ficticios. Tres generaciones independientes, sin collage. Originales conservados en la carpeta generated_images de Codex; derivados WebP de calidad 82, sin recorte, guardados en public/invitations/annie-micky.

- jardin.webp: pareja ficticia adulta caminando de la mano en jardín mediterráneo, vestido marfil y traje beige, villa de piedra y olivos, luz natural, fotografía editorial vertical 2:3 sin texto ni marcas. Original exec-4bd3233a-5758-4af2-b5b9-4d06ccc1763e.png.
- manos.webp: detalle de manos entrelazadas, anillos dorados, ramo de rosas marfil y olivo, seda y lino beige, luz natural; sin rostros, texto ni marcas. Original exec-a1ba2bca-0c97-4db4-918b-fe4b2839e710.png.
- celebracion.webp: mesa de boda bajo olivos, lino marfil, velas de latón, cristal, flores blancas y servilletas verdes, sin personas ni marcas. Original exec-4fb71923-705b-4080-a973-d62cf0b6c56f.png.

## Edición
La variante usa designKey annie-y-micky sobre la base SQL dolcevita. Sus ajustes viven en config.annieMicky, independientes de Laura y Andrés. Nombres, fecha, lugares, familia, padrinos, itinerario y regalos usan los campos habituales. Textos, secciones, colores de vestimenta, carruseles, sello y separador tienen controles específicos. Los JSON de la biblioteca se pueden cambiar y recolorear desde Elementos; no necesitan acceso a Invitali. La estructura conserva la composición; no es un lienzo de bloques libres.

Compartir fotos, lista de regalos, hospedaje y música aparecen al configurar sus datos y según los servicios contratados. Los datos y enlaces de ejemplo deben reemplazarse antes de publicar. El presupuesto de fotos se comparte entre galería y carruseles; reutilizar una foto no consume otro cupo.

## Validación
Guardado y reapertura probados con los paneles reales en /dev/invitation-quality, sin crear registros en la base de datos. Cambio del título y ocultación de galería preservados. Tests de persistencia, independencia de medios, catálogo y límites de paquetes incluidos en test-builder.cjs.

## Corrección para reproducir la referencia
Se reemplazó la interpretación editorial por la estructura medida del segundo enlace: portada 50/50 en escritorio con nombres negros apilados, fotografía con difuminado y nombres en la parte inferior en móvil; fuentes locales Ms Claudy, Cinzel, Rozha One, Poiret y Nathalia; familia en tres columnas; hora y ubicación en una fila; carrusel vertical antes del itinerario, carrusel ancho después de regalos y galería de doce posiciones. Se conservan las tres fotografías generadas (reutilizadas en las posiciones de muestra). Las alturas de las secciones de escritorio hasta la galería coinciden con las medidas de la referencia con una diferencia acumulada aproximada de 1 px a 1280 px de viewport. Se recuperó el fondo ornamental de hojas de la referencia. La confirmación conserva el formulario funcional Enkarta, por lo que ocupa más espacio que el mensaje de ID inválido observado en el original. Los textos de ejemplo siguen siendo editables. No se promete identidad de fotografía, video o contenido privado de invitados.

Iconos corregidos: pareja y corazón reconstruidos a partir de los contornos SVG visibles; reloj de arena recreado localmente. Auto y cámara derivados de los JSON de la biblioteca, con superficies blancas y trazos oliva para evitar siluetas sólidas. Animaciones recreadas, no archivos originales de Invitali. Los cuatro JSON están en la biblioteca y el reloj tiene control independiente. Script reproducible: scripts/create-annie-icons.cjs.

Corrección solicitada: apertura y nota del itinerario vuelven al grupo de tres corazones. annie-tres-corazones.json usa curvas de la referencia y movimiento independiente recreado localmente; no se afirma sincronización idéntica al archivo original. Pareja y reloj siguen disponibles como opciones de biblioteca.

JSON original aportado por el usuario: Animation-1715978306775.json, copiado sin modificaciones a public/lottie/boda/annie-corazones-original.json. Composición 1920×1080, 176 cuadros a 29.970001 fps (~5.87 segundos). Reemplaza las aproximaciones anteriores, conservando colores, curvas, trayectorias y tiempos originales. Los colores solo cambian si el usuario configura una paleta explícita.
