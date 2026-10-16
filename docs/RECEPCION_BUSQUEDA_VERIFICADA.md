# Búsqueda de recepción vinculada al evento y sesión

El control «¿El invitado no encuentra su QR?» mantiene su búsqueda por nombre o
mesa y su presentación. Buscar o abrir una ficha sigue sin registrar ingresos.
Este refuerzo no añade SQL, dependencias, permisos ni cambios de diseño.

## Verificación del resultado

La respuesta privada incluye `invitationId`. El cliente exige que coincida con el
evento de recepción y valida hasta 20 grupos: UUID únicos, nombre no vacío, mesa
de texto si está presente y cupos enteros entre 1 y 20. Una respuesta incompleta,
de otro evento o con datos inválidos no produce botones de selección utilizables.
El resultado normalizado conserva solo evento, nombre, UUID, mesa autorizada,
cupos y `hasMore`; descarta propiedades ajenas al contrato de recepción.

Los textos de nombre y mesa válidos se conservan sin recorte ni normalización.
El servidor sigue filtrando por evento autorizado y estado confirmado, ocultando
teléfono, mensaje y token QR. La selección posterior vuelve a consultar los pases
actuales mediante el servicio existente; encontrar un resultado no concede ingreso.

## Sesión y cancelación

Las consultas del escáner envían `X-Enkarta-Scanner-Session`, igual que las lecturas
de grupo, movimientos e historial. El servidor compara esa huella opaca con la
cookie firmada del rol seleccionado. Una huella antigua o prestada de otro rol
devuelve 403 sin resultados. La huella no autentica por sí sola ni amplía permisos.

Por compatibilidad con pestañas de la versión anterior, omitir el encabezado sigue
requiriendo la cookie válida y los mismos controles de evento, servicio y vigencia.
El cliente nuevo siempre lo envía. No se cambian credenciales reales de usuarios.

Cambiar evento, rol o sesión remonta la búsqueda y retira sus resultados. Cancelar,
editar el texto o desmontar invalida la consulta. El cliente comprueba la cancelación
antes de consultar, al recibir HTTP y después de leer JSON; una respuesta tardía de
un transporte que ignore AbortSignal tampoco puede reactivar resultados anteriores.
Los errores tardíos no reemplazan la consulta actual. No se persiste la búsqueda.

## Regresiones y verificación

Siete regresiones adicionales prueban contrato y minimización de datos, grupos
duplicados, evento incorrecto, límites, ámbito sin sesión, consulta cancelada antes
de comenzar, cancelación durante transporte y JSON, errores de red, sesiones de
host/puerta/admin y renovación de credencial. Los servicios ejecutan PostgreSQL real
aislado en memoria. La suite completa contiene 314 pruebas.

La prueba HTTP incorpora una comprobación de búsqueda con cookie y huella actuales,
rechazo de huella antigua y de otro rol y cero movimientos añadidos por consultar.
La renovación solo afecta a la credencial del evento ficticio creado por la prueba.
El resto de regresiones comprueba publicación, permisos, RSVP, QR, pagos ficticios,
paginación y CSV. Ejecutar con la autorización de producción correspondiente:

```powershell
node scripts/check-integrity-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --roster-pagination --checkin-history --report tmp/reception-search/production-http.json
```

El informe registra los UUID del ámbito ficticio para permitir limpieza recuperable.
No se necesita una ventana de navegador para estas comprobaciones HTTP.

La aceptación visual de WhatsApp en producción de la entrega anterior quedó completada
manualmente por el usuario en Android / Chrome el 16 de octubre de 2026; ver
[WHATSAPP_ACEPTACION_ANDROID.md](WHATSAPP_ACEPTACION_ANDROID.md). Las pruebas de contrato
y HTTP no sustituyen esa aceptación visual ni acreditan cámara o sonido en un dispositivo
físico. Este cambio conserva el marcado y los estilos de la búsqueda existente.

BCP continúa desactivado; no se llama al banco ni se envían mensajes de WhatsApp.
Las invitaciones, presets, animaciones, música y recursos originales se conservan.
