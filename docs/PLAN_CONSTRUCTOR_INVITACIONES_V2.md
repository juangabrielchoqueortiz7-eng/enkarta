# Plan V2 — Constructor real de invitaciones digitales

> Estado al 22 de agosto de 2026: las diez fases ya cuentan con una primera implementación funcional e integrada. El historial, las secciones reutilizables y las notas de revisión se guardan localmente en esta iteración; su sincronización colaborativa en la nube queda como endurecimiento posterior.

## 1. Objetivo del producto

Convertir Enkarta en un constructor visual completo con el que una persona pueda crear, personalizar, probar y publicar una invitación digital sin tocar código y sin depender de un formulario técnico.

El constructor estará realmente completo cuando permita:

1. Empezar desde una plantilla, un kit visual o un lienzo limpio.
2. Añadir secciones, contenido y adornos desde bibliotecas visuales.
3. Editar directamente sobre la invitación.
4. Mover, alinear, agrupar, ordenar y reutilizar elementos.
5. Diseñar móvil y escritorio sin romper ninguno de los dos.
6. Personalizar contenido por invitado, pases, mesa y RSVP.
7. Validar calidad, rendimiento y accesibilidad antes de publicar.
8. Guardar versiones, publicar con seguridad y exportar piezas complementarias.

## 2. Estado actual

### Ya existe una base importante

- Documento por bloques con aproximadamente 30 tipos de contenido.
- Secciones listas para portada, evento, fotos, invitados y otros eventos.
- Selección directa, arrastre, redimensión, giro, capas, bloqueo y visibilidad.
- Barra contextual, cuadrícula, movimiento por teclado y copiar/pegar estilos.
- Estilos por bloque: fondo, superficie, tarjeta, cristal, bordes, radio, sombra y espaciado.
- Tipografía por bloque y animaciones por sección.
- Vista móvil y escritorio con overrides independientes.
- Librería de 29 elementos SVG en 7 categorías.
- Subida de PNG, WEBP y SVG, recolor de SVG y packs decorativos.
- Paleta, tipografías, decoración, música, galería y movimiento global.
- Gestión de invitados, enlaces individuales, pases, mesas y RSVP.
- Autoguardado de sesión, deshacer/rehacer, validaciones y publicación.
- Exportación de QR, portada social, calendario y copia JSON.

### Brechas principales

| Área | Situación actual | Lo que falta |
| --- | --- | --- |
| Elementos | 29 motivos, muchos lineales y de 1–2 colores | Biblioteca más rica, consistente y con paletas multicolor |
| Composición | Movimiento individual | Selección múltiple, grupos, alineación y distribución |
| Anclaje | Elementos flotantes anclados principalmente a la página | Elementos pertenecientes a una sección o grupo |
| Responsive | Overrides existen, pero se editan por separado | Comparación simultánea y reglas responsive visibles |
| Imágenes | Subir y punto focal | Recortar, zoom, máscaras, filtros y optimización |
| Secciones | Presets sin miniaturas reales completas | Galería visual de composiciones y variantes |
| Capas | Lista plana de bloques | Árbol jerárquico, nombres, carpetas y grupos |
| Historial | Deshacer durante la sesión | Versiones persistentes y restauración |
| Calidad | Validaciones de contenido | Auditor visual, contraste, overflow, peso y enlaces |
| Publicación | Guardar/publicar | Preview final, staging, rollback y estado de cambios |

## 3. Prioridad inmediata — Elementos Visuales V2

Esta es la siguiente fase recomendada. Antes de añadir cientos de opciones, hay que construir una librería pequeña pero excelente, coherente y fácil de combinar.

### 3.1 Rediseñar los elementos actuales

- Revisar los 29 SVG existentes uno por uno.
- Unificar grosor de líneas, curvas, proporciones y nivel de detalle.
- Corregir motivos que se vean genéricos, rígidos o demasiado técnicos.
- Normalizar `viewBox`, márgenes internos y tamaños de inserción.
- Crear versiones claras y oscuras cuando el diseño lo necesite.
- Mantener formas limpias a 40 px y elegantes a 300 px.
- Evitar sombras dibujadas dentro del SVG; las aplicará el editor.

### 3.2 Ampliar la biblioteca con colecciones coherentes

Meta inicial: 60–80 elementos curados, no una colección desordenada.

#### Botánica

- Peonías, rosas, orquídeas, margaritas, lavanda y flores silvestres.
- Eucalipto, olivo, laurel, palmera, helecho y pampas.
- Ramos, coronas, tallos, esquineros y guirnaldas.

