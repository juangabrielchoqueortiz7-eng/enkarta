# Elementos decorativos y packs: conservación de cambios

## Problema y corrección

ElementsPanel reconstruía el documento de bloques y los objetos props/layout desde el render de cada control. Editar color y posición, añadir un elemento, duplicar o aplicar un pack podía restituir una lista antigua y perder cambios recientes. El guardado de packs también usaba los elementos anteriores al diálogo de nombre.

El panel reutiliza useLegacyDraft con la fuente y revisión existentes del constructor. Las operaciones de lista trabajan sobre los bloques vigentes y conservan los metadatos completos del layout. Los ajustes de un elemento fusionan sus campos actuales por ID y tipo; un elemento eliminado no se restaura por un callback retenido. Los controles del editor dejan de aplicarse cuando cambia su selección observada.

Añadir elementos o packs conserva los bloques ajenos. Duplicar usa el clonador existente, con IDs únicos y el desplazamiento original de 16 píxeles. La copia se selecciona inmediatamente: un segundo uso del mismo handler antiguo se descarta; después de renderizar se puede duplicar la nueva selección. Los interruptores usan el valor actual.

La paleta del tema se resuelve desde el color vigente. Elegir paleta o motivo y aplicarlo antes del siguiente render conserva esa elección. Guardar como pack revalida el documento y relee sus elementos después del prompt, incluso si durante la espera hubo ediciones. Los packs guardados se consultan de nuevo antes de aplicarse; la biblioteca conserva su formato y límite existentes.

## Selector y subidas

ElementPicker comprueba su montaje y el contexto original antes de escribir la biblioteca, favoritos, recientes o entregar una selección. Las selecciones consecutivas componen favoritos y recientes mediante referencias locales. La revisión compartida llega al fieldRevision existente de ImageUploader.

El callback de una subida conserva deliberadamente su contexto inicial: no se redirige hacia otra invitación mediante una referencia del callback más reciente. El guard evita adoptar una URL obsoleta o guardarla en la biblioteca; no revierte un archivo que el servidor ya hubiera recibido. No se añade borrado automático de archivos.

SectionIconsEditor recibe el borrador heredado cuando el diseño usa esa rama. El editor de iconos, el uploader, los permisos de subida, las librerías de bloques, SVG y packs permanecen intactos.

## Alcance y conservación

- Cambian únicamente ElementsPanel, ElementPicker y las propiedades conectadas en InvitationBuilder. No se modifican otros paneles ni las invitaciones públicas.
- Se conservan textos, clases, estilos, catálogos, rangos, motivos, paletas y presets originales. No se descargan ni regeneran recursos.
- No se cambian formatos de almacenamiento, SQL, dependencias, estilos globales ni permisos del servidor. BCP permanece bloqueado.

Skill aplicada: vercel-react-best-practices, con actualizaciones basadas en el estado vigente y referencias locales compatibles con React 18. No hay cachés globales de datos privados ni resolución nueva de conflictos entre dispositivos.

## Verificación automática y límites

La suite scripts/test-builder-elements-ui.cjs ejecuta ElementsPanel, ElementPicker, useLegacyDraft y los helpers de bloques/packs reales con datos ficticios, hooks controlados y almacenamiento aislado en RAM. La delegación a SectionIconsEditor se comprueba mediante sus props en una frontera aislada; no se afirma renderizar sus iconos en esta suite. ImageUploader se sustituye por una frontera controlada para entregar el callback de retorno: esos casos verifican la adopción de URL y la escritura local, sin afirmar cobertura HTTP o cancelación de una subida real. La ejecución habitual de CI no requiere Git; el baseline es una comprobación local separada.

Las pruebas no equivalen a ReactDOM, un arrastre físico en el lienzo o aceptación móvil. Las manuales permanecen aplazadas por indicación del usuario. La suite nueva obtiene **34/34 pruebas correctas**. La referencia anterior 39cfac783cdfd831d186fad286b606496dbfd5f8 produce **2 aciertos y 32 fallos**. Hay cuatro casos integrados de ElementPicker real con el callback de ImageUploader aislado. El aviso de keys de un SVG heredado también aparece en el baseline y se conserva sin alterar el catálogo.

## Verificación de producción

Se contrastan once fuentes críticas del despliegue Ready, los permisos HTTP y los hashes de originales publicados. El smoke remoto usa un UUID ficticio inexistente y solicitudes acotadas; no edita elementos ni guarda packs desde un navegador de producción.

La evidencia privada se guarda en tmp/builder-elements/. RESULTADO.json reúne CI, despliegue, fuentes exactas, resultados, cierre de sesión y conservación de originales. No se crean usuarios, archivos, pagos ni mensajes persistentes; no se registran credenciales ni cookies.

## Validación local final

- **1.714 pruebas correctas en 57 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. Permanecen las advertencias previas de imágenes y el aviso de keys del SVG heredado. No se añaden supresiones de lint para esta corrección.
- Revisión independiente de las tres fuentes y la suite sin bloqueantes. Se conservan las **113 clases y 8 estilos inline de ElementsPanel**, las **32 clases y 1 estilo inline de ElementPicker**, y sus raíces JSX salvo callbacks y props de guardas explícitas. Registry, librerías de SVG/packs, uploader, iconos heredados y borrador compartido permanecen intactos.
- **46/46 comprobaciones sin red** del verificador privado de producción y revisión independiente de sus cinco scripts.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 originales**. La modificación local preexistente de la migración 021 queda fuera de los commits.
