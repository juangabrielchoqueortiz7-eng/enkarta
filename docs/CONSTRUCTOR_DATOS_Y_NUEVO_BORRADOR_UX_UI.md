# Constructor: Datos y creación de nuevos borradores

## Alcance del refinamiento

Este bloque continúa la revisión UX/UI del portal con dos superficies concretas: el panel **Datos** del constructor (`ContentPanel`) y la selección de diseño para crear un borrador en Socios (`PartnerDesignPicker`). Mejora etiquetas, lectura, agrupación, foco y presentación en espacios estrechos, conservando los contratos actuales de edición y creación.

Los archivos de aplicación afectados son `src/components/admin/builder/panels/ContentPanel.tsx` y `src/components/partners/PartnerDesignPicker.tsx`. La página de servidor `src/app/socios/panel/nueva/page.tsx` mantiene su código: acceso autenticado, continuación del diseño elegido y datos de plan y cupo siguen resolviéndose en el servidor.

No se rediseñan las invitaciones ni se modifican sus renderizadores, presets, fotografías, música, animaciones, paletas o recursos originales. Tampoco se modifica el interior de `IconPicker`, `SectionIconsEditor` o `TemplateContentFields`. Sus propiedades y callbacks permanecen intactos.

## Skills y criterio aplicado

- **Impeccable**, en modo Operate: refinamiento de la interfaz de trabajo existente, jerarquía sobria, estados reconocibles y controles consistentes con Socios.
- **Web Design Guidelines de Vercel**: etiquetas asociadas, semántica nativa, navegación por teclado, foco, tamaño táctil, contraste y adaptación a pantallas pequeñas. Referencia consultada: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
- **Vercel React Best Practices**: conservación de los manejadores y referencias que protegen las ediciones asíncronas, evitando introducir nuevas consultas, estado compartido global o dependencias.

Se mantuvieron el contexto de `PRODUCT.md`, `DESIGN.md` y `docs/SKILLS_ENKARTA.md`, y la compatibilidad con React 18, Next.js 15 y Tailwind CSS 3. El uso de estas skills no equivale a una certificación automática de accesibilidad o aceptación visual.

## Panel Datos: problemas y correcciones

| Problema observado | Corrección aplicada |
| --- | --- |
| El componente `Field` mostraba un `label` separado del campo, sin asociación nativa. | `Field` ahora envuelve el texto y su único control en un `label`. La revisión independiente comprobó que los 20 sitios de uso actuales contienen exactamente un control nativo por etiqueta. |
| Secciones y etiquetas utilizaban texto pequeño y tonos grises débiles, con poca separación entre grupos. | Los grupos tienen encabezados h3; las etiquetas pasan a 14 px con contraste más claro y los campos a 16 px, foco visible y un alto mínimo de 44 px. |
| Las horas y los lugares de ceremonia y recepción repetían etiquetas sin agrupación semántica. | Se conservan sus etiquetas y se distinguen mediante dos `fieldset` con `legend`: Ceremonia y Recepción. Los iconos decorativos se excluyen del nombre accesible. |
| Las filas del itinerario dependían de placeholders para identificar hora y actividad. El botón de quitar sólo mostraba un símbolo pequeño. | Cada fila presenta «Hora del paso N» y «Nombre del paso N». Eliminar identifica su paso en el nombre accesible y dispone de un control de 44 × 44 px; agregar conserva su acción y mejora área táctil y foco. |
| Hora, nombre y eliminación competían por el espacio horizontal del panel. | Hora y nombre se apilan. Los contenedores y campos admiten reducir su ancho, y el área de Invitado conserva una columna en los anchos pequeños antes de pasar a dos. |
| Faltaban nombres nativos y tipos útiles para varios campos. | Se añaden `name`, tipos y autocompletado apropiados: WhatsApp utiliza `tel`, galería `url` y pases mantiene `number` con teclado numérico. Se conservan los tipos nativos existentes de fecha y hora. |
| La casilla «Sin niños» ofrecía un área de activación pequeña. | La etiqueta completa tiene un alto mínimo de 44 px, con foco visible en la casilla y el mismo valor booleano y callback. |

Los campos de **dirección o enlace de Maps** y **cuenta bancaria** continúan siendo texto, porque contienen formatos mixtos. La **hora del itinerario** también sigue siendo texto: no se transforma ni se rechazan los valores libres ya guardados. La fecha del evento y las horas de ceremonia y recepción mantienen sus controles nativos originales.