#### Boda y romance

- Anillos, copas, lazos, corazones, palomas, manos y sobres.
- Sellos de lacre, marcos de iniciales y monogramas.
- Detalles clásicos, minimalistas, bohemios y editoriales.

#### Fiesta y celebración

- Confeti, estrellas, destellos, globos, serpentinas y luces.
- Pastel, regalo, brindis, música y pista de baile.

#### Colecciones por evento

- XV años: corona, tiara, zapatilla, vestido, mariposas y estrellas.
- Baby shower: luna, nube, oso, conejito, cochecito y arcoíris.
- Bautizo: cruz, paloma, rama, vela, agua y medallón.
- Cumpleaños: velas, pastel, números, confeti y globos.

#### Diseño y composición

- Marcos, arcos, ventanas, cintas, etiquetas y sellos.
- Cenefas, separadores, manchas orgánicas y formas geométricas.
- Texturas sutiles de papel, grano, acuarela y luz.

### 3.3 Pasar de dos colores a paletas reales

El modelo actual usa `color` y `color2`. Debe evolucionar a cuatro canales semánticos:

- `primary`: color dominante.
- `secondary`: hojas, contornos o rellenos secundarios.
- `accent`: centro floral, brillo o detalle protagonista.
- `detail`: líneas pequeñas y contraste fino.

Cada elemento debe ofrecer:

- Paleta de la invitación.
- Paletas recomendadas propias del elemento.
- Edición manual de los cuatro canales.
- Botón para invertir o rotar colores.
- Intensidad o saturación general.
- Restablecer colores originales.

La migración debe convertir automáticamente los elementos actuales de uno o dos colores sin alterar invitaciones publicadas.

### 3.4 Mejorar el selector de elementos

- Miniaturas más grandes sobre un fondo neutro controlado.
- Vista previa usando los colores reales de la invitación.
- Búsqueda por nombre, etiqueta y tipo de evento.
- Categorías con iconos y conteo.
- Favoritos y usados recientemente.
- Sección “Recomendados para esta plantilla”.
- Filtros por estilo: floral, minimal, clásico, bohemio, editorial, infantil y festivo.
- Vista previa del elemento antes de insertarlo.
- Insertar con un clic o arrastrar directamente al lienzo.

### 3.5 Mejorar la edición del elemento seleccionado

- Paletas rápidas y cuatro selectores de color.
- Sombra: ninguna, suave, elevada, profunda y resplandor.
- Blur, brillo, contraste y saturación para elementos subidos.
- Opacidad, escala, giro, espejo y capa.
- Modos de mezcla seguros: normal, multiplicar, pantalla y superponer.
- Contorno opcional para elementos rasterizados.
- Animaciones visuales con miniatura: flotar, mecer, aparecer, dibujarse y destellar.
- Duración, intensidad y retraso.
- Botón “Combinar con la plantilla”.

### 3.6 Elementos vinculados a secciones

Cada adorno debe poder pertenecer a:

- Toda la página.
- Una sección concreta.
- Un grupo de elementos.
- El fondo o el frente de una sección.

Esto evita que un adorno de la portada se desplace o se superponga sobre secciones posteriores.

### Criterios de salida de Elementos V2

- Al menos 60 elementos curados y visualmente consistentes.
- Al menos 8 kits multicolor completos.
- Cuatro canales de color con migración compatible.
- Elementos anclables a página o sección.
- Picker con búsqueda, categorías, favoritos y recomendaciones.
- Sin desbordes en 360, 390, 768, 1024 y 1440 px.
- Todas las miniaturas y colores coinciden con el resultado del lienzo.

## 4. Fase 2 — Lienzo y composición profesional

### Funciones

- Selección múltiple con Shift + clic y rectángulo de selección.
- Agrupar y desagrupar elementos.
- Alinear izquierda, centro, derecha, arriba, medio y abajo.
- Distribuir horizontal y verticalmente con separación uniforme.
- Reglas, guías arrastrables y márgenes seguros.
- Snap a centro, bordes, otros elementos y cuadrícula.
- Zoom del lienzo entre 25 % y 200 %.
- Pan del lienzo sin mover elementos.
- Bloqueo de posición, tamaño, contenido o estilo por separado.
- Copiar, cortar, pegar, duplicar y pegar en posición.
- Árbol de capas con nombres, grupos, carpetas y búsqueda.
- Ordenar capas arrastrando y comandos traer al frente/enviar atrás.

