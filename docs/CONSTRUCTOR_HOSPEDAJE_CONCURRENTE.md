# Hospedaje: conservación de ediciones locales

## Problema y corrección

La descripción de hospedaje en `TemplateContentFields` reconstruía `config.lodging` desde el primer hotel de un render anterior y sustituía toda la lista por esa única fila. Editar la descripción podía borrar hoteles posteriores y recuperar un nombre, una imagen o metadatos anteriores. Las rutas afectadas son `dolcevita`, `carmesi_v2`, `napoly`, `euforia`, `rosegold`, `allegria` y `grazia`.

La edición utiliza ahora el borrador vigente y una identidad local del hotel mostrado. Modifica únicamente su descripción, conserva las demás filas y respeta el orden actual. Si el hotel se reordena, un callback retenido continúa dirigido a ese hotel. Si se elimina o sustituye por otro objeto, ese callback se ignora y no restaura datos antiguos.

Cuando todavía no existe un hospedaje, se conserva la posibilidad de crear el primero al escribir. Dos cambios consecutivos del mismo callback crean una sola fila con nombre e imagen vacíos y conservan la última descripción. Esa acción queda ligada a la fila creada: no la resucita si después se elimina. Si otro flujo inserta un hotel o reemplaza la lista antes de la primera edición, el callback del campo vacío se descarta; el control actualizado permite continuar sobre los datos actuales.

La escritura fusiona la configuración vigente. Las modificaciones recientes del contacto, nombre, imagen y metadatos del hotel y los campos ajenos a hospedaje se conservan. El texto mantiene sus espacios y saltos de línea. Las identidades son exclusivas del editor y no se añaden al documento ni a los parches JSON.

## Alcance

- Se utiliza `draft.list` y `useLegacyDraft` sin modificar su implementación. Continúan las protecciones de propietario, plantilla, diseño, revisión y desmontaje del editor.
- Los editores de hoteles de Annie y Micky, Laura y Andrés y María Angélica y Mario ya usan listas por clave y permanecen intactos. Las transformaciones de prestaciones por paquete conservan su comportamiento.
- Se conservan el JSX, etiquetas, valores iniciales, estilos, diez editores delegados y normalizadores. Invitaciones públicas, presets, fotografías, música, animaciones y CSS global quedan fuera del cambio.
- Esta protección atiende operaciones simultáneas locales en el editor abierto. No añade colaboración entre dispositivos, persistencia de identidades tras recargar ni resolución de conflictos de guardado en el servidor.
- No se requieren migraciones SQL ni dependencias. Se conservan los permisos, la lógica de publicación, los precios y el proveedor bancario. BCP continúa bloqueado.

Skill aplicada: `vercel-react-best-practices`, especialmente actualización desde datos vigentes y callbacks seguros. No se incorpora un rediseño para corregir el estado.

## Verificación

`scripts/test-template-lodging-concurrency-ui.cjs` ejercita el componente nativo, el borrador y el motor de listas reales con datos ficticios en memoria. El arnés registra y rechaza cada intento de red, incluso si la aplicación capturase el error. Los diez editores delegados están aislados y no se atribuye cobertura de sus controles a esta suite. Se mantiene su cobertura previa en las pruebas de medios heredados.

Las regresiones cubren filas adicionales, edición sobre datos actuales, cambios de configuración, reordenación, eliminación, reemplazos y creación desde listas vacías o ausentes. La comparación con la referencia previa demuestra el comportamiento anterior. La suite nueva forma parte de `npm run verify`.

- **43/43 regresiones nuevas correctas**, incluyendo las siete rutas nativas y creación compatible desde listas ausentes o vacías.
- La misma suite contra `355a0703e87c5dcc2c1892fb383f5aa7286db46e` produce **38 fallos y 5 aciertos**, reproduciendo el problema previo. Los cinco aciertos aíslan comportamientos que ya funcionaban: cuatro protecciones de contexto y la inicialización vacía compatible.
- **28/28 pruebas de UX previas correctas** y los árboles estáticos de **12/12 rutas nativas conservados**. Se comparan elementos, textos, clases, valores y atributos accesibles, excluyendo callbacks, claves internas y los identificadores generados por el arnés.
- Revisión independiente: las **18 condiciones y diez delegaciones** permanecen intactas; solo cambian **dos `onChange` entre 88**. El hook, el motor de listas y los editores premium no cambian.

La comparación automática de las doce rutas nativas verifica estructura, textos, clases, valores y atributos accesibles. El despliegue se comprueba después de que Vercel confirme `Ready`, contrastando fuentes exactas, permisos HTTP y hashes de originales. Estas comprobaciones no reproducen una carrera dentro de un navegador autenticado de producción ni sustituyen la aceptación manual, aplazada por el usuario.

Evidencia privada: `tmp/template-lodging-concurrency/`.

## Verificación local previa al despliegue

- `npm run verify`: **1.489 pruebas correctas en 49 ejecuciones de suites**, lint, TypeScript y build con **65 páginas generadas**, código de salida 0. No se necesitó un reintento separado del build.
- **34/34 pruebas sin red** del verificador privado de producción.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 recursos originales**.
- La suite de hospedaje final queda revisada con hash SHA-256 del texto normalizado a LF `5d8e43895a9d316ffa7fcf99dcae90429a7cc04dfd969d49e400c1abb69e9d95`. La revisión independiente confirma el uso del componente, hook y motor reales y delimita la simulación de hooks en memoria.
