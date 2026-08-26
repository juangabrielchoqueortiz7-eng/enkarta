# Constructor Enkarta — Fase 4

## Objetivo

Convertir el bloque de imagen en un estudio visual completo: la persona edita sobre la foto y ve el mismo resultado que recibirá el invitado, sin depender de controles abstractos separados.

## Entregado

### Encuadre visual

- Punto focal editable directamente sobre la foto mediante clic o arrastre.
- Recortes libre, 1:1, 4:5, 9:16, 16:9 y 4:3.
- Zoom de 100% a 250%.
- Giro fino y accesos rápidos de 90°.
- Espejo horizontal y vertical.

### Tratamiento fotográfico

- Looks Natural, Cálido, Frío, Blanco y negro, Película, Pastel, Vibrante y Suave.
- Ajustes manuales de luz, contraste, saturación, temperatura, blanco y negro y desenfoque.
- Previsualización en vivo durante todos los cambios.

### Máscaras y capas

- Formas Libre, Círculo, Arco, Postal, Ticket, Polaroid y Orgánica.
- Redondeo manual para la forma libre.
- Capa de color uniforme o degradada.
- Intensidad y modos de mezcla Normal, Multiplicar, Luz suave y Aclarar.

### Flujo de medios

- Reemplazo de foto sin perder recorte, máscara, giro ni filtros.
- Biblioteca contextual con las imágenes ya usadas en la invitación.
- Subida optimizada en WEBP cuando reduce el peso.
- Mensaje de ahorro después de comprimir.
- Restablecimiento completo de ajustes con un solo botón.

## Arquitectura

- `ImageStudio` concentra la experiencia de edición dentro del inspector de bloques.
- `image-effects` contiene las reglas compartidas de recorte, forma, filtros y capas.
- El renderer público y el editor consumen esas mismas reglas, evitando diferencias entre la previsualización y la invitación publicada.
- Los nuevos atributos viven en `Block.props`, por lo que son compatibles con documentos anteriores sin migración SQL.

## Compatibilidad

Las imágenes antiguas siguen usando sus valores por defecto: formato libre, zoom 100%, sin máscara, sin capa y color natural. Los nuevos controles se aplican únicamente cuando se guardan cambios.

## Verificación

- TypeScript sin errores.
- ESLint sin advertencias.
- Prueba visual del panel real con filtro Cálido y máscara Polaroid.
- Reemplazo desde la biblioteca verificado conservando la máscara activa.
- Ruta temporal de QA eliminada después de la prueba.

## Siguiente fase

La Fase 5 puede usar este mismo sistema para una galería avanzada: edición individual por foto, orden mediante arrastre, layouts editoriales, portadas de álbum y consistencia de filtros por conjunto.