### Criterios de salida

- Se pueden seleccionar, alinear y agrupar al menos 20 elementos sin retraso visible.
- Las guías indican exactamente a qué borde o centro se está ajustando.
- Las operaciones se pueden deshacer y rehacer.
- El árbol de capas refleja la jerarquía real del lienzo.

## 5. Fase 3 — Sistema de secciones y bloques V2

### Galería visual de secciones

- Miniaturas reales en móvil y escritorio.
- Categorías por momento narrativo: apertura, historia, evento, información, RSVP y cierre.
- Variantes por estilo: minimal, editorial, romántica, bohemia, lujo, viaje y fiesta.
- Vista previa antes de insertar.
- Reemplazar una sección conservando su contenido.

### Variantes de bloque

Cada bloque importante debe tener 3–6 composiciones, no solo parámetros:

- Portada: centrada, partida, editorial, foto completa, pasaporte y película.
- Evento: tarjetas, línea temporal, tickets y agenda.
- Galería: mosaico, polaroid, carrusel, editorial y película.
- RSVP: tarjeta, pantalla completa, WhatsApp y formulario.
- Historia: timeline, capítulos, foto fija y antes/después.

### Contenido y diseño separados

- Cambiar de variante sin perder nombres, fechas, fotos ni enlaces.
- Restablecer solo diseño o solo contenido.
- Sincronización explícita con datos globales.
- Indicador claro cuando un campo deja de estar vinculado.

## 6. Fase 4 — Editor de imágenes y medios

- Recorte visual dentro del editor.
- Zoom y punto focal con arrastre.
- Rotación y espejo.
- Máscaras: círculo, arco, postal, ticket, polaroid y formas orgánicas.
- Filtros suaves: natural, cálido, frío, blanco y negro, película y pastel.
- Brillo, contraste, saturación, temperatura y desenfoque.
- Overlay de color y gradiente para mejorar legibilidad.
- Reemplazar una imagen conservando recorte y máscara.
- Compresión automática a WEBP/AVIF y advertencia de archivos pesados.
- Estado de carga, error y reintento visibles.
- Biblioteca de medios usados en la invitación.

## 7. Fase 5 — Responsive realmente visual

- Vista móvil y escritorio simultáneas cuando haya espacio.
- Breakpoints definidos y visibles.
- Copiar ajustes móvil → escritorio y escritorio → móvil.
- Propiedades con tres estados: heredada, automática o personalizada.
- Ocultar, reemplazar o reordenar bloques por dispositivo.
- Escala tipográfica fluida con límites seguros.
- Avisos de overflow, texto cortado, controles pequeños y solapamientos.
- Vista previa adicional a 360, 390, 768, 1024 y 1440 px.

## 8. Fase 6 — Kits visuales y sistema de diseño

- Kit = paleta + tipografías + botones + radios + sombras + espaciado + elementos.
- Aplicar un kit a toda la invitación sin borrar contenido.
- Kits oficiales por plantilla y tipo de evento.
- Guardar un kit personalizado.
- Tokens semánticos: papel, tinta, primario, acento, superficie y línea.
- Escala tipográfica global para títulos, subtítulos, cuerpo y etiquetas.
- Escala de espaciado consistente.
- Auditor de consistencia: demasiadas fuentes, colores o radios diferentes.
- Acción “Limpiar diseño” para normalizar una invitación antigua.

## 9. Fase 7 — Invitaciones personalizadas y contenido dinámico

- Campos dinámicos visibles dentro del editor: nombre, pases, mesa y código.
- Preview como un invitado concreto.
- Contenido condicional: con niños/sin niños, ceremonia/recepción, número de pases.
- Bloques privados por grupo de invitados.
- QR y acceso individual integrados como bloques.
- Estados reales del RSVP dentro de la vista previa.
- Mensajes de WhatsApp con preview por invitado.
- Importación CSV robusta con mapeo de columnas.
- Detección de duplicados y normalización de teléfonos.

## 10. Fase 8 — Guardado, versiones y colaboración

- Estado visible: guardado, guardando, sin conexión o error.
- Historial persistente por versiones.
- Nombrar versiones: “Propuesta 1”, “Cambios del cliente”.
- Restaurar una versión sin eliminar la actual.
- Borrador, preview privado y versión publicada separados.
- Publicar con resumen de cambios.
- Rollback inmediato a la versión anterior.
- Comentarios del cliente sobre una sección o elemento.
- Flujo: pendiente, aprobado y requiere cambios.
- Roles: administrador, diseñador, cliente y solo lectura.

