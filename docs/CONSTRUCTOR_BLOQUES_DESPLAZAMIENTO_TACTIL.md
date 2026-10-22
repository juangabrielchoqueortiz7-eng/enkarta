# Bloques: desplazamiento táctil y acceso al inspector

## Defecto encontrado en Android

Durante la aceptación física en Chrome de Android, el usuario confirmó la navegación, vista previa y guardado tras recargar del borrador ficticio «QA Ana y QA Luis». La siguiente comprobación quedó pendiente: al intentar desplazar la lista de Bloques se reordenaban filas accidentalmente y no encontraba Posición.

Reorder.Item escuchaba el arrastre en toda la fila. El asa de puntos era decorativa. Además, lista e inspector compartían un contenedor que conservaba el desplazamiento; abrir un bloque desde abajo podía dejar sus pestañas fuera de vista.

## Corrección

- BlockOrderRow desactiva el arrastre implícito de la fila con dragListener=false. Solo el asa etiquetada activa useDragControls. La fila mantiene touch-action: pan-y; únicamente el asa utiliza none.
- Flechas Subir/Bajar permiten ordenar con pulsación o teclado. Resuelven ID y tipo en el documento vigente, conservan otros cambios y no restauran filas eliminadas. Los extremos se desactivan.
- La acción principal muestra «Editar bloque». Las acciones tienen objetivos de al menos 44 px, etiquetas accesibles y foco visible; se distribuyen en varias líneas cuando falta espacio.
- Abrir el editor vuelve al inicio exclusivamente del contenedor de controles y enfoca su encabezado sin mover la página. Marcar filas para selección múltiple conserva el desplazamiento; «Editar selección» sí abre el inspector desde arriba.
- Contenido, Diseño, Movimiento y Posición usan dos columnas en teléfonos estrechos y cuatro en pantallas mayores. El título y la categoría del bloque pueden ocupar varias líneas.

## Regresiones y evidencia

scripts/test-builder-block-touch-ui.cjs ejecuta el panel y las filas reales, el registro y los cambios de borrador en RAM. Conserva DragControls real de Framer y aísla su transporte DOM/layout. No envía solicitudes, sube archivos, escribe bibliotecas ni realiza pagos. Incluye callbacks obsoletos, movimientos consecutivos, conservación de datos actuales, acceso a Posición y scroll/foco del inspector.

La revisión visual local utiliza datos ficticios y fixtureMode, sin persistencia. Se inspeccionan escritorio y anchos de 390 y 320 px. El desplazamiento de la lista con rueda y las propiedades CSS calculadas no equivalen a un gesto físico de Android: la repetición manual del caso detectado sigue pendiente.

La ruta local temporal utilizada para esa revisión se retira antes del build y del despliegue. El borrador de aceptación de producción se conserva hasta completar las pruebas del usuario y ejecutar la limpieza final por su UUID registrado. Esta corrección no crea otro borrador ni publica la invitación.

## Límites y conservación

Solo cambian controles operativos, sus pruebas y esta documentación. No se cambian renderers de invitaciones, presets, estilos globales, recursos, fuentes, fotografías, música, permisos, SQL ni dependencias. La modificación local preexistente de la migración 021 queda fuera del commit. BCP conserva su bloqueo; no se realizan operaciones bancarias ni envíos de WhatsApp.

El gesto de mover bloques dentro del lienzo de vista previa es un recorrido distinto y no se modifica en esta entrega.

Skills aplicadas: Impeccable (Operate y adaptación móvil), Vercel React Best Practices (componente estable fuera del render) y Web Design Guidelines (foco, etiquetas, alternativas al arrastre y objetivos táctiles). Referencias de la implementación: [activadores de arrastre de Motion](https://motion.dev/docs/react-reorder#drag-triggers) y [guías web de Vercel](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).

## Resultado local

- Verificación completa con salida 0: **1.819 pruebas correctas en 60 ejecuciones**, lint, TypeScript y build con 65 páginas generadas. Se mantienen las advertencias anteriores de imágenes; no se silencian reglas.
- **15 regresiones nuevas correctas**. Contra el commit anterior d0bc9ec3e0c9aad1fad642612be417eea465f7b6, 14 fallan y una comprobación general sin mutaciones pasa: el control negativo detecta la ausencia de la corrección.
- **597/597 archivos protegidos** conservan sus bytes por SHA-256. La migración 021 preexistente permanece fuera del alcance.
- Navegador local Chromium: revisión de escritorio, 390 y 320 px; filas con pan-y calculado, desplazamiento de lista de 0 a 1458 px sin cambiar orden, apertura del inspector con scrollTop=0 y sin desbordamiento horizontal del panel. Esto no acredita el gesto físico del Android.

La evidencia de ejecución y despliegue se conserva en tmp/builder-block-touch/. La repetición de la aceptación manual y la limpieza final del borrador quedan pendientes.
