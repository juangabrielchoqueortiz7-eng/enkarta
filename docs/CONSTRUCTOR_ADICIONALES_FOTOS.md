# Fotos de Servicios adicionales y conservación de cambios

## Problema y corrección

La foto de Save the Date utilizaba una función que reconstruía toda la configuración desde el render en el que comenzó la subida. `ImageUploader` conserva deliberadamente el destino seleccionado al iniciar la operación; al completar la petición, esa función antigua podía restaurar un título, responsable, titular, música u otros valores anteriores.

`AdditionalServicesPanel` reutiliza ahora `useLegacyDraft` y fusiona únicamente los campos del servicio sobre la configuración vigente. `InvitationBuilder` pasa su referencia de datos y su revisión de edición a través de `ConfigPanel`. Así se conserva también un cambio externo ya registrado en el borrador antes del siguiente render. Los cambios consecutivos del propio panel se acumulan antes de notificar al padre.

La foto conserva su identidad de destino y su revisión. Se descartan resultados si cambia la foto elegida, se limpia el campo, se retira el servicio, se desactiva una página previamente activa o cambia el contexto de edición. Deshacer, rehacer y reemplazar el documento reutilizan la revisión existente del constructor. Los cambios de título o responsable mantienen la subida válida y se conservan al incorporar su URL.

Una página inicialmente desactivada puede preparar su foto sin publicarse. La corrección no activa el servicio ni cambia los campos de publicación de forma automática.

## Alcance y conservación

- Solo cambian `AdditionalServicesPanel`, las propiedades que recibe `ConfigPanel` y las dos referencias que conecta `InvitationBuilder`.
- `ImageUploader`, `useLegacyDraft`, la compresión, los permisos de subida y las reglas de servicios adicionales permanecen intactos. No se cambian carpetas, propietario, relación de aspecto, textos ni clases visuales del control.
- Se conservan el componente `SaveDateSummary`, los formatos originales y la construcción existente de los arrays del menú. Esta entrega preserva esos valores frente a la foto, sin afirmar resolver carreras internas de otras listas o consultas.
- No requiere SQL, dependencias, estilos globales ni cambios en los renderizadores o recursos de las invitaciones. BCP permanece bloqueado.

Skill aplicada: `vercel-react-best-practices`, reutilizando el borrador compartido y las referencias existentes, sin cachés globales de datos privados ni APIs exclusivas de React 19.

## Regresiones automáticas

`scripts/test-additional-services-media-ui.cjs` ejecuta el panel, `ImageUploader`, `useLegacyDraft` y la compresión reales con archivos ficticios y transporte controlado en memoria. **28/28 pruebas correctas**. La referencia del componente anterior en `ef84440622d7eefce1efe96a01da41e3fb54083b` produce **8 aciertos y 20 fallos**, reproduciendo las pérdidas anteriores. La ejecución habitual de CI no requiere Git.

Se verifican bytes de `File`/`FormData`, destino de la petición, conservación de campos recientes, cambios antes del render, parches consecutivos, selección o eliminación de fotos, retirada del servicio, contexto obsoleto, desmontaje y errores de red/JSON. Las comprobaciones AST confirman que las referencias se conectan realmente desde el constructor y a través de ConfigPanel.

La cancelación de una operación obsoleta impide adoptar su resultado; no revierte un archivo que el servidor ya hubiera recibido. No se agrega borrado automático de medios ni resolución de conflictos entre dispositivos. El arnés de hooks no equivale a una prueba de ReactDOM, permisos nativos del celular o aceptación visual.

## Producción

La verificación técnica contrasta las nueve fuentes críticas del despliegue Ready, permisos HTTP y hashes de originales. Usa un identificador ficticio inexistente y solicitudes de subida denegadas; la solicitud autenticada de subida carece de archivo y propietario y debe rechazarse antes del almacenamiento. No se modifican invitaciones de clientes ni se crean archivos de prueba en el bucket.

Evidencia privada: `tmp/additional-services-media/`. Los resultados finales se registran después de completar las comprobaciones. La aceptación manual queda aplazada.

## Validación local final

- **1.600 pruebas correctas en 53 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. No se introducen advertencias en Servicios adicionales o ConfigPanel; permanecen las advertencias previas de otros componentes.
- **46/46 comprobaciones sin red** del verificador privado de producción y revisión independiente de sus solicitudes y limpieza.
- Revisión independiente de las tres fuentes y la suite sin bloqueantes. Se conservan íntegramente los atributos de clases: **108 en Servicios adicionales, 80 en ConfigPanel y 128 en InvitationBuilder**. Los dos puentes solo añaden las referencias autorizadas.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 originales**. No se modifica el código del control de subida, la compresión ni sus permisos.