## 11. Fase 9 — Auditoría y publicación profesional

### Auditor automático

- Contraste insuficiente.
- Texto desbordado o demasiado pequeño.
- Botones sin enlace.
- Imágenes faltantes o pesadas.
- Secciones vacías.
- Bloques ocultos en todos los dispositivos.
- Solapamientos problemáticos.
- Número excesivo de fuentes, colores o animaciones.
- RSVP, mapa, música y calendario sin configurar.
- Enlaces rotos o inseguros.

### Flujo de publicación

- Checklist previo a publicar.
- Preview exacto de producción.
- Prueba con un invitado de ejemplo.
- Capturas automáticas de portada, sección media y cierre.
- Confirmación de URL y estado de expiración.
- Publicar, programar publicación o despublicar.
- Métricas básicas de peso y tiempo de carga.

## 12. Fase 10 — Exportación y analítica

- Paquete ZIP con portada, QR, calendario, fotos y textos.
- Tarjetas individuales PNG/PDF por invitado.
- PDF estático optimizado para impresión.
- Stories y posts para redes en formatos predefinidos.
- Resumen imprimible de mesas y accesos.
- Analítica de apertura, scroll, clics, música, mapas y RSVP.
- Embudo: abrió → vio detalles → confirmó.
- Privacidad: métricas agregadas y retención configurable.

## 13. Orden recomendado de ejecución

### Iteración 1 — Belleza y color

1. Modelo de paleta de cuatro colores.
2. Rediseño de los 29 elementos actuales.
3. Primeros 8 kits multicolor.
4. Picker visual nuevo.
5. Elementos anclados a sección.

**Resultado:** el constructor empieza a producir invitaciones notablemente más bonitas sin exigir habilidades de diseño.

### Iteración 2 — Composición real

1. Selección múltiple.
2. Grupos.
3. Alineación y distribución.
4. Guías contra otros elementos.
5. Árbol jerárquico de capas.

**Resultado:** el usuario compone con precisión y no solo agrega stickers sueltos.

### Iteración 3 — Secciones y contenido

1. Miniaturas reales de secciones.
2. Variantes intercambiables.
3. Kits visuales.
4. Guardar secciones y estilos propios.

**Resultado:** se puede construir una invitación completa desde piezas visuales coherentes.

### Iteración 4 — Media y responsive

1. Editor de imágenes.
2. Comparador móvil/escritorio.
3. Auditor de overflow y contraste.
4. Optimización automática de recursos.

**Resultado:** el diseño queda listo para publicar sin roturas ni imágenes pesadas.

### Iteración 5 — Operación profesional

1. Versiones persistentes.
2. Preview privado y rollback.
3. Comentarios/aprobación.
4. Exportaciones avanzadas y analítica.

**Resultado:** Enkarta funciona como producto de diseño y como plataforma comercial.

## 14. Criterios generales de calidad

- Ningún cambio rompe invitaciones ya publicadas.
- Todas las funciones importantes tienen deshacer/rehacer.
- El resultado del editor coincide con producción.
- Sin scroll horizontal en los tamaños soportados.
- Controles interactivos de al menos 44 px en la invitación pública.
- Accesible sin animaciones y respetando `prefers-reduced-motion`.
- Portada visible en menos de 2,5 segundos en una red móvil promedio.
- Imágenes optimizadas y sin saltos de layout.
- Navegación por teclado para acciones esenciales.
- Pruebas visuales automáticas en móvil y escritorio.

## 15. Siguiente iteración de endurecimiento

La base de las diez fases está integrada. Los siguientes pasos ya no son ampliar el editor de forma horizontal, sino consolidarlo para operación real:

- [x] Persistir versiones, secciones reutilizables y notas de revisión en la nube con permisos por invitación y respaldo local.
- [x] Registrar eventos de analítica por fecha, fuente y tipo de interacción, además de los acumulados actuales.
- [x] Comprimir imágenes y galerías a WebP antes de subir, servirlas con caché larga y habilitar AVIF/WebP en el optimizador de Next.js.
- [x] Añadir una verificación repetible de lint, tipos y compilación con `npm run verify`.
- [ ] Incorporar recortes derivados en servidor y pruebas de regresión visual automatizadas.
- [ ] Aplicar la migración 004, observar datos reales y ejecutar un despliegue controlado.

La guía operativa para cerrar los dos puntos pendientes está en `docs/PRODUCTION_CHECKLIST.md`.
