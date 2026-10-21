# Configuración y controles pendientes del editor por bloques

## Problema y comportamiento corregido

Los ajustes de analítica, entrada y paquete reconstruían la configuración desde el render observado por cada control. En el editor por bloques, varias acciones de lista, selección múltiple, enlaces de datos y geometría también utilizaban bloques antiguos. Una acción posterior podía borrar un cambio reciente, restaurar una fila eliminada o descartar un bloque añadido mientras el control permanecía abierto.

ConfigPanel utiliza el borrador compartido existente, con la fuente y revisión del constructor. Las actualizaciones de analítica y entrada fusionan exclusivamente sus campos sobre el valor vigente. Los interruptores leen su valor actual; un control de retención antiguo no reactiva una analítica ya deshabilitada. Los callbacks del contexto anterior quedan inertes tras cambiar de invitación, plantilla, diseño, historial o desmontar el panel.

La sincronización autoritativa de vigencia es una excepción deliberada: comprueba el propietario y delega al control monótono existente de InvitationBuilder. Cambiar la plantilla o la revisión visual no descarta un vencimiento legítimo del mismo evento. Las API y ValidityPanel permanecen intactos.

La entrada conserva el diseño y sus recursos. Vídeo y poster tienen revisiones independientes: el retorno de una subida no borra el otro campo ni ajustes recientes de duración, texto u oscurecimiento. Cambiar su propio recurso, ocultar la entrada o abandonar el estilo cinematográfico invalida el destino anterior. Esto impide adoptar una URL obsoleta; no elimina automáticamente un archivo ya recibido por el servidor.

PackageSettings conserva la matriz comercial, los precios, los textos y las validaciones existentes. Lee el contrato actual al registrar paquetes, modificar opciones, añadir o quitar excepciones; conserva otros ajustes y valida los permisos relacionados con QR y RSVP. El formulario usa valores actuales antes del siguiente render y requiere nuevamente la aceptación al elegir otro paquete. No realiza cobros.

## Editor por bloques

InvitationBuilder entrega su dataRef existente al panel, junto a la revisión que ya invalidaba subidas e historial. Las operaciones usan el documento vigente. El reordenamiento aplica la permutación de IDs a los bloques actuales, conservando sus props, los bloques añadidos y los metadatos del layout; no restaura eliminados desde el array de arrastre.

Los controles de selección, alineación, distribución, ancho, orden de capas, grupos, duplicación y eliminación trabajan sobre los bloques actuales. Las acciones explícitas de selección, bindings, geometría y eliminación verifican la selección original. Las ediciones de props, estilo y animación fusionan sus objetos vigentes; los callbacks de medios conservan el ID del destino original al cambiar de selección, como en las regresiones anteriores. Copiar, limpiar y ordenar por dispositivo conserva la otra vista y los campos ajenos. Los controles compuestos de interruptor y punto focal utilizan transformaciones del valor actual.

Guardar una sección o plantilla relee los bloques después del diálogo de nombre y revalida el contexto. Solo la respuesta vigente de guardar/eliminar plantillas actualiza la biblioteca en pantalla; las respuestas de carga inicial ya superadas se descartan. Una petición pendiente no bloquea las otras acciones. Plantillas y secciones tienen contadores independientes: una modificación de una biblioteca no descarta la carga de la otra. Las funciones existentes de nube y almacenamiento no cambian: una operación ya iniciada puede completar su persistencia. Esta entrega no incorpora transacciones entre dispositivos ni cambia las API de biblioteca; tampoco afirma atomicidad de escrituras concurrentes en la nube.

## Alcance y conservación

- Se modifican ConfigPanel, PackageSettings, BlockEditorPanel y una prop en InvitationBuilder. No se rediseñan las invitaciones ni se cambian renderers, presets, música, imágenes, fuentes, animaciones o catálogos.
- No se cambia SQL, dependencias, estilos globales, CSP, permisos del servidor, formatos de biblioteca ni el adaptador de pagos. BCP permanece bloqueado. La modificación local preexistente de migrations/021_partner_draft_creation.sql queda fuera de la entrega.
- Skill aplicada: vercel-react-best-practices, con estado vigente y referencias locales compatibles con React 18. No se introducen cachés globales de datos privados.

## Verificación y límites

La suite scripts/test-builder-config-controls-ui.cjs ejecuta los componentes reales de configuración, paquetes y bloques, los contratos y el borrador con hooks controlados y datos ficticios en RAM. Los transportes de subida, arrastre, biblioteca en nube y los paneles operativos hijos se aíslan. Los callbacks de retorno y mutación sí son reales. No se afirma una prueba de ReactDOM, cámara, red de subida o persistencia remota de bibliotecas.

