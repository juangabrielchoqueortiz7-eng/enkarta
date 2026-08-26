# Constructor Enkarta — Fase 7

## Resultado

El constructor ya puede producir una invitación distinta para cada persona sin duplicar diseños. El editor permite elegir un invitado real y comprobar inmediatamente sus textos, secciones privadas, estado de confirmación y pase de acceso.

## Contenido dinámico

- Campos enlazables a nombre, pases, mesa, código de acceso, estado RSVP y grupo.
- Variables insertables dentro de cualquier texto, por ejemplo `Hola, {{guest.name}}`.
- Las variables funcionan en el editor y en la página pública abierta con `?g=`.
- La edición manual de un campo puede desprenderlo de su enlace sin afectar a los demás.

## Audiencias y privacidad

Cada bloque puede mostrarse según:

- Enlace personal o enlace general.
- Invitados con o sin niños.
- Cantidad mínima y máxima de pases.
- Acceso a ceremonia o recepción.
- Uno o varios grupos privados, como Familia, VIP o Proveedores.
- Estado pendiente, confirmado o no asistirá.

Las reglas se resuelven en el servidor antes de entregar la invitación pública.

## Vista previa por invitado

- La pestaña Invitados activa una simulación con un registro concreto.
- El lienzo adopta nombre, pases, mesa, grupo, reglas de niños y acceso al evento.
- La confirmación representa el estado RSVP real del invitado.
- Los cambios del registro activo se reflejan sin salir de la vista previa.

## Pase personal y QR

- Nuevo bloque **Pase personal** disponible en la paleta.
- Nueva sección lista **Acceso personal**, con saludo, pases, mesa y QR.
- El bloque utiliza el token, código, mesa y cupos reales del invitado confirmado.
- En el editor se genera una muestra segura; en público, el QR real solo aparece después de confirmar.

## Gestión de invitados

- Teléfono de WhatsApp normalizado.
- Grupo privado y acceso al evento por invitado.
- Búsqueda por nombre, mesa, teléfono o grupo.
- Vista previa exacta del mensaje de WhatsApp antes de abrirlo.
- Variables de mensaje: `{nombre}`, `{link}`, `{pases}`, `{mesa}` y `{codigo}`.
- Exportación CSV enriquecida con teléfono, grupo y acceso.

## Importación CSV

- Detección de coma, punto y coma o tabulación.
- Mapeo visual de columnas antes de importar.
- Reconocimiento automático de nombre, teléfono, pases, mesa, grupo, niños y acceso.
- Normalización de teléfonos y límites seguros de pases.
- Detección de duplicados contra la lista existente y dentro del propio archivo.
- Resumen de registros válidos, duplicados e inválidos antes de confirmar.

## Compatibilidad

Los datos adicionales de segmentación viven dentro de `builder_config.guestMeta`, por lo que no requieren una migración SQL adicional. Los registros operativos y el QR continúan usando las tablas actuales de invitados y accesos.

## Validación

- ESLint sin advertencias ni errores.
- TypeScript sin errores.
- Compilación de producción y revisión visual incluidas en el cierre de la fase.
