# Ediciones durante una operación de publicación

## Problema reproducido

Restaurar una publicación desde Historial permite continuar trabajando en Datos mientras se espera al servidor. Antes de este cambio, al llegar la respuesta se aplicaba el snapshot restaurado sobre el borrador actual, se retiraba el indicador de cambios pendientes y se vaciaba Deshacer. El guardado final también enviaba el snapshot anterior. Una edición hecha durante la espera podía perderse tanto en el editor como en el siguiente guardado.

La reproducción se realizó con `InvitationBuilder` real, componentes secundarios sustituidos y transporte ficticio: restaurar A, editar B durante la espera y resolver la publicación. Antes de corregirlo, el editor y el último PUT terminaban con A y Deshacer quedaba desactivado. No se consultaron ni modificaron invitaciones reales.

## Comportamiento esperado

- La versión publicada y el borrador de trabajo son dos documentos distintos. Confirmar una publicación no autoriza reemplazar ediciones posteriores del borrador.
- El editor registra las ediciones de contenido, incluido Deshacer/Rehacer. La sincronización de vigencia no cuenta como una edición visual.
- Si el usuario edita durante la espera, al terminar la publicación se conserva el contenido actual, su historial y su estado pendiente. Los metadatos operativos reflejan la publicación confirmada sin declarar que esas ediciones posteriores ya estén publicadas.
- Una escritura final encolada comprueba que su snapshot siga vigente antes de enviarlo. No debe escribir una copia antigua sobre una edición más reciente ni indicar falsamente que todo quedó guardado.
- Publicar, programar, restaurar una publicación y despublicar comparten esta protección. Sin ediciones intermedias se conserva su flujo normal.
- Una hidratación del historial iniciada antes de una confirmación nueva no debe retirar esa publicación de la interfaz ni del espejo local. La lectura se descarta cuando quedó desactualizada respecto del estado local de la invitación.

No se añaden reintentos automáticos de escrituras inciertas ni se inventa una confirmación del servidor. Los permisos, revisiones y transacciones del servidor mantienen su responsabilidad actual.

## Alcance y conservación

El cambio se limita al control de operaciones del constructor compartido por administradores y Socios, la política de caché de su lectura de historial y sus regresiones. No rediseña la interfaz, no cambia el contenido de ninguna invitación, preset o recurso original y no modifica estilos globales. No requiere migración ni dependencias nuevas. BCP permanece desactivado.

Los hallazgos de doble creación de borradores y esperas del checkout de Socios son trabajo independiente; esta corrección no afirma resolverlos.

- `PartnerDesignPicker` permite dos POST iguales al invocar dos veces el mismo manejador antes de renderizar su estado de creación. Un bloqueo síncrono del cliente evita ese caso; la comprobación transaccional del máximo de borradores es otro requisito del servidor.
- El checkout de Socios espera indefinidamente si su transporte o JSON no termina. Un límite de espera debe tratar el resultado de una escritura como incierto y permitir comprobarlo explícitamente, sin repetir cobros o solicitudes de forma automática. Este hallazgo no autoriza activar BCP.

## Límites de validación

Las pruebas del componente usan transportes, almacenamiento y relojes ficticios. Cubren la lógica del constructor; no equivalen a una prueba de renderizado de cada invitación ni a una aceptación física del nuevo comportamiento en Android. La aceptación móvil anterior de Ventas y su limpieza siguen cerradas en su propio alcance.

## Regresiones incorporadas

- `scripts/test-builder-publication-ui.cjs`: 13 casos con `InvitationBuilder`, validación, persistencia de versiones y efectos reales; sólo se sustituyen los renderizadores secundarios y las dependencias de red/almacenamiento. Cubre restauración lenta, publicación/programación con ediciones posteriores, Deshacer/Rehacer, despublicación, cola previa, reanudación del autoguardado, confirmaciones tardías, fallo de publicación, sincronización final fallida con Guardar explícito sin republicar, ausencia de reintento automático tras el error e hidratación inicial antigua.
- `scripts/test-builder-hydration.cjs`: seis casos del helper real. Una respuesta GET antigua no elimina una publicación confirmada ni revierte notas editadas/eliminadas o un checkpoint local. La lectura normal conserva su combinación y migración actuales, los cambios de otra invitación no invalidan esta lectura y un fallo devuelve el espejo vigente.
- `scripts/test-integrity.cjs`: tres casos nuevos con el handler real y PostgreSQL aislado cubren la política `private, no-store` y `Vary: Cookie` de las lecturas autorizadas, la denegación y los errores retornados. Conservan los cuerpos, estados HTTP, permisos y ausencia de creación de cookies; la suite de integridad pasa de 31 a 34 casos.

La prueba de despublicación introduce una edición antes de su PUT y otra durante la espera: se conserva la segunda y el estado pausado también al deshacer/rehacer. La vigencia canónica se sincroniza sin tratarla como edición visual. No se modifican esquemas de servidor ni se almacenan historiales privados en una caché global nueva.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **926 pruebas correctas**, incluidas **22 nuevas** en este bloque (19 de publicación/hidratación y tres de caché), lint, TypeScript y build completos. Sin nuevos avisos de lint en los archivos afectados; permanecen los avisos anteriores de imágenes en invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256. El guard de distribución verifica **129 originales completos**, incluidos los archivos ignorados por Git que se conservan en el despliegue desde el workspace completo.
- Revisión de la UI afectada con Impeccable y las [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): aviso operativo `role="status"`, texto legible y sin nuevos controles ni movimiento. El detector dirigido sólo informa un advisory preexistente del color del botón Publicar, que se conserva. Las pautas de React se aplican a refs, efectos, actualizaciones y separación de estado operativo.
- Las pruebas simulan el orden de las respuestas; no publican invitaciones reales ni realizan llamadas bancarias. No se efectuó una aceptación de navegador ni una revisión visual física de este nuevo comportamiento.

Evidencia local privada: `tmp/builder-safe-publication/verify-final.log`, `protected-local-final.json`, y los informes dirigidos en `tmp/builder-publication-edits/`. El log `verify.log` conserva la verificación inicial de 923 casos antes del ajuste HTTP.

## Hallazgo HTTP y ajuste de caché

El primer despliegue (`f329dc2430964f624afb9d31efcd14c773a71e8a`) quedó Ready y pasó CI, pero el smoke HTTP detectó `Cache-Control: public, max-age=0, must-revalidate` en `GET /api/admin/builder-state`: tanto en su error 401 genérico como en una lectura administrativa para un UUID ficticio confirmado inexistente. El error genérico no contiene datos privados; la política de una lectura autenticada del historial sí debe ser explícita. No se comprobó una filtración ni se consultaron historiales de clientes.

El ajuste envuelve las respuestas existentes de ese GET con `private, no-store` y agrega `Cookie` a `Vary`, conservando sus otros valores. No cambia la autorización, los filtros de invitación, el contenido o los métodos de escritura. Las regresiones incluyen éxito administrativo y de Socios, UUID ausente y errores 401/404/500/503. La inspección temporal cerró su cookie y no escribió datos. El reporte inicial se conserva como `tmp/builder-safe-publication/production-readonly-initial.json`; las cabeceras diagnósticas están en `cache-inspection.json`.
