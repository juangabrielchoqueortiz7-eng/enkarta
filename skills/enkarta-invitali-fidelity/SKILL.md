---
name: enkarta-invitali-fidelity
description: Analizar y reproducir una muestra pública concreta de Invitali en Enkarta con fidelidad de composición, recursos y movimiento. Usar para réplicas de invitaciones o comparación con una referencia; no aplicar el aspecto de Invitali a todas las variantes ni al portal por defecto.
---

# Fidelidad de invitaciones Invitali en Enkarta

Reproducir la referencia seleccionada, conservando la identidad de las demás invitaciones. La coincidencia se establece por evidencia de esa URL y revisión visual, no por el nombre comercial del modelo.

## Referencia y contexto

Leer el AGENTS.md del proyecto y sus documentos de recursos antes de trabajar. Para el mapa del sitio, arquitectura y límites del análisis inicial, leer [references/reference-map.md](references/reference-map.md). Consultar [references/evidence-2026-10-22.json](references/evidence-2026-10-22.json) cuando haga falta localizar una muestra o conocer las fuentes del análisis; son observaciones de una fecha, no una especificación eterna.

Resolver la URL completa de la muestra solicitada y el destino concreto en Enkarta. Revisar su estado actual si está disponible. Una landing y una invitación tienen estructuras diferentes; no transferir sus tokens indiscriminadamente. El editor privado de Invitali no fue observado: no atribuirle funciones internas por inferencia del HTML público.

## De referencia a construcción

- Registrar para esa muestra el orden de secciones; portada/sobre; fondos; jerarquía tipográfica por rol; ancho de lienzo; márgenes; imágenes y recortes; divisores; botones; galerías; música; posición de adornos; movimiento y variantes móvil/escritorio.
- Distinguir reglas CSS declaradas, estilo computado, comportamiento observado y decisiones aún no comprobadas. La frecuencia de un color o una familia en CSS no demuestra su rol ni que sea visible: WordPress puede incluir reglas globales y bloques ocultos.
- Preferir una variante o perfil independiente cuando una réplica difiera de un diseño existente. Conservar sus presets y activos anteriores. No sustituir una fuente por otra parecida, uniformar paletas o aproximar un Lottie para facilitar la implementación.
- Consultar primero los manifiestos maestros y el registro de invitation-assets.ts. Identificar medios por URL completa y SHA-256. Reutilizar los archivados; cualquier recurso nuevo conserva sus bytes y sigue el importador del proyecto. Un archivo del mismo nombre no demuestra identidad.
- Construir secciones editables con las capacidades actuales de React 18/Next.js/Tailwind 3. El resultado visual puede reproducirse con componentes nativos; no hace falta trasladar WordPress, Elementor o sus dependencias al SaaS. Mantener ajustes de tamaño, color, velocidad y posición en la instancia.
- Personalización, RSVP, pases, permisos y QR conservan el contrato seguro de Enkarta. Los parámetros de demostración del sitio de referencia no autorizan nombres, pases, estados de pago ni ingresos en el servidor.

## Verificación de fidelidad

Comparar referencia y réplica con el mismo viewport, contenido equivalente y estado de apertura. Inspeccionar móvil y escritorio, incluyendo fuente realmente cargada, recortes, composición, ritmo de scroll, música y animación. Si hay capturas disponibles, conservar pares comparables y diferencias por región; una puntuación global sola no certifica equivalencia.

Probar navegación, RSVP y controles multimedia con regresiones significativas. Medir carga y red con las herramientas permitidas sin reescribir ni recomprimir los originales; un derivado usa ruta propia y procedencia. Optimizar carga diferida y limpieza de efectos conservando la apariencia.

Cuando falten navegador, muestras, fuentes o recursos, registrar el límite concreto y completar lo verificable. No declarar «idéntico», «pixel perfect» o «sin diferencias» basándose únicamente en HTML, CSS, hashes de recursos o un build correcto. Entregar las discrepancias pendientes; no rellenarlas con aproximaciones sin identificarlas.
