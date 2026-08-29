# Servicios · Fase 4: vigencia y renovaciones

Implementación local; **esquema de 008 y 009 comprobado**, pendientes commit, despliegue y aceptación con sesiones/dispositivos independientes. Tras la confirmación del usuario, `node scripts/check-services-db.cjs --phase4` pasó: nueve funciones presentes, columnas de accesos/vigencia disponibles, cálculo SQL de 30/60/90 días correcto, lectura privada del panel operativa y permisos anónimos denegados. No se consultaron registros personales ni se cambiaron fechas o datos de producción.

## Reglas del servicio

- Nuevas invitaciones con contrato vigente: **Plus 30, Premium 60, Exclusive 90 días después de la fecha del evento**. El día del evento no consume uno de esos días posteriores. Ejemplo: evento el 28/08/2026, Plus disponible hasta el 27/09/2026 inclusive.
- La fecha final incluye todo el día en **America/La_Paz (Bolivia)**. El enlace público y las operaciones RSVP/QR se cierran al día siguiente. Se evalúa en servidor/SQL al consultar: no depende de que alguien abra el administrador ni de un cron.
- Un borrador automático sin fecha queda pendiente y no puede publicarse ni habilitar operaciones a través de un snapshot anterior.
- Cambiar y guardar la fecha del evento o el paquete recalcula la vigencia. Los días adicionales se conservan. Un cambio visual sin cambio de fecha/paquete no altera el plazo.
- Ampliaciones: enteros de 1 a 3650 días por operación, **sumados al vencimiento actual, no a hoy**, incluso si el plazo venció. La vista previa advierte cuando la nueva fecha todavía está vencida. Acumulación limitada a 36500 días.
- Renovar no cambia `is_active` ni el estado editorial: una invitación pausada sigue pausada. Tampoco modifica el plazo de RSVP, las credenciales o los servicios del paquete.
- Las invitaciones anteriores conservan su fecha manual o su acuerdo sin vencimiento. No hay backfill de plazos ni adopción masiva. Activar el cálculo por paquete exige una acción explícita y confirmada. Si la fecha manual es posterior al cálculo base, la diferencia se conserva como días adicionales; un acuerdo sin fecha pasa a tener el vencimiento mostrado.

## Controles y avisos

- Editor → Configuración → **Vigencia y renovaciones**. Consulta del plazo realmente guardado, vista previa para cambios de evento/paquete sin guardar, ampliaciones, adopción automática y ajuste de acuerdos manuales anteriores.
- La lista administrativa tiene columna y filtro de vigencia. Aviso para fechas que vencen hoy o en los próximos **7 días**; enlace a `/admin/vigencia/[id]`, disponible también para invitaciones con editor anterior.
- El panel privado muestra el plazo y sus avisos junto a la sincronización automática. No expone el motivo administrativo ni el historial de acuerdos.
- Historial: últimos 30 movimientos visibles, todos conservados en SQL. Registra motivo, días añadidos, fechas anterior/nueva, revisiones y fecha del movimiento. Los cambios de evento/paquete se registran automáticamente cuando el cálculo automático está activo.
- El administrador confirma el acuerdo; **no se realiza ningún cobro**, ni se afirma que se verificó un pago. No se inventaron precios para renovaciones.
- Los avisos de esta fase son **dentro de la aplicación**. No hay mensajes automáticos por correo o WhatsApp ni garantía de que alguien vea un aviso si no abre el panel. Los envíos y seguimientos corresponden a la fase 5.

## Conservación y seguridad

Vencer el enlace no elimina invitados, confirmaciones, pases, registros de acceso ni versiones. El anfitrión conserva consulta/exportación de los servicios que tenga contratados. No se promete retención indefinida: esta fase separa el cierre público de cualquier futura política de eliminación. La retención de métricas anónimas ya existente es independiente. El borrado permanente explícito del administrador continúa siendo una acción distinta.

