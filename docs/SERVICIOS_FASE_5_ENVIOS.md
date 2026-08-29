# Servicios · Fase 5: envíos y seguimiento

Implementado localmente. Pendientes: ejecutar `010_delivery_followup.sql`, comprobar Supabase, commit y despliegue.

## Estados honestos

- **Pendiente:** no hay acción registrada.
- **WhatsApp abierto:** Enkarta preparó el enlace de WhatsApp; no afirma envío, entrega ni lectura.
- **Envío marcado:** una persona del equipo declaró manualmente la acción.
- **Respondió:** existe confirmación o rechazo real; este estado tiene prioridad.
- **Recordatorio preparado:** cuenta aperturas de un recordatorio para pendientes. Tampoco acredita entrega.

No se agregó un proveedor automático, cobro, consentimiento ni una supuesta cantidad de “envíos ilimitados”. Los enlaces y mensajes personalizados pueden prepararse tantas veces como sea necesario, pero cada operación se describe con precisión.

## Funciones

- Panel del anfitrión con columna y filtro de seguimiento, contadores en CSV y detalle por invitado.
- Plantillas distintas para invitación y recordatorio. Variables: `{nombre}`, `{link}`, `{pases}`, `{mesa}`, `{codigo}`.
- WhatsApp inicial, recordatorio y marca manual separados. Los recordatorios solo se registran mientras el invitado continúa pendiente.
- Revisión optimista e idempotencia: el mismo reintento no incrementa dos recordatorios y un UUID reutilizado con otra acción o revisión se rechaza.
- La respuesta real cambia el estado derivado a “Respondió” sin borrar el historial de seguimiento.
- Solo administrador/anfitrión del evento con gestión de invitados. Revisión, puerta, anónimos y otros eventos no pueden mutar seguimiento.

## Activación

1. Aplicar migraciones anteriores hasta 009.
2. Ejecutar completo `migrations/010_delivery_followup.sql`. Es reaplicable y no elimina registros. Migra `sent=true` a marca manual conservadora con la fecha de creación como referencia mínima.
3. Ejecutar `node scripts/check-services-db.cjs --phase5`; es de solo lectura.
4. Ejecutar `npm run verify` y probar un evento ficticio antes de producción.

Verificación local terminada: lint, tipos, 44 pruebas del constructor, 60 pruebas de servicios y compilación de producción.

## Límites

- Sin API oficial de WhatsApp no sabemos si el destinatario recibió o leyó el mensaje.
- Los botones abren WhatsApp por acción humana; no hay automatización masiva ni mensajes sin consentimiento.
- PGlite prueba transacciones y revisiones con una conexión; la aceptación simultánea real sigue pendiente.
