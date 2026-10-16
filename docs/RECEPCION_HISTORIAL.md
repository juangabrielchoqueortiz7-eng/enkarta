# Historial privado de recepción por grupo

En el escáner de anfitrión, administrador o puerta, consulta un acceso y abre
**Historial de ingresos y salidas**. Encontrar el grupo o consultar su historial
no registra movimientos. La ocupación actual sigue en la cabecera del grupo.

El historial muestra cada ingreso y salida persistidos, fecha y hora del dispositivo,
nombre del pase y rol del operador. El registro existente identifica roles, no personas
del equipo: no se atribuye un movimiento a una identidad que la base no conserva.
Los nombres corresponden a los pases actuales. Si el pase ya no está disponible,
aparece «Pase anterior»; un operador heredado desconocido se indica como tal.

## Carga y privacidad

- Solo se consulta al abrir o pulsar un control. No se añade otro sondeo periódico.
- Páginas de hasta 20 movimientos, ordenadas por fecha e ID descendentes. El cursor
  conserva los microsegundos de PostgreSQL y resuelve empates por UUID. Insertar un
  movimiento nuevo no desplaza las páginas anteriores; «Consultar movimientos
  recientes» vuelve al inicio.
- Si cambia la revisión de un pase mientras el historial está abierto, aparece un
  aviso para actualizarlo. La última consulta tiene su propia fecha; un error de red
  no se presenta como ausencia de movimientos.
- Una lectura nueva cancela la anterior. El cierre, cambio de grupo, evento o sesión
  invalida respuestas tardías. Los datos no se guardan en localStorage/sessionStorage.
- Un 403 retira la consulta anterior. No se devuelve información de otro evento,
  mensajes, teléfonos, tokens QR, IDs de reintento ni el identificador interno del operador.
- La respuesta lleva `Cache-Control: private, no-store`. No hay caché global de invitados.

## Servidor

`GET /api/checkin/history?scope=door|host&guestId=<UUID>&cursor=<opcional>` usa las
sesiones y permisos existentes del escáner. El ámbito explícito de puerta requiere
esa sesión, incluso si hay una cookie de administrador. Se comprueba la huella de
sesión cuando se proporciona, el evento propietario y el servicio QR; el RPC
`enkarta_checkin_group` conserva las validaciones de disponibilidad y confirmación.

La consulta a `access_log` filtra por el grupo autorizado y solicita 21 filas para
devolver 20 y determinar si hay otra página. Se reutiliza el índice por `guest_id`.
No hay migración nueva, cambios de CSP, dependencias o modificaciones bancarias.

## Regresiones reproducibles

`npm run verify`: lint, tipos, 291 pruebas y build de producción. Los avisos previos
de imágenes de las invitaciones originales se conservan; no se reemplazan recursos.

Las diez regresiones nuevas prueban contrato, microsegundos, fechas inválidas,
inyección de filtros, cursores, orden, paginación con empates e inserciones nuevas,
entradas/salidas repetidas, reintentos idempotentes, aislamiento por evento, permisos,
sesión incorrecta, QR desactivado, cierre del evento, fallos de base y datos heredados.
Las pruebas de servicios ejecutan SQL real en PostgreSQL WASM aislado.

Verificación HTTP con fixtures y limpieza ya incorporada:

```powershell
node scripts/check-integrity-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --roster-pagination --checkin-history --history-browser-window --report tmp/scanner-history/production-http.json
```

La ventana de navegador es opcional y está destinada a esta aceptación supervisada;
si expira, el script limpia sus propios fixtures. No publicar los archivos temporales
de credenciales. El informe conserva solo el ámbito ficticio y los resultados.

La prueba visual local de desarrollo cubre vacío, 20/20/3 movimientos, nombres largos,
teclado, error de red con última lectura y 403 sin datos anteriores, a 1280 y 390 px.
Los endpoints de ejemplo siguen respondiendo 404 en producción. La emulación no
certifica una nueva prueba física en Android o iOS.

BCP continúa desactivado. Se mantienen los diseños y bytes originales de invitaciones.
