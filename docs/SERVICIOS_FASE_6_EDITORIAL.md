# Servicios · Fase 6: itinerarios y galerías editoriales

Implementado localmente. No requiere migración: los datos nuevos se guardan dentro de `builder_config`, la misma estructura JSON que ya conserva el diseño.

## Itinerarios coherentes

- Seis composiciones visibles en el editor: línea vertical, agenda editorial, ruta alternada, tarjetas, lista compacta y carrusel.
- Cada actividad conserva hora, nombre, icono, lugar, duración y nota útil.
- El editor clásico también permite esos campos y reordenamiento, de modo que una invitación anterior no pierde información al abrirse o convertirse a bloques.
- Las plantillas anteriores reciben ahora lugar, duración y nota; antes su adaptador descartaba esos tres campos.

## Galería como relato

- Título, pie de foto y descripción accesible se guardan globalmente y se asocian por URL, no solamente por posición.
- Al mover, eliminar o añadir fotografías, el texto continúa ligado a la imagen correcta.
- Los datos llegan a galerías por bloques, galerías propias de las colecciones anteriores y al visor de pantalla completa.
- El editor muestra la miniatura junto a sus textos y explica la función de la descripción accesible.
- El selector de composición ahora es visual: editorial protagonista, historia deslizable, cuadrícula, mosaico, polaroid, carrusel y coverflow.

## Paquetes y límites

- Plus conserva itinerario con todos sus formatos, pero no incluye galería.
- Premium muestra hasta 8 fotografías.
- Exclusive muestra hasta 20 fotografías y mantiene el servicio de compartir fotos.
- Al aplicar el límite público, imágenes y pies de foto se recortan juntos. Los datos originales continúan guardados para que cambiar de paquete o editar no destruya contenido.

El enlace de álbum compartido no convierte a Enkarta en proveedor de almacenamiento colaborativo. Si el paquete no incluye “Compartir fotos”, el botón se oculta aunque el enlace permanezca guardado.

## Verificación

- Ejecutar `npm run verify`.
- Reordenar tres fotografías con textos distintos y confirmar que cada texto sigue con su foto.
- Abrir una foto en el visor y probar flechas, Escape y lectura de título/pie.
- Probar una agenda larga en 360, 390 y 430 px con lugar y notas extensas.
- Revisar una invitación antigua sin `galleryCaptions`: debe abrir sin cambios ni campos obligatorios nuevos.
