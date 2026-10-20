# Constructor y Socios: revisión UX/UI del portal

## Objetivo y alcance

Este refinamiento mejora la lectura, la jerarquía, la navegación y el uso con teclado y pantallas pequeñas del constructor y el panel de Socios. Corrige problemas observables de la interfaz de trabajo conservando los contratos de edición, guardado, publicación, permisos y pagos.

Los archivos de aplicación afectados son `src/components/admin/builder/InvitationBuilder.tsx` y `src/components/partners/PartnerDashboard.tsx`. En el constructor se revisó su estructura exterior: encabezado, navegación, estados, controles de vista previa y revisión de publicación. En Socios se revisaron la cabecera, navegación, estado de la suscripción, cartera de invitaciones, Mi cuenta, presentación del checkout manual e historial de pagos.

No se rediseñaron los paneles interiores de edición ni los renderizadores de las invitaciones. Las fuentes, paletas, fotografías, música, animaciones, presets y recursos originales conservan su identidad. No hay cambios de CSS global, dependencias, esquema SQL, precios, cupos, proveedor de pago o credenciales.

## Criterio de diseño y skills utilizadas

- **Impeccable**, en modo Operate, con las referencias de refinamiento y calidad: priorizar completar tareas, mantener la identidad existente, separar acciones principales y destructivas y comprobar carga, vacío, error, foco y adaptación de la interfaz.
- **Web Design Guidelines**: revisión de nombres accesibles, etiquetas, controles nativos, foco, navegación por teclado, enlaces, áreas táctiles, contraste y comportamiento adaptable. Se consultaron las [pautas oficiales de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
- **Vercel React Best Practices**: conservación de los límites entre presentación y estado, referencias por instancia y limpieza de los efectos de foco. La implementación permanece compatible con React 18, Next.js 15 y Tailwind CSS 3.

Las skills orientan decisiones concretas y comprobables; no certifican por sí solas una interfaz ni autorizan sustituir los diseños de las invitaciones. El refinamiento utiliza el contexto de `PRODUCT.md`, `DESIGN.md` y `docs/SKILLS_ENKARTA.md`.

## Constructor: problemas y correcciones

| Problema observado | Corrección aplicada |
| --- | --- |
| El encabezado concentraba controles pequeños y el estado de guardado quedaba oculto en móvil. | Los grupos de acciones pueden cambiar de línea. La validación y el estado de guardado tienen una fila visible y adaptable, diferenciada de los botones Guardar y Publicar. |
| Varias acciones dependían del icono o del tooltip para identificarse. | Se añadieron nombres accesibles a volver, deshacer, rehacer, duplicar y abrir la vista privada. Los iconos decorativos se excluyen de la lectura accesible. |
| No se anunciaba de forma uniforme qué herramienta, dispositivo o modo estaba seleccionado. | Se explicitan los estados de selección y expansión de las herramientas, pasos y controles de vista previa, conservando sus manejadores actuales. |
| Los botones de dispositivos y comparación de la vista previa tenían 32 px de alto y texto de 9 px. El acento dorado con texto blanco reducía el contraste. | Los controles pasan a un mínimo de 44 px, texto de 14 px, fondos de contraste suficiente y foco visible. El indicador de foco sobre la opción oscura utiliza un tono claro para distinguirse de la selección. |
| Los estados informativos podían parecer acciones y el guardado no tenía una región de anuncio independiente. | Los estados normales son información anunciada; sólo los estados de error o desconexión presentan la acción existente de reintentar. El botón Guardar muestra «Guardando…» durante la espera. |
| La revisión de publicación no gestionaba completamente la entrada, circulación y devolución del foco. | El diálogo tiene nombre y descripción; al abrir se enfoca su título. Tab y Shift+Tab permanecen dentro de sus controles habilitados, con alternativa de foco en el diálogo si no hay controles disponibles. |
| Un atajo del constructor podía actuar sobre la invitación mientras el foco estaba en el título del diálogo, fuera de los campos de texto. | Los atajos de edición del lienzo ignoran los eventos originados dentro de la revisión de publicación. |
| Cerrar la revisión al terminar una publicación podía intentar devolver el foco cuando el botón original aún estaba deshabilitado. | Escape permite salir cuando no se está guardando. La devolución del foco comprueba que el elemento siga conectado y, si es necesario, espera a que termine el guardado. Los listeners se retiran al cerrar. |
| Recorrer toda la navegación con teclado era obligatorio para llegar al área de trabajo. | Se incorpora «Ir al área de edición», visible al recibir foco, con destino en el landmark principal del constructor. |

La vista privada conserva su enlace con `?preview=1` y explicita una relación segura al abrir otra pestaña. Publicar, programar, guardar y volver siguen utilizando sus rutas y validaciones actuales. No se introducen éxitos optimistas ni se cambia la versión que se envía al servidor.

## Socios: problemas y correcciones

| Problema observado | Corrección aplicada |
| --- | --- |
| Cabecera, navegación y metadatos tenían textos pequeños y varios tonos secundarios de poco contraste. | Se mejora la escala de lectura, contraste y distribución. Marca y correo largos quedan limitados dentro de su espacio sin empujar las acciones; conservan su valor completo en el atributo de título. El avatar declara sus dimensiones. |
| El resumen de suscripción dependía del rótulo genérico «Estado» y no había una jerarquía de encabezados consistente. | El estado real de la suscripción es el h1; cartera y cuenta tienen h2 y cada invitación un h3. La cifra de publicadas permanece diferenciada del total de invitaciones creadas. |
| Una invitación despublicada o vencida se presentaba visualmente como un borrador. | Los distintivos reflejan por separado `draft` → Borrador, `ready` → Publicada, `disabled` → Despublicada y `expired` → Vencida. No se cambian los permisos ni las condiciones del botón Publicar. |
| Un nombre largo sin espacios desbordaba la tarjeta: 823 px de contenido dentro de una tarjeta de 343 px en el caso de prueba. | El título admite corte de palabras y sus contenedores pueden reducirse dentro de la cuadrícula. Se conservan el nombre completo y los enlaces de la invitación. |
| Editar, publicar, ver y eliminar competían visualmente; los controles eran pequeños y repetían nombres sin contexto accesible. | Editar mantiene la prioridad principal; Eliminar queda separado. Los controles tienen áreas táctiles de al menos 44 px, foco visible y nombres accesibles que identifican la invitación correspondiente. |
| La primera carga sólo ofrecía una línea de texto y el vacío necesitaba una jerarquía más clara. | Se añade un skeleton decorativo con estado de carga anunciado y movimiento condicionado a la preferencia del sistema. El vacío explica el siguiente paso y conserva su acción de elegir diseño. Una lectura fallida no se convierte en una falsa lista vacía. |
| Mi cuenta usaba campos de 13 px, sin semántica uniforme de teclado y autocompletado. | Los campos pasan a 16 px y conservan sus etiquetas envolventes. Se añaden nombres, tipos y autocompletado apropiados; WhatsApp usa `tel`. El correo de Google continúa siendo de sólo lectura. |
| El checkout manual mezclaba etiquetas pequeñas, campos compactos y controles con foco poco visible. | Se armonizan etiquetas, campos de 16 px, controles de selección, referencia y acciones con el resto de Socios. Se conserva la distinción entre preparar una referencia, enviar un comprobante y obtener la aprobación manual. |
| El historial tenía encabezados y enlaces de comprobante poco legibles. | Los encabezados identifican sus columnas con `scope="col"`; mejoran texto y contraste, las cifras usan numeración tabular y los enlaces de comprobante tienen nombre contextual y área táctil. La tabla mantiene sus cinco columnas y su región de desplazamiento horizontal propia. |
| Faltaba un acceso directo por teclado al contenido principal. | Se incorpora «Ir al contenido de Socios» con destino en su landmark principal. |

Los avisos de incertidumbre, los bloqueos ante operaciones pendientes y las acciones de comprobación se mantienen. Ningún cambio visual confirma por sí mismo una publicación, un guardado, un pago, un envío de WhatsApp o su lectura.

## Regresiones automáticas

La suite nueva `scripts/test-portal-ux-ui.cjs`, incorporada a `npm run verify` como `test:portal-ux-ui`, contiene **34 pruebas aprobadas, sin fallos**. Ejecuta los componentes reales del portal con hooks aislados, datos ficticios en memoria, transporte controlado y un modelo de DOM para foco y eventos.

La misma suite, aplicada a la revisión de referencia `506fe32b03c7469957c5ddd1b09afeabaa887d72`, produce **14 aprobadas y 20 fallos**. Esta comparación comprueba que las nuevas expectativas no se limitan a reproducir la implementación corregida. La ejecución ordinaria de la suite no necesita consultar Git.

Los casos cubren nombres accesibles y estados de navegación, selección de herramientas, cambio entre edición y vista previa, anchos de dispositivos, comparación 390/1024, acceso privado al borrador, estados de carga y error, bloqueos de invitaciones, campos y correo inmutable, lectura de suscripción sin crear un pago, historial semántico, landmarks y enlaces de salto. También comprueban entrada y circulación del foco en publicación, Escape, espera durante la publicación, restauración cuando el botón vuelve a estar habilitado y bloqueo de Ctrl+Z sobre el título del diálogo.

La regresión existente de publicación conserva su comprobación de que Guardar siga deshabilitado durante una publicación pendiente. Su selector cambia del antiguo texto «…» al nuevo «Guardando…»; se mantienen las afirmaciones sobre peticiones, versiones y bloqueo de un manejador obsoleto.

Evidencia local: `tmp/portal-ux/portal-ux-ui.log` y `tmp/portal-ux/portal-ux-ui-baseline.log`.

## Inspección visual automatizada y sus límites

Se prepararon **11 escenas** de los componentes reales: edición, vista previa y publicación del constructor; listado, vacío, cuenta, suscripción, referencia, carga, error y listado ocupado de Socios. La primera ronda cubrió anchos de 390, 768 y 1280 px. La confirmación realizó 15 comprobaciones en escenas representativas a 320, 390 y 1280 px.

En esa confirmación no se detectaron desbordamientos de página o de tarjeta ni controles visibles por debajo de 44 px, considerando la tolerancia de redondeo subpíxel. Los enlaces de salto midieron 43,99 px de alto con el redondeo del navegador. Estos resultados describen las escenas inspeccionadas, no todos los contenidos posibles de la plataforma.

Las fixtures usan datos ficticios y reproducen la estructura real del portal, pero **sustituyen los paneles interiores y el lienzo de la invitación por componentes aislados**. Utilizan Arial y Georgia como fuentes de sistema, sin solicitudes remotas. No acreditan el aspecto de las tipografías originales ni de una invitación renderizada. Las páginas de inspección visual son estáticas; la interacción de teclado del diálogo se prueba en el arnés de componentes, no mediante JavaScript de esas páginas.

El detector de Impeccable no devuelve hallazgos para el constructor. En Socios registra un aviso sobre `border-b-2` en la navegación: se conserva como indicador de sección activa de un patrón estándar de navegación, no como borde ornamental de una tarjeta. No se desactiva la regla ni se modifica su configuración para ocultarlo.

Evidencia: `tmp/portal-ux/visual-review.json`, `tmp/portal-ux/visual-after/manifest.json`, `tmp/portal-ux/builder-detector.json` y `tmp/portal-ux/partner-detector.json`.

Las pruebas manuales en el Android del usuario, el uso táctil físico y la aceptación con tecnologías de asistencia permanecen aplazadas. Tampoco se afirma una auditoría visual completa de cada panel interior del constructor.

## Conservación técnica y de originales

La comparación AST de las fuentes finales frente a la revisión de referencia confirma:

- **Constructor:** las 78 declaraciones originales de su componente mantienen su expresión; las 3 llamadas `fetch`, las 7 llamadas de hidratación o persistencia, los 3 subárboles `LivePreview` y los 12 paneles conservan sus argumentos y propiedades. Los únicos efectos nuevos gestionan foco y teclado del diálogo.
- **Socios:** los cuerpos previos al retorno de presentación de sus 12 funciones permanecen iguales, excluidos los textos de clases de campos y etiquetas. Las expresiones de sus 18 manejadores `onClick`, 7 `onChange` y 16 condiciones `disabled` se conservan. La guarda que bloquea BCP permanece igual.
- Los enlaces originales de ambos componentes conservan sus expresiones. Se añade únicamente el enlace interno de salto de cada superficie.

Las fuentes finales que corresponden al manifiesto de las fixtures son:

| Archivo | SHA-256 |
| --- | --- |
| `src/components/admin/builder/InvitationBuilder.tsx` | `8d27de6ec25a86e6a0927a72f501a55574e240fc53bb23cb72ee639d9abc4156` |
| `src/components/partners/PartnerDashboard.tsx` | `357c85941d19d2b0166e6c11e3bea2a6bbaf5dbd69596db442508bf405bf257d` |

La comprobación local conserva **597 archivos protegidos sin cambios** y verifica que la distribución de **129 recursos originales** está completa y sin incidencias. No se descargaron recursos nuevos. Estas comprobaciones locales se documentan por separado de cualquier verificación posterior en producción.

Evidencia: `tmp/portal-ux/final-invariants.json`, `tmp/portal-ux/protected.json` y `tmp/portal-ux/distribution.json`.

**BCP continúa desactivado.** No se habilitan credenciales, cargos, operaciones bancarias, envíos externos ni funciones nuevas de cobro. La presentación de una referencia o comprobante no acredita un pago aprobado. No se requiere una migración SQL adicional para este refinamiento.

## Resultados de publicación y cierre

Pendiente de incorporar tras completar la verificación integral y el despliegue. Los resultados anteriores acreditan la suite nueva, la comparación de fuentes, la inspección local y la conservación local de recursos; no constituyen todavía una confirmación del nuevo despliegue.

| Comprobación | Resultado |
| --- | --- |
| Verificación integral: lint, TypeScript, suites y build | `npm run verify`: salida 0; 1.345 pruebas en 45 archivos, sin fallos; lint, TypeScript y build correctos; 65 páginas generadas |
| Commit y CI de la revisión publicada | Pendiente de registrar |
| Despliegue de producción y cotejo de fuentes | Pendiente de registrar |
| Verificación HTTP de permisos y recursos en producción | Pendiente de registrar |
| Datos ficticios y limpieza final, si se utilizaron | Pendiente de registrar |
| Aceptación manual en dispositivos físicos | Aplazada por solicitud del usuario |