Los límites de pases y el valor local por defecto, el recorte de líneas de padres, los campos opcionales y el resto de las normalizaciones permanecen iguales. La numeración visible de los pasos se usa únicamente para sus etiquetas y nombres; la identidad de edición y eliminación sigue utilizando la clave estable de cada fila.

La cuenta bancaria del panel Datos es contenido de la invitación. Editar ese texto no habilita una pasarela, ejecuta una transferencia ni activa BCP.

## Nuevo borrador en Socios: problemas y correcciones

| Problema observado | Corrección aplicada |
| --- | --- |
| La cabecera usaba una altura fija y un espaciador de 110 px para centrar la marca, con una etiqueta secundaria de 9 px. | Se sustituye por una cabecera adaptable sin espaciador artificial, con marca y texto secundario legibles. Volver al panel tiene área táctil y foco explícitos. |
| No había un enlace de salto para llegar directamente al catálogo con teclado. | Se añade «Ir a los diseños», visible al recibir foco, con destino en el `main` enfocable. |
| Los nombres de diseños eran párrafos y las acciones repetidas no identificaban a qué diseño pertenecían. | Cada tarjeta utiliza un h2 y un nombre accesible de artículo. Crear y ver muestra incluyen el nombre del diseño en su etiqueta accesible, conservando el texto visible de cada acción. |
| Los botones y enlaces eran pequeños y compartían una fila que podía resultar ajustada en móvil. | Las acciones tienen un alto mínimo de 44 px, foco visible y una disposición que admite cambiar de línea. Se mejora el contraste y se muestran las descripciones completas. |
| El diseño elegido antes de entrar sólo se distinguía por el mensaje superior y su posición. | La misma tarjeta recibe un borde discreto y el texto «Tu elección». Se conserva la regla de mostrar primero el diseño elegido y el orden relativo de los demás. |
| La imagen incorporaba un zoom decorativo al pasar el puntero. | Se retira ese movimiento del catálogo. Las rutas, textos alternativos y el encuadre 4:5 permanecen iguales; se declaran dimensiones de 400 × 500 para ese espacio de presentación. No se reescriben las imágenes originales. |
| La espera de creación se comunicaba principalmente dentro del botón pulsado. | Se añade una región de estado independiente para espera, apertura verificada y resultado incierto. La colección anuncia que está ocupada durante la espera; la región de estado queda fuera de ella para no silenciar el aviso. |
| Los avisos y enlaces de recuperación necesitaban mejor contraste y separación. | Los errores conservan `role="alert"` y los enlaces existentes para revisar las invitaciones o abrir el UUID confirmado. La presentación mejora sin liberar bloqueos ni repetir el POST. |

Se corrigió una promesa factual del texto introductorio. «Personalízalo con sus datos, sus fotos y sus colores» pasa a **«Personalízalo con sus datos y sus fotos»**. El plan Inicio crea contratos Plus (`src/lib/partner-plans.ts` y `packageForPlan`), cuyas funciones declaran `colorCustomization: false` en `src/lib/packages.ts`. La ruta POST aplica ese contrato al crear el borrador. La corrección elimina la promesa universal de cambio de colores; no modifica planes, precios ni permisos.

Se conserva el catálogo de 32 diseños, sus muestras y sus imágenes. Este bloque no introduce búsqueda, filtros o una nueva selección previa a crear. El usuario sigue iniciando una creación explícita desde la tarjeta correspondiente.

## Contratos técnicos conservados

La comparación con la revisión `4c5fcf0a5292cacceea8155108636714442ee0bf` confirma:

- **Datos:** el prefijo funcional del componente y sus llamadas a `useLegacyDraft` siguen iguales. Se conservan las 24 expresiones `onChange`, los 2 `onClick`, valores, casilla, límites numéricos, filas de textarea y clave de lista. La comprobación del autor contabiliza 70 propiedades originales de controles sin cambios.
- **Hijos de Datos:** `IconPicker`, `SectionIconsEditor` y `TemplateContentFields` mantienen sus tres subárboles y propiedades, incluidos el destino de iconos, la comprobación de vigencia y los callbacks protegidos de la lista.
- **Nuevo borrador:** `createFrom`, referencias, estados, cuota, orden y bloqueo sincrónico son iguales antes del retorno de presentación. Los manejadores, condiciones de deshabilitado, cuatro enlaces originales y expresiones de imagen y texto alternativo permanecen intactos.
- **Servidor:** `src/app/socios/panel/nueva/page.tsx` no tiene diferencias respecto a la revisión de referencia, normalizando únicamente los finales de línea del checkout de Windows.

