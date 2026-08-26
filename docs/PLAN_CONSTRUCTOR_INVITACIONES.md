# Plan de evolución del constructor de invitaciones

## Objetivo

Convertir el constructor en una herramienta visual fácil de usar, con resultados uniformes y una narrativa de scroll comparable a una invitación editorial: escenas claras, jerarquía tipográfica, transiciones suaves y una experiencia impecable en móvil.

## Principios de diseño

1. Una invitación debe partir de un sistema visual, no de bloques aislados.
2. El scroll debe contar una historia: portada, anuncio, evento, recuerdos, información práctica y cierre.
3. Las opciones avanzadas deben existir, pero las recetas de un clic deben producir un buen resultado sin conocimientos de diseño.
4. Móvil es la vista principal; escritorio adapta la composición sin deformarla.
5. Toda animación debe respetar `prefers-reduced-motion` y mantener el contenido legible.

## Fase 1 — Base visual consistente (implementada)

- Aplicar realmente los tokens de ancho, aire lateral, espaciado, radio y superficie.
- Unificar tarjetas, sombras, bordes y fondos a partir de la paleta del modelo.
- Mantener contraste legible en bandas oscuras y fondos fotográficos.
- Separar la forma de la costura del efecto animado de esa transición.
- Añadir recetas rápidas de sección: Limpia, Suave, Contraste y Escena.
- Permitir alto mínimo, pantalla completa y ancho por sección.

## Fase 2 — Narrativa de scroll (implementada)

- Tres recorridos: Libre, Guiado y Cinemático.
- Indicador de progreso en Línea o Pasos.
- Ritmo de entrada Sereno, Balanceado o Ágil.
- Control de intensidad, perspectiva 3D y parallax.
- Reproducción automática de las animaciones dentro del preview.
- Costuras animadas ligadas al gesto de scroll: profundidad, pliegue, cristal y telón.

## Fase 3 — Panel más claro (implementada)

- Navegación vertical persistente, sin pestañas horizontales apretadas.
- Separación entre contenido, estructura, elementos, estilo, animación, invitados y exportación.
- Descripciones cortas para que cada herramienta sea reconocible.
- Preview móvil/escritorio, selección directa, arrastre, redimensión, giro, capas, bloqueo, copiar/pegar, deshacer y rehacer.

## Fase 4 — Exportaciones (base implementada)

| Descarga | Formato | Uso | Estado |
| --- | --- | --- | --- |
| Código QR | PNG | Tarjetas impresas, mesas, recordatorios | Implementado |
| Portada social | PNG 1200×630 | WhatsApp y redes | Implementado |
| Evento de calendario | ICS | Google Calendar, Apple y Outlook | Implementado |
| Copia del diseño | JSON | Respaldo o migración | Implementado |
| Lista de invitados | CSV | Operación, mesas y confirmaciones | Implementado |
| Invitación estática | PDF | Recuerdo o impresión | Flujo de impresión disponible |
| Paquete de medios | ZIP | Fotos, QR, portada y textos | Siguiente iteración |
| Tarjeta individual por invitado | PNG/PDF | Envío personalizado y control de pases | Siguiente iteración |

## Fase 5 — Siguiente iteración recomendada

### Prioridad alta

- Galería de modelos de sección con miniaturas reales antes de insertarlos.
- Auditor automático de diseño: contraste, secciones demasiado densas, imágenes sin cargar, botones sin enlace y textos desbordados.
- Controles responsive visibles lado a lado para comparar móvil y escritorio.
- Guardado de estilos favoritos y duplicación de una sección entre invitaciones.
- Modo “limpiar diseño” que normalice espaciados, tipografías y colores de una invitación antigua.

### Prioridad media

- Transiciones entre escenas con máscaras de imagen y fondos parallax multicapa.
- Guías, reglas, alineación múltiple y distribución de elementos.
- Biblioteca de composiciones: portada partida, editorial, pasaporte, película, jardín y minimal.
- Variantes A/B de portada y cierre.
- Historial persistente por versión, no solo durante la sesión actual.

### Prioridad posterior

- Colaboración con comentarios y aprobación del cliente.
- Plantillas compartidas por equipo y permisos por rol.
- Analítica de scroll: hasta qué sección llegan los invitados y dónde confirman.
- Exportación de un micrositio autónomo para archivo del evento.

## Criterios de calidad antes de publicar

- Sin scroll horizontal en 360, 390, 768, 1024 y 1440 px.
- Texto con contraste legible y botones de al menos 44 px de alto.
- Portada visible en menos de 2,5 s en red móvil promedio.
- Animaciones fluidas y sin saltos de layout.
- Invitación utilizable sin animaciones.
- RSVP, mapas, calendario, música, QR y enlaces probados.
- Captura visual automática de inicio, sección media y cierre en móvil y escritorio.
