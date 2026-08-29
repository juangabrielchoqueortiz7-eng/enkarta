# Servicios · Fase 7 — Adicionales con entrega verificable

Implementación local del 28 de agosto de 2026. Esta fase convierte seis
adicionales comerciales en entregas con alcance, responsable, fecha, estado y
comprobaciones. No cambia los precios ni concede funciones por seleccionar una
opción visual.

## Expediente operativo

En **Config → Adicionales con entrega verificable** cada adicional puede estar:

- no contratado;
- contratado;
- en proceso;
- bloqueado;
- entregado.

Cada tarjeta registra responsable, fecha comprometida, notas internas, porcentaje
y lista de comprobación. Marcar **Entregado** con comprobaciones pendientes bloquea
la publicación. Los briefs, responsables, notas y referencias internas se eliminan
del documento enviado al navegador público.

## Dominio propio

Registra dominio, titular o cuenta, vencimiento y renovación. La entrega exige
comprobar titularidad, DNS y HTTPS. La conexión del dominio continúa siendo una
operación controlada en Vercel y el registrador: Enkarta no afirma haber conectado
ni renovado un dominio solo porque alguien escribió su nombre en el editor.

## Otro idioma

Admite español de Bolivia, inglés, portugués y francés. El idioma entregado
localiza automáticamente el formulario RSVP, estados principales, entrada, fechas
y Save the Date. Los textos editoriales se traducen directamente en los bloques.
El checklist exige confirmar contenido, formulario, fechas, mensajes del sistema y
revisión del cliente antes de declarar la traducción entregada.

## Save the Date

Nueva ruta independiente: `/save/[slug]`.

- Portada, imagen, mensaje y CTA configurables.
- Preconfirmación separada del RSVP definitivo.
- Estados: interesado, quizás y no disponible.
- Cupos estimados, mensaje y corrección posterior desde el mismo navegador.
- Operaciones idempotentes: un reintento no duplica respuestas.
- Control de revisión para evitar sobrescribir cambios desde otra sesión.
- Resumen de respuestas dentro del editor.
- Cuando la invitación definitiva ya está publicada, aparece el acceso a ella.

La preconfirmación nunca crea QR, cupos confirmados ni ingresos al evento.

## Personalización total

Registra brief, referencias, identificación de propuesta y aprobación fechada.
El expediente operativo no sustituye las versiones y comentarios del constructor;
los complementa para demostrar qué propuesta aprobó el cliente.

## Menú de navegación

Las invitaciones por bloques pueden seleccionar destinos estables, renombrarlos y
elegir menú superior o inferior con estilos cristal, sólido o minimal. El control
exige al menos dos destinos y una comprobación móvil. Las plantillas antiguas sin
identificadores de bloque no presentan un menú que pueda apuntar a lugares
incorrectos.

## Visibilidad extendida

Reutiliza la vigencia protegida de la fase 4. La entrega exige ampliación aplicada
mediante su historial, nueva fecha visible y notificación al cliente. No se mantiene
una segunda fecha paralela dentro del JSON del diseño.

## Base de datos

Aplicar completa, con respaldo previo, la migración
[`011_verifiable_addons.sql`](../migrations/011_verifiable_addons.sql) después de
la 010. Es reaplicable y no borra respuestas.

La tabla `save_date_responses` y la función `enkarta_submit_save_date` quedan
restringidas a `service_role`; `anon` y `authenticated` no pueden leer respuestas
ni ejecutar la mutación directamente.

Después de aplicarla:

```powershell
node scripts/check-services-db.cjs --phase7
```

La comprobación es de solo lectura. La aceptación en producción requiere registrar
una preconfirmación de ensayo, corregirla desde el mismo navegador y confirmar que
el panel privado ve una sola respuesta con la última revisión.