Una espera o un resultado incierto continúa con las protecciones ya existentes: plazo de 25 segundos, bloqueo de posibles duplicados, descarte de respuestas tardías y recuperación explícita. Una creación se presenta como confirmada únicamente después de recibir el UUID verificado. No se añaden reintentos automáticos, éxito optimista ni nuevas operaciones de red.

| Fuente | SHA-256 de la revisión comprobada |
| --- | --- |
| `src/components/admin/builder/panels/ContentPanel.tsx` | `abdf85b234f65a79c87d555ed8f6ecb7eca0e6f54a7ed40f353f8b87c7d27ca1` |
| `src/components/partners/PartnerDesignPicker.tsx` | `571aafc5fe0e10013b37c828110c00c26cc8189514b8f1fb8df5872224b45aab` |

Evidencia: `tmp/creation-content-ux/content-invariants.json`, `content-independent-review.json`, `picker-invariants.json` y `picker-independent-review.json`. Ambos detectores de presentación devuelven una lista vacía de hallazgos; no se desactivan reglas para obtener ese resultado.

## Pruebas automáticas del bloque

El log actual de `scripts/test-creation-content-ux-ui.cjs` registra **26 pruebas aprobadas y 0 fallos**. La suite se incorpora a `npm run verify` como `test:creation-content-ux-ui`. Usa `ContentPanel`, `useLegacyDraft`, `PartnerDesignPicker`, helper de solicitudes y catálogo reales, con hooks y transporte controlados en memoria.

Los casos comprueban asociación de las etiquetas principales, agrupación de lugares, tipos nativos, hora libre de itinerario, identificación de filas, conservación del último paso, agregado y edición sin reemplazar otros datos. También conservan la normalización de padres y pases y verifican que los callbacks retenidos de iconos o filas no afecten al vecino superviviente, otra invitación u otra revisión de edición.

En el catálogo se comprueban landmark y enlace de salto, los 32 diseños originales y sus destinos, encabezados, nombres accesibles, selección conservada, cupos de los tres planes, POST con la clave elegida y navegación única. Los estados pendientes, confirmados, inciertos, rechazados y el fallo de navegación mantienen los bloqueos y recuperaciones esperados. No se solicitan pagos ni subidas al abrir las superficies.

La misma suite sobre la revisión de referencia registra **15 aprobadas y 11 fallos**, como reproducción de las diferencias que se corrigen. Esta comparación no sustituye la ejecución de todas las pruebas del repositorio.

La revisión del arnés reforzó dos controles para evitar falsos positivos. Primero, se registra **cada intento HTTP** y se comprueba su allowlist al finalizar el escenario, incluso si el componente capturó el error: una solicitud no permitida no puede desaparecer del resultado por haber sido manejada. Segundo, los callbacks de los hijos se obtienen sólo de sus instancias activas. El caso de cambio de propietario comprueba que el nuevo callback pertenece al propietario actual y está vigente antes de cambiar la revisión; después verifica su invalidación y que el callback de la revisión nueva sí funciona. Dos comprobaciones negativas privadas confirmaron que las aserciones finales rechazan una solicitud prohibida capturada y un cuerpo JSON malformado, sin utilizar red real.

La suite existente de iconos de secciones localizaba cada fila del itinerario mediante una cadena exacta de clases de espaciado. Su selector pasa a identificar la clave estable de fila y sus campos de hora y actividad, conservando las aserciones sobre subidas y protección de cambios. Tras este ajuste del arnés, sus **35 pruebas** pasan sin modificar los manejadores de la aplicación.

Evidencia: `tmp/creation-content-ux/creation-content-ux-ui.log`, `creation-content-ux-ui-baseline.log` y `harness-negative-proof.log`. La verificación integral, CI y despliegue se registrarán en el cierre cuando estén confirmados.

## Inspección visual y límites

El manifiesto de fixtures contiene **11 escenas**: Datos con dos pasos, un paso y contenido largo; catálogo inicial, elegido, con cupo agotado, pendiente, incierto, rechazado, abriendo y con error de navegación. Los hashes de los componentes declarados en el manifiesto coinciden con las fuentes enumeradas arriba.

La inspección final realizó **44 comprobaciones**, correspondientes a esas 11 escenas en anchos de **320, 390, 768 y 1280 px**. En las escenas medidas no se detectaron desbordamientos de página o tarjeta, campos sin etiqueta ni áreas táctiles visibles menores de 44 px. Se admite una tolerancia de 0,2 px por redondeo subpíxel; la casilla se mide mediante su etiqueta envolvente, que también recibe la pulsación.

