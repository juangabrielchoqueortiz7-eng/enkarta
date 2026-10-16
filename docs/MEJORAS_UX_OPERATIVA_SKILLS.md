# Invitados, WhatsApp y recepción: mejoras con las skills

La [edición segura de invitados](EDICION_SEGURA_INVITADOS.md) añade protección de
cambios sin guardar, validación y comprobación del contacto antes de WhatsApp.

La [recepción QR recuperable tras recargar](RECEPCION_QR_RECUPERABLE.md) añade
continuidad por evento, rol y sesión, con reintento explícito e idempotente.

## Alcance

Refinamiento de las herramientas operativas existentes. Se conserva la identidad del portal y de cada invitación. No requiere SQL adicional, nuevas dependencias de la aplicación ni cambios en el proveedor de pagos.

## Cambios

- **Invitados:** páginas de 25 grupos, rango y total visibles, navegación con foco en los resultados, filtros y resumen de mesas desplegables. Cambiar un filtro vuelve a la primera página; si una actualización reduce la lista se muestra una página válida. La búsqueda y los filtros actúan sobre la lista completa.
- **Exportación y WhatsApp:** siguen tomando todos los resultados filtrados, incluidas otras páginas. La cola conserva su límite de 200 contactos por revisión y sus controles de elegibilidad. La paginación no limita una exportación ni una cola a 25 contactos.
- **Mesas:** el resumen obtiene los cupos confirmados en una pasada. El filtro y el resumen coinciden también para valores heredados con espacios en los extremos.
- **WhatsApp:** nombre y contacto separados del mensaje; vista previa legible, copia del texto, progreso de contactos revisados y acción explícita para omitir. Revisar un contacto no se presenta como un envío. La actualización de [seguimiento recuperable](RECEPCION_BUSQUEDA_Y_SEGUIMIENTO.md#seguimiento-recuperable-después-de-recargar) conserva un resultado incierto al cerrar la cola o recargar; Escape y el botón de cerrar siguen la misma regla.
- **Recepción:** foco visible en el lector por foto, campos de 16 px, controles de al menos 44 px nominales y nombres accesibles para cada ingreso/salida. La búsqueda anuncia resultados sin volver a leer toda la lista de botones. Abrir una ficha no registra ingresos.
- **Aislamiento visual:** los estilos compartidos viven en `src/components/admin/operations/Operations.module.css`. Solo se aplican a herramientas operativas; no se importan desde invitaciones ni cambian el CSS global.

## Skills aplicadas

- Impeccable: refinamiento del modo operativo, estados, contenido largo y comprobación mecánica final.
- Web Design Guidelines de Vercel: foco, formularios, avisos dinámicos y controles táctiles. Fuente consultada: [pautas oficiales](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).
- React Best Practices: reducir recorridos repetidos y limitar las filas que se renderizan.
- Composition Patterns: separar navegación de páginas y presentación de datos sin alterar el contrato del dominio ni introducir APIs de React 19.
- UI UX Pro Max: consulta puntual de avisos contextuales para contadores; se usa un estado con contexto completo, sin regiones en vivo en cada celda.

## Verificación

- **214 pruebas aprobadas:** 98 de lógica/constructor, 87 de servicios y 29 de integridad. Los tres casos nuevos comprueban listas grandes o reducidas, conservación del alcance de CSV/WhatsApp y concordancia de mesas con valores heredados.
- Comprobaciones de tipos y lint correctas. Permanecen avisos previos de imágenes en `src/app/invitacion-invitali/page.tsx`; no se modificaron esos recursos para retirar advertencias.
- Detector final de Impeccable: `[]` en los componentes afectados. No se silenciaron reglas.
- Navegador local con datos ficticios en memoria: lista de 1.001 grupos con 25 tarjetas móviles o 25 filas de datos en escritorio; cambio de página; búsqueda desde otra página; filtro de confirmados; estado sin resultados.
- CSV descargado desde la segunda página de una lista de 63 grupos: 64 líneas con cabecera. La cola mantiene 42 contactos elegibles de todas las páginas. Omitir uno muestra 1 de 42 revisados sin marcar un envío ni abrir WhatsApp.
- Recepción: un resultado por nombre y selección sin ingreso. Foco visible del control de archivo, campo de código a 16 px y ausencia de errores de consola. No se solicitó permiso de cámara ni se enviaron mensajes.
- Viewports emulados de 390 y 360 px y escritorio de 1.280 px, sin desbordamiento horizontal del documento. No equivalen a pruebas de cámara, sonido o teclado virtual en iOS/Android físicos.
- **597 archivos protegidos** de `public/`, `Iconos INVITALI/`, componentes de invitaciones y rutas públicas comparados con la captura anterior a estos cambios: ninguna diferencia de SHA-256.

Evidencias locales en `tmp/skills-operations/verification.json` y capturas:

![Revisión de WhatsApp con datos ficticios](../tmp/skills-operations/whatsapp-mobile.jpg)

![Búsqueda privada de recepción con datos ficticios](../tmp/skills-operations/reception-mobile.jpg)

El entorno de prueba de listas está dentro de `/dev/services`, cuya página responde 404 en producción. BCP permanece desactivado. Se conservan los límites anteriores: no hay WhatsApp Business API, acuses de entrega/lectura, Wallet, recepción offline ni restricción de QR por ceremonia/recepción.

## Producción y limpieza

Desplegado en [Enkarta](https://enkarta.vercel.app), deployment `dpl_Fa7tyUMd2tC92Cy3vUwnT1KCzxsS`, estado `READY`, destino `production`. URL inmutable: <https://enkarta-7ksxj65e0-juangabrielchoqueortiz7-engs-projects.vercel.app>. La inspección de Vercel confirma que el dominio principal apunta a este despliegue.

- Compilación de producción correcta en local y Vercel.
- **19 comprobaciones HTTP aprobadas** sobre producción: publicación, separación de borrador, permisos, importación recuperable, seguimiento de WhatsApp, RSVP, recepción, ingresos parciales/concurrentes y pagos manuales idempotentes. El intento de aprobar un registro bancario sin verificación sigue rechazado.
- Limpieza final `verified-no-fixtures-remain`: solo se crearon y eliminaron los UUID de prueba de esta ejecución, incluidos invitados, pases, movimientos e historial de pagos. Sin mensajes enviados ni operaciones bancarias.
- **129 recursos originales publicados**, 46.481.464 bytes, coinciden con sus SHA-256 archivados.
- Inicio y catálogo responden 200. `/dev/services`, `/dev/operations` y `/api/dev/host-dashboard` responden 404.
- No se cambiaron variables de entorno, no se ejecutaron migraciones y BCP permanece desactivado.
- Servidor y pestaña local de pruebas cerrados; viewport restaurado. El CSV ficticio se retiró de Descargas y se archivó en las evidencias locales. No se creó commit ni se hizo push.

Evidencias: `tmp/skills-operations/production-http.json`, `production-originals.json`, `production-smoke.json`, `deployment.json` y `verification.json`. La prueba de interfaz con listas grandes se realizó en el navegador local; las comprobaciones posteriores de producción ejercitan los endpoints y permisos.

La paginación actual reduce las filas renderizadas. El snapshot operativo todavía contiene la lista completa; no se afirma que exista paginación de consultas en Supabase.

La [revisión recuperable de WhatsApp](WHATSAPP_REVISION_RECUPERABLE.md) añade después
la conservación de la lista elegida, posición y preparación solicitada al cerrar
o recargar. Se conserva el límite de 200 contactos, el seguimiento independiente
y los datos actuales del padrón.
