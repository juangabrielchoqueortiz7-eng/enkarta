# Padrón compartido en el constructor

El panel de invitados del constructor usa el mismo padrón SQL paginado que el
portal del organizador. Antes descargaba la lista completa con PostgREST y podía
omitir los grupos posteriores al límite de 1.000 filas. No requiere una migración
nueva: utiliza la 018 ya aplicada.

## Comportamiento

- Consulta 25 grupos por página. La búsqueda, los filtros, las métricas, las mesas
  y los candidatos de WhatsApp corresponden al evento completo.
- Comparte el editor con guardado explícito, control de revisión, confirmación de
  cierre con cambios y protección de grupos con ingresos registrados.
- Comparte la importación con comprobación de duplicados fuera de página y la cola
  recuperable de WhatsApp. Mantiene el máximo de 200 contactos por revisión y
  comunica cuántos quedan fuera. No afirma entrega ni lectura.
- Conserva las plantillas de mensajes del borrador. Los registros de invitados se
  guardan directamente; publicar el diseño sigue siendo una acción separada.
- Conserva la vista personal en el lienzo, incluso si el invitado seleccionado
  deja de aparecer en la página o los filtros actuales. Un 403 borra el padrón y
  la vista personal; un error transitorio bloquea acciones y conserva la última
  lectura. No modifica los componentes que dibujan las invitaciones.
- Exporta todos los resultados filtrados en lotes SQL de 250. El CSV conserva BOM,
  teléfonos y enlaces personales, escapa fórmulas y omite tokens QR. Cambios en el
  padrón, los servicios o el slug durante la lectura cancelan la exportación con
  409, en lugar de entregar un archivo mezclado.

## Permisos y datos

`/api/guests/roster` exige `canManageInvitation(id, 'guestManagement')` antes de
leer datos. Premium puede incluir invitados personales sin incluir `hostPanel`:
esta ruta no concede dicho servicio ni acceso a recepción QR. Mesas y campos QR
respetan los servicios contratados. El endpoint existente del anfitrión mantiene
sus permisos propios.

GET devuelve el padrón; GET con `format=csv` produce la exportación; POST comprueba
duplicados para un máximo de 200 candidatos. Todos usan respuestas privadas sin
caché. GET con `format=preview&guestId=UUID` consulta exclusivamente ese invitado
en ese evento y devuelve el contrato del lienzo, con token QR solo si el servicio
lo permite. El padrón ordinario nunca incluye ese token. El cliente valida la
identidad y los campos de la vista personal, descarta propiedades arbitrarias y
aborta lecturas anteriores al cambiar de selección o desmontarse.

## Regresiones y reproducción

`npm run verify` comprueba tipos, lint, regresiones y compilación. Los casos nuevos
cubren más de 1.000 grupos, paquetes sin portal, aislamiento entre eventos,
revisor y recepción sin permisos, duplicados remotos, CSV consistente, validación
de parámetros y vista personal sin filtraciones en el padrón.

En desarrollo, `/dev/services/builder-roster` ofrece 1.001 grupos ficticios,
conexión lenta, error y permiso rechazado. Utiliza los controles reales con
mutaciones y aperturas de WhatsApp deshabilitadas. La ficha contigua comprueba el
contrato enviado al lienzo; no simula el diseño original. La página y su API
responden 404 en producción.

La prueba HTTP autorizada añade verificaciones de estas rutas al ejercicio
existente de publicación, pagos ficticios, invitados, seguimiento y recepción:

```powershell
node scripts/check-integrity-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --roster-pagination --report tmp/builder-roster/production-http.json
```

`--builder-roster-window` permite una revisión adicional del constructor real en
el navegador mientras existen los registros sintéticos. La comprobación exige
confirmación local y verifica que no haya escrituras, movimientos QR, llamadas
bancarias ni mensajes adicionales. La limpieza se ejecuta también ante fallos y
comprueba la ausencia de los UUID de prueba. Para recuperar una limpieza
interrumpida, usar `--resume-cleanup` con el mismo informe y origen.

Los originales de invitaciones y la biblioteca de recursos permanecen fuera de
este cambio. BCP sigue desactivado; estas pruebas no ejercitan servicios bancarios.