La comparación anterior, realizada a 390 y 1280 px, encontró **22 campos sin nombre accesible** en Datos: 18 campos principales y cuatro del itinerario de dos pasos. El checkbox ya tenía su etiqueta. Los campos utilizaban fuentes de 14 y 12 px; las fuentes finales de campo son de 16 px. En el catálogo anterior se midieron **65 áreas táctiles pequeñas** para sus 32 tarjetas y navegación.

Las fixtures reproducen el rail de herramientas de 88 px y los anchos del inspector de 430/500/540 px según breakpoint. En los anchos de navegador inspeccionados, el espacio disponible del panel fue aproximadamente 227, 297, 675 y 412 px, respectivamente. Se comprobó que pulsar la etiqueta «Nombres (ej: Ana & Carlos)» enfoca `invitation-names` y conserva su valor. El enlace de salto del catálogo se mostró al recibir foco con 43,99 px de alto.

La revisión independiente señaló además el inicio del breakpoint de dos columnas a **1200 px**, antes de que el inspector alcance su ancho `xl`. Se realizó una confirmación dirigida de las **tres escenas de Datos** a ese ancho: panel de 342 px y controles de hora de 125,02 px. No se observaron desbordamientos de página, campos fuera de sus grupos, campos sin etiqueta o áreas táctiles pequeñas. La captura confirmó que las horas y el calendario permanecen completos y las etiquetas de dirección pueden cambiar de línea; no requirió cambios adicionales de aplicación.

Las escenas renderizan los componentes reales afectados, pero aíslan los componentes hijos fuera del alcance. En el catálogo, las imágenes de las fixtures se sustituyen por un placeholder local declarado: las rutas reales se comprueban mediante las pruebas de componentes. No se renderizan invitaciones originales, no hay datos de clientes, solicitudes remotas u operaciones bancarias y se utilizan fuentes de sistema como fallback.

Esto permite revisar la disposición del portal sin afirmar que se haya certificado el aspecto de los hijos de Datos, de las tipografías originales o de una invitación final. Recibir foco en el enlace de muestra no certifica el desplazamiento automático nativo del navegador al enfocarlo. No se necesitaron cambios adicionales de aplicación después de esta inspección. Evidencia: `tmp/creation-content-ux/visual-review.json` y `visual-after/manifest.json`.

La revisión de código confirma contenedores que pueden reducirse, campos de ancho completo y filas de itinerario apiladas. Los resultados de disposición corresponden a los cuatro anchos y escenas enumerados: no constituyen una comprobación de todos los tamaños intermedios, contenidos posibles o implementaciones nativas de fecha y hora.

Las pruebas manuales físicas en Android y la aceptación con tecnologías de asistencia permanecen aplazadas por solicitud del usuario.

## Originales y pagos

La comprobación local conserva **597 archivos protegidos sin cambios** y confirma que la distribución de **129 recursos originales** está completa y sin incidencias. No se descargan, regeneran, recomprimen o sustituyen recursos. La identidad visual del portal no se propaga a las invitaciones.

**BCP permanece desactivado.** No se cambian variables de entorno, credenciales, proveedor, precios, cupos o reglas de publicación. No se requiere una migración SQL adicional. Evidencia local: `tmp/creation-content-ux/protected.json` y `distribution.json`.

## Resultados finales de publicación

Pendientes de completar tras confirmar la verificación integral y el despliegue. Los resultados locales descritos no acreditan por sí solos que este código esté publicado.

| Comprobación | Resultado |
| --- | --- |
| Inspección visual final en navegador y medidas | 44 comprobaciones en 11 escenas y 4 anchos, más 3 dirigidas a 1200 px; sin desbordamientos, campos sin etiqueta ni áreas táctiles pequeñas en esos casos |
| Verificación integral: lint, TypeScript, todas las suites y build | `npm run verify`: salida 0; 1.371 pruebas en 46 archivos, sin fallos; lint, TypeScript y build correctos; 65 páginas generadas |
| Commit y CI de la revisión publicada | Pendiente de registrar |
| Despliegue y cotejo de fuentes en producción | Pendiente de registrar |
| Comprobaciones HTTP de permisos y recursos originales | Pendiente de registrar |
| Datos ficticios y limpieza final, si se utilizaron | Pendiente de registrar |
| Aceptación manual en dispositivos físicos | Aplazada por solicitud del usuario |
