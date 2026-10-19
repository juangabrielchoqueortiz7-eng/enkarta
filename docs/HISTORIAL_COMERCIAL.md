# Consulta del historial comercial

## Problema y resultado

El guardado comercial registra cada cambio en `commercial_lead_history`, pero el panel no ofrecía una forma de consultarlo. La mejora añade **Ver historial** a las filas de Ventas y a la ficha de búsqueda por referencia, como consulta de solo lectura.

No necesita una migración nueva: la tabla, los permisos de servidor, el índice por contacto y la eliminación en cascada existen desde 012. El guardado transaccional de 019 se conserva.

## Interfaz

- El historial empieza cerrado. Solo consulta al abrirlo; no se descargan los historiales de todos los contactos al cargar Ventas.
- Muestra 20 registros, ordenados del más reciente al más antiguo. **Ver 20 anteriores** reemplaza la página; **Volver al más reciente** inicia una consulta nueva. No acumula filas sin límite en el navegador.
- Cada registro contiene fecha, estados anterior y registrado, ingreso registrado y nota guardada. Si el estado es el mismo, muestra **Seguimiento actualizado**: 019 registra también cambios exclusivos de nota o importe.
- Los valores son snapshots posteriores al guardado. La tabla no contiene actor, revisión ni valor anterior de nota/ingreso; la interfaz no atribuye autoría ni inventa diferencias.
- El texto **Sin registrar** distingue un ingreso nulo de **0,00 Bs**. Un ingreso registrado no acredita un cobro; el historial tampoco confirma mensajes enviados.
- Estado vacío: **Aún no hay cambios registrados**. Una falla conserva la página anterior y ofrece reintentar la consulta que falló; no la convierte en una lista vacía ni en éxito.
- Cerrar cancela la solicitud y descarta los registros del componente. Cambiar de contacto o revisión invalida la página anterior y recarga solo si el historial estaba abierto.
- Abrir/cerrar el historial no modifica los campos, borradores, conflictos ni solicitudes de guardado del editor. La búsqueda sigue siendo de solo lectura, sin un segundo editor del mismo contacto.
- Controles táctiles de 44 px, foco visible, etiquetas con referencia y notas largas con ajuste de línea. Sin modales, CSS global ni cambios de tema.

## Contrato privado

`GET /api/admin/commercial/history?leadId=UUID&cursor=...`

1. Comprueba la sesión de administrador antes de validar parámetros o consultar.
2. Rechaza parámetros desconocidos/duplicados, UUID inválidos y cursores de otro contacto.
3. Comprueba la existencia del contacto leyendo solo `id,reference`.
4. Recupera como máximo 21 movimientos del contacto, hasta el corte de la consulta, ordenados por `created_at DESC, id DESC`. Devuelve 20 y usa el registro adicional para indicar continuación.
5. Devuelve exclusivamente `lead`, `asOf`, `entries` y `pagination`. Cada entrada contiene `id,lead_id,from_status,to_status,revenue_bs,note,created_at`. No consulta ni expone los payloads/recibos de `commercial_lead_update_requests`.

El cursor base64url versión 1 contiene contacto, corte y última tupla. Conserva los seis decimales de PostgreSQL y normaliza el sufijo UTC `+00:00` a `Z`. No es una credencial; cada página requiere autenticación. No existe un límite de 180 días en esta consulta: también permite revisar contactos antiguos encontrados por referencia.

Todas las respuestas usan `Cache-Control: private, no-store`. Errores: 400 `INVALID_QUERY`, 401 no autorizado, 404 `NOT_FOUND`, 503 `MIGRATION_REQUIRED` si falta el esquema 012 y 500 `READ_FAILED`, sin detalles internos de SQL. La consulta no escribe datos.

El cliente vuelve a validar identidad y referencia, pertenencia de cada movimiento, orden, corte, cursor, tamaño y campos permitidos antes de sustituir lo visible. Las respuestas tardías quedan descartadas por secuencia y cancelación; el tiempo de espera es de 20 segundos. No se guardan notas ni historiales en almacenamiento persistente o cachés globales.

## Verificación local y alcance de entrega

- Ocho regresiones de servicios/PostgreSQL: permisos de los roles reales, 401 antes de validar, 400 antes de consultar, contacto ausente/vacío, 45 movimientos en páginas de 20 + 20 + 5, empates con microsegundos, registros de 2001, corte estable, estado sin cambio, importes cero/nulos/heredados, whitelist, errores y ausencia de escrituras.
- Diecisiete regresiones del cliente: fechas/cursores, rechazo de páginas cruzadas o incompletas, ausencia de coerciones, conservación de cero/nulo, petición privada con señal de cancelación, errores sin detalles internos y render inicial sin una segunda superficie de edición.
- `/dev/services/commercial-history` proporciona 45 registros ficticios por contacto, notas largas/vacías, errores, lentitud y cambio de identidad/revisión. El transporte es exclusivamente de memoria y la ruta responde 404 fuera de desarrollo.
- La revisión cruzada del código comprobó la cancelación, el descarte de datos al cerrar y la preservación de borradores. No equivale a una aceptación visual en navegador.
- Verificación completa: **475 pruebas correctas** (196 constructor, 153 servicios, 19 PostgreSQL de guardado, 24 contrato/reducer del editor, 14 PostgreSQL del dashboard, 16 contrato del dashboard, 17 contrato/render del historial, 31 integridad y 5 distribución), lint, TypeScript y build correctos. Persisten las advertencias existentes de imágenes de invitaciones originales. **597/597 archivos protegidos** idénticos por SHA-256.
- Desarrollo en la rama `codex/commercial-history`, sin fusionar ni desplegar este bloque. La aceptación manual y las pruebas de producción se dejan pendientes conforme al aplazamiento del usuario. No se han creado datos de producción para este bloque.
- Los diseños, presets, recursos originales y el adaptador BCP están fuera de este cambio. BCP continúa desactivado.

Evidencia privada de verificaciones locales: `tmp/commercial-history/` y `tmp/commercial-history-services.log`.
