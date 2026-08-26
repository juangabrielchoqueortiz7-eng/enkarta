# Constructor Enkarta — Fase 3

## Objetivo

Transformar la lista técnica de bloques en una biblioteca visual de composiciones completas. La persona diseña por momentos narrativos y puede cambiar una composición sin volver a escribir la información del evento.

## Biblioteca visual

Las 25 secciones existentes se organizan ahora por:

- Momento: apertura, historia, evento, información, confirmación y cierre.
- Estilo: romántico, editorial, minimal, botánico, viaje y festivo.
- Búsqueda semántica por nombre, descripción, etiqueta y tipo de contenido.
- Recomendación según la colección activa.

Cada tarjeta presenta una miniatura construida con la paleta real de la invitación, nombre, momento, estilo y acciones para previsualizar o añadir.

## Contenido conectado

Al insertar una composición, sus bloques se vinculan automáticamente con los datos existentes:

- Protagonistas, iniciales y foto de portada.
- Fecha, ciudad, cuenta regresiva y calendario.
- Ceremonia, recepción, dirección y mapas.
- Vestimenta, regalo, galería y enlace de confirmación.
- Nombre y pases del invitado cuando corresponde.

El vínculo es seguro: al editar manualmente un campo, ese campo se independiza y conserva el nuevo valor.

## Reemplazo sin perder información

Desde la vista previa se puede reemplazar el bloque o la selección actual. El sistema transfiere el contenido compatible —textos, fechas, imágenes, enlaces e invitados— y conserva el diseño nuevo de la composición elegida.

## Compatibilidad

- No cambia el modelo de `PageLayout` ni las claves de los bloques existentes.
- Las invitaciones publicadas no se reescriben.
- Las secciones guardadas por el usuario siguen funcionando.
- El selector técnico de bloques continúa disponible debajo de la galería visual.
- Deshacer y rehacer siguen cubriendo la inserción y el reemplazo.

## Criterio de salida

- Las 25 secciones tienen miniatura, momento, estilo y etiquetas.
- Los filtros narrativos reducen la biblioteca sin recargar el panel.
- Las recomendaciones cambian según la colección activa.
- Una sección nueva muestra inmediatamente los datos reales de la invitación.
- Es posible reemplazar una selección conservando contenido compatible.
- La galería, los tipos, el lint y la compilación de producción se validan correctamente.

