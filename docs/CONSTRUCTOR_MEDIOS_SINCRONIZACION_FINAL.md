# Medios: sincronización final del constructor

## Objetivo

Cerrar la conservación de cambios de portada, música y galería al cambiar plantilla, restaurar el historial o recibir respuestas después de una edición. La revisión conserva la presentación del panel, los recursos originales, los contratos de subida existentes y los límites de cada paquete.

MediaPanel se conecta a la fuente y revisión existentes de InvitationBuilder mediante el borrador compartido. Los controles del contexto anterior no escriben en una invitación, plantilla, diseño o revisión diferente; desmontar el panel invalida sus callbacks. Las actualizaciones usan el documento vigente, incluidos los cambios que el padre ya aplicó antes del siguiente render.

Portada y música tienen revisiones independientes. Cada subida comprueba su propio destino y valor vigente, sin invalidarse por editar pies de foto o el otro recurso. Se conserva la diferencia entre elegir una nueva URL manual y recibir una respuesta de subida antigua. No se modifican ImageUploader, MultiImageUploader, compresión ni endpoints de almacenamiento.

Los textos de galería se asocian a su fotografía actual y se fusionan con los otros campos vigentes. Las eliminaciones, el orden y las fotos añadidas durante una subida se comprueban con regresiones específicas. El catálogo musical conserva sus rutas y los originales mantienen sus bytes.

El adaptador aplica la intención de la lista observada por el uploader a la galería vigente: quitar no restaura eliminados, añadir conserva un orden externo y reordenar permuta solo las fotografías observadas que siguen presentes. Las incorporaciones respetan el límite vigente y los textos se recalculan desde sus valores actuales. La asociación de títulos, pies y descripciones conserva el contrato existente por URL; no se afirma distinguir textos independientes entre copias de una misma URL.

Las revisiones de portada y música son objetos estables cuyo getter observa el borrador vigente cuando el uploader valida su intento. Así se detecta un cambio externo antes del render sin tratar una nueva URL manual como una respuesta antigua. El lote de galería recibe el destino del borrador y una guarda de contexto y límite; sus callbacks conservan la lista observada por ese render y la avanzan síncronamente en cada respuesta.

## Conservación y límites

- Solo cambian MediaPanel y su conexión de props en InvitationBuilder, además de pruebas y documentación. No se cambian renderizadores, presets, catálogos, estilos globales, dependencias, SQL ni permisos del servidor.
- Se aplica vercel-react-best-practices, con estado vigente y referencias compatibles con React 18. No hay cachés globales de datos privados.
- BCP permanece bloqueado. No se habilitan proveedores, claves ni operaciones bancarias. La modificación local preexistente de la migración 021 queda fuera de los commits.
- Descartar un resultado de cliente no borra un archivo que el servidor pudiera haber recibido. No se introducen borrados remotos ni reintentos automáticos.
- Los casos automáticos usan datos ficticios y transporte controlado. No equivalen a ReactDOM, aceptación visual móvil o una subida autenticada en producción. Las pruebas manuales permanecen aplazadas por indicación del usuario.

La evidencia privada de esta entrega se guarda en tmp/builder-media-final/. La verificación remota requiere el despliegue Ready y contrasta fuentes exactas, permisos y hashes de originales publicados; no edita invitaciones de clientes.

## Regresiones

La suite scripts/test-builder-media-final-ui.cjs contiene **30 pruebas correctas**. Contra el commit anterior `4d2eb602e90ed46a9d5ee93df0f8762f45e6062c`, obtiene **6 aciertos y 24 fallos**. Los componentes MediaPanel, borrador, contratos y helpers de galería son reales; los hooks y el transporte se controlan en RAM.

**Nueve casos integrados** ejecutan ImageUploader o MultiImageUploader con compresión y fetch simulados: cambios externos antes del render, cambio de plantilla o historial durante la espera, sustitución de música, galería actual y límites. No son solicitudes HTTP reales. La portada se comprueba mediante sus props y revisiones; no se afirma una subida HTTP de portada. Permanecen las regresiones previas de audio, lotes, compresión y video, sin cambiarlas.

## Validación local final

- **1.804 pruebas correctas en 59 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0. Se conservan las advertencias anteriores de imágenes y SVG heredado; no se añaden supresiones ni se modifican sus recursos.
- Revisión independiente de las dos fuentes y la suite sin bloqueantes. Clases, estilos inline y textos JSX idénticos tras normalizar saltos de línea: MediaPanel **30/0/17**, InvitationBuilder **128/0/37**. Es una comprobación estática, no aceptación visual.
- **597/597 archivos protegidos** idénticos por SHA-256, distribución completa de **129 originales** y **46/46 pruebas sin red** del verificador de producción. Sus cinco scripts privados quedaron revisados y congelados por hash.
