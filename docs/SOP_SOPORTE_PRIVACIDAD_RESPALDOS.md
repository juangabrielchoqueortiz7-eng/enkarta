# SOP — Soporte, privacidad, respaldos e incidentes

## Soporte

- Registrar por invitación el canal, horario, plazo de primera respuesta, vigencia y
  responsable de escalamiento.
- Clasificar como crítico un bloqueo general de RSVP, acceso indebido, pérdida de
  respuestas o imposibilidad de ingreso. Conservar hora, URL, dispositivo y evidencia.
- No declarar resuelto un incidente hasta repetir el recorrido que falló.

## Privacidad y retención

- Explicar al cliente qué datos se recopilan, quién puede verlos, para qué se usan y
  durante cuánto tiempo se conservarán.
- Compartir planillas y paneles solo con quienes operan el evento.
- No incluir mensajes, teléfonos, QR ni evidencias internas en analítica o informes
  públicos.
- Registrar quién autoriza y ejecuta una eliminación; no borrar datos por una petición
  informal que no identifica invitación y alcance.

## Respaldo y restauración

1. Crear un respaldo antes de migraciones, cambios masivos y promoción a producción.
2. Identificar versión, fecha, invitación y responsable.
3. Restaurar una copia en un entorno seguro y comprobar que el JSON abre, los bloques
   se renderizan y el contrato del paquete continúa intacto.
4. Guardar en Calidad las fechas de respaldo y prueba de restauración, más la versión
   elegida para rollback.

Un archivo existente no es un respaldo verificado hasta demostrar que puede
restaurarse.

## Liberación e incidente

- Promover vista previa → aprobada → producción; nunca saltar una fase para ocultar
  un gate incompleto.
- Tras el despliegue, comprobar URL pública, RSVP, accesos contratados y errores 4xx/5xx.
- Ante un incidente grave, detener nuevas publicaciones, preservar evidencia, revocar
  accesos comprometidos y restaurar la versión registrada si reduce el impacto.
- Documentar causa, alcance, corrección, verificación y medida preventiva.
