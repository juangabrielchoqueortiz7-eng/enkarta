# Invitaciones editoriales · fases 6, 7 y 8

Implementación local del 27 de agosto de 2026. Este ciclo continúa las fases
multimedia, portada cinematográfica, entrada, sistema visual y secciones
editoriales. No sustituye los planes comerciales anteriores de diez fases.

## Fase 6 · Itinerarios y galerías

- Agenda editorial y ruta alternada, junto a los cuatro formatos anteriores.
- Lugar, duración y nota por actividad; numeración y conectores según formato.
- Galería editorial y relato deslizable, además de los cinco formatos anteriores.
- Título, pie y descripción accesible por foto. Los textos siguen a su fotografía
  al reordenar, añadir o eliminar imágenes.
- Visor con teclado, Escape, control de foco, miniaturas y navegación móvil.
- Composición editorial adaptable a una, dos o varias fotografías, sin huecos
  entre las dos imágenes secundarias.

## Fase 7 · Marfil Vivo

Nuevo diseño en **Nueva invitación**, con muestra en `/muestra/marfil-vivo`.
La variante `?full=1` abre directamente el contenido.

- Paleta marfil, oliva y oro mate; geometría, botones y espaciado compartidos.
- Portada fotográfica, capítulos editoriales, contador, calendario, lugares,
  historia, agenda, galería, detalles para invitados y confirmación.
- Datos de pareja, fecha, fotografía e itinerario vinculados a la invitación.
- El inspector presenta los valores vinculados reales. Editar uno lo independiza
  sin sobrescribir los otros ni eliminar los marcadores dinámicos del texto.
- Identidad visible conservada en listado, constructor y vista previa.
- Base SQL `grazia` y `layout.presetKey = marfil-vivo`: **no requiere migración**.
- Reutiliza fotografía del catálogo y muestras fotográficas existentes; no añade
  imágenes ni GIF copiados de la invitación de referencia. Admite multimedia
  propia mediante las herramientas de las fases anteriores.

## Fase 8 · Carga y preparación para publicar

- Imágenes adaptativas en selector, portada, capítulos y galerías de tamaño fijo.
  La galería de columnas mantiene imágenes de altura natural y carga diferida.
- Video nativo y GIF/WebP con reproducción manual, poster, reintento y política de
  visibilidad. La pausa manual persiste al salir y volver a la sección.
- Animaciones Lottie diferidas y pausadas fuera de pantalla.
- Se respetan movimiento reducido, pestaña oculta y ahorro de datos cuando el
  navegador informa esas preferencias. La música no se precarga automáticamente.
- Auditor: incluye recursos locales y galerías anidadas; separa GIF/WebP de video;
  invalida resultados al cambiar recursos; informa cobertura y pesos desconocidos.
- Vistas de control opcionales, para no cargar tres invitaciones completas al
  abrir el auditor. Su puntuación es orientativa, no una medición de Core Web Vitals.
- Confirmación por bloques: valida nombre y pases, comprueba respuesta HTTP y
  conserva el formulario ante un error. Las muestras y vistas privadas no envían
  respuestas reales.
- Fechas de cuenta regresiva compatibles con horas SQL que incluyen segundos.

## Verificación

`npm run verify` ejecuta lint, TypeScript, `test:builder` y compilación de producción.

Resultado de esta entrega: lint y TypeScript sin errores, **11 pruebas pasando**,
compilación de producción exitosa y muestra compilada sin errores ni advertencias
en consola. La compilación necesitó ejecutarse fuera del sandbox por `spawn EPERM`.

La batería automatizada cubre los 13 diseños iniciales, compatibilidad de guardado,
datos vinculados, edición independiente, fechas SQL, asociación foto/texto,
recursos locales, rutas bloqueadas y validación de Marfil Vivo.

Pruebas de navegador realizadas con datos locales, sin guardar invitaciones:

- Apertura de Marfil Vivo y lectura en ventanas de 360, 390 y 1440 px.
- Visor, flechas del teclado, Escape y retorno del foco a la fotografía.
- Navegación de galería, edición de texto y reordenamiento conservando metadatos.
- Edición y reordenamiento del itinerario; cambio de agenda a ruta alternada.
- Confirmación vacía rechazada y confirmación de muestra sin envío real.
- Video MP4 de prueba: reproducción, pausa manual persistente, pausa al salir de
  pantalla y reanudación al volver. El archivo y la ruta de prueba se retiraron.
- Pie de página alineado con el final del documento; sin desbordamiento horizontal
  de la muestra en los tamaños comprobados.

## Antes del despliegue

La validación funcional se realizó localmente antes del commit y despliegue.
No se crearon filas ni se aplicó SQL.
La auditoría autenticada de enlaces externos, creación real de una invitación y
confirmación persistida deben comprobarse con una invitación de ensayo autorizada.
No se hizo un benchmark de red móvil ni pruebas en dispositivos Safari físicos.
Los pesos del auditor son los archivos originales, no los bytes finales de las
imágenes optimizadas ni el tiempo de carga percibido.