Los campos de vigencia son operativos y el guardado genérico del diseño no puede escribirlos. La fecha se calcula mediante trigger SQL. Solo el administrador puede cambiar acuerdos por una API dedicada; sesión, origen, entrada, revisión esperada e idempotencia se validan. La RPC bloquea la fila y guarda fecha + historial en la misma transacción. Un error del historial revierte la ampliación.

Si se pierde la respuesta después de guardar, el botón verifica **el mismo UUID**, sin duplicar días. El comando pendiente se conserva en memoria y, cuando está disponible, `sessionStorage` de esa pestaña. Un cambio de fecha/paquete/ampliación en otra sesión invalida una revisión anterior y exige revisar el plazo actualizado. La API nunca devuelve hashes de acceso ni datos de invitados en el resumen de vigencia. Tabla y RPC son privadas; `service_role` puede leer/insertar historial, no modificarlo directamente.

## Activación

1. Conservar respaldo y aplicar las migraciones anteriores necesarias: 001–004, 006, 007 y **008**.
2. Ejecutar **completo** `migrations/009_invitation_validity.sql`, incluido `BEGIN`/`COMMIT`. Es reaplicable. No ejecutar únicamente las consultas de comprobación.
3. Comprobar presencia sin datos personales:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invitations'
  AND column_name IN ('validity_mode', 'validity_extra_days', 'validity_revision');
SELECT to_regclass('public.invitation_validity_events') AS historial,
       to_regprocedure('public.enkarta_change_validity(uuid,text,integer,date,text,integer,uuid)') AS renovacion;
```

Si los objetos existen, comprobar que ambos permisos sean `false`:

```sql
SELECT has_table_privilege('anon', 'public.invitation_validity_events', 'SELECT') AS lectura_publica,
       has_function_privilege('anon', 'public.enkarta_change_validity(uuid,text,integer,date,text,integer,uuid)', 'EXECUTE') AS renovacion_publica;
```

4. Ejecutar `node scripts/check-services-db.cjs --phase4`. Comprueba esquema, permisos de lectura y cálculo puro; **no invoca renovaciones ni escribe registros**.
5. Ejecutar `npm run verify`, preparar preview con las fases 2–4 juntas y validar un evento ficticio. No activar automáticamente términos de eventos reales durante las pruebas.
6. Antes de producción, probar renovación simultánea en dos sesiones PostgreSQL independientes y revisar el cambio de día de Bolivia. La aceptación con dos teléfonos/cámaras de fase 3 continúa pendiente.

## Verificación local

Resultado final: `npm run verify` completó lint sin avisos, TypeScript, **42 pruebas del constructor + 57 SQL/API (99 en total)** y build optimizado. La compilación necesitó permiso para crear procesos fuera del aislamiento de Windows. No se aplicó SQL remoto ni se desplegó.

Revisión con navegador a 320/390 px: contenido de 315/384 px, sin desbordamiento horizontal. Se comprobó vista previa, respuesta perdida después de guardar, reintento con una sola ampliación, conflicto por cambio de fecha y advertencia al adoptar un acuerdo indefinido. Con `next start`, `/dev/services` y `/api/dev/validity` devolvieron 404; las APIs de vigencia y panel devolvieron 403 sin sesión. Servidores temporales detenidos y tamaño del navegador restaurado.

- Pruebas de calendario: meses, años bisiestos, último día inclusivo y avisos de 7 días.
- Pruebas SQL/API: paquetes coherentes con catálogo, adopción explícita sin acortar acuerdos, renovación idempotente, rechazo de revisiones antiguas, rollback ante fallo de auditoría, cambios de fecha/paquete, bloqueo sin fecha, conservación de invitados/respuestas/QR/historial, permisos y fallo de migración.
- `/dev/services` → **Vigencia** usa datos ficticios en memoria; permite perder una respuesta después de guardar, cambiar el evento en otra sesión y probar acuerdos anteriores. `/api/dev/validity` y la página de pruebas devuelven 404 fuera de desarrollo. No usan Supabase ni cobros.
- Las pruebas PGlite usan una conexión; no equivalen a dos sesiones de base de datos independientes.