La verificación de producción contrasta los archivos fuente del despliegue Ready, permisos HTTP y hashes de originales públicos. No guarda cambios del constructor desde un navegador autenticado. La aceptación visual, el arrastre físico y las pruebas manuales en Android permanecen aplazadas por indicación del usuario. La evidencia privada de esta entrega se guarda en tmp/builder-config-blocks/.

La suite nueva contiene **60 pruebas correctas**. Ejecutada contra el commit anterior `f10662444c7b2388ba17c649c65a60a3e7832fcb`, obtiene **5 aciertos y 55 fallos**. Incluye cambios anteriores al render, metadatos ajenos, selección obsoleta, revisiones del historial, desmontaje, subidas de entrada, contratos actuales, sincronización de vigencia por propietario, punto focal, interruptores, duplicación recursiva con IDs únicos y diálogos de guardado. Las funciones de biblioteca son fronteras controladas: no se afirma verificar sus escrituras HTTP con estos casos.

Cinco casos con promesas diferidas comprueban la adopción de respuestas de biblioteca: una carga inicial no sustituye un guardado ya adoptado; una escritura pendiente permite mostrar la carga inicial y seguir usando los controles; plantillas y secciones conservan sus cargas independientes; cambiar de contexto o desmontar invalida respuestas; una respuesta reemplazada no revierte la pantalla. No se ejecutan temporizadores de red ni escrituras reales de biblioteca.

## Validación local final

- **1.774 pruebas correctas en 58 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 en la verificación final completa. Se conservan las advertencias previas de imágenes y del SVG heredado; no se añaden supresiones.
- La revisión de otro agente detectó dos regresiones durante el desarrollo: el bloqueo global de biblioteca con una petición pendiente y la invalidación de vigencia por cambios visuales. Ambas se corrigieron y cuentan con regresiones. El informe final consolida esa revisión y las comprobaciones de hashes realizadas por el agente principal.
- Clases, estilos y textos JSX idénticos tras normalizar saltos de línea: ConfigPanel **80/1/30**, PackageSettings **39/0/19**, BlockEditorPanel **370/5/183** e InvitationBuilder **128/0/37**. Los números representan clases, estilos inline y nodos de texto; son una comprobación estática, no aceptación visual.
- **597/597 archivos protegidos** idénticos por SHA-256, distribución local completa de **129 originales** y **46/46 pruebas sin red** del verificador de producción. Los cinco scripts de verificación privados fueron revisados por otro agente y sus hashes permanecen congelados.

## Resultado de producción

El commit de aplicación `250c27d61591a358d9181adca93b4507a2a76f6d` quedó integrado en main y desplegado como `dpl_45SqTW4EmZUR1A21LWKjpqUjfRPT`, con estado **READY** y alias [enkarta.vercel.app](https://enkarta.vercel.app). [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39613943219) terminó correctamente, incluida la verificación completa y la auditoría de dependencias de producción. Las **12 fuentes críticas** coinciden con los archivos revisados.

- **17 grupos HTTP correctos**, **105 rechazos 401**, incluidos **78 intentos de escritura sin permiso**, y **10 rechazos 403** de lectura de exportación/analítica. No se ejecutó analítica autenticada porque ese endpoint puede realizar mantenimiento de retención.
- El UUID ficticio inexistente conservó **0 filas antes y después**. La subida autenticada sin archivo recibió 400 antes de acceder al almacenamiento. La auditoría vacía no recibió URLs ni produjo cambios.
- **129/129 originales publicados** conservaron longitud y SHA-256; **6/6 rutas públicas** respondieron correctamente. La comprobación final conserva los **597 archivos locales protegidos**.
- **0 escrituras de negocio, usuarios, archivos, pagos, llamadas bancarias o mensajes**. No quedaron fixtures persistentes que eliminar y la cookie temporal de administración se cerró al terminar.
- BCP conserva su bloqueo en el código y la configuración local; no se inspeccionó la configuración remota del proveedor ni se realizaron operaciones bancarias. Esta entrega no requiere SQL y conserva la modificación local preexistente de la migración 021 fuera de los commits.

La prueba remota acredita fuentes, permisos y conservación de recursos. No se realizó una edición autenticada de configuración/bloques ni una subida exitosa en el navegador de producción. Los casos de concurrencia y respuestas demoradas se verificaron con componentes reales y fronteras controladas en la suite local; las manuales permanecen aplazadas. `tmp/builder-config-blocks/RESULTADO.json` contiene el cierre de evidencia.
