# Ventas: paginación de contactos y métricas completas

## Problema y alcance

El embudo anterior calculaba las métricas a partir de filas descargadas con límites. Si había más de 1.000 contactos o más eventos que los recuperados, las cifras podían quedar incompletas. El listado tampoco permitía recorrer todos los contactos del período.

La migración 020 agrega las cifras en PostgreSQL y devuelve una página de 25 contactos. Una sola sentencia calcula resumen, estados, desgloses, total filtrado y página sobre la misma instantánea. El código nuevo depende de esta migración; no se debe desplegar antes de comprobarla.

El período continúa siendo de **180 días**, medidos como 4.320 horas UTC. «Completo» significa todos los contactos y eventos de ese período, sin el límite de filas de PostgREST. No convierte el panel en un informe de toda la historia. La búsqueda exacta por referencia conserva su alcance histórico independiente.

## Migración 020

Ejecutar completo `migrations/020_commercial_dashboard_pagination.sql` en el SQL Editor de Supabase, después de 019. La consulta final debe mostrar **`commercial_dashboard_pagination_ready = true`**.

- Crea dos índices para el orden de alta y el filtro por estado.
- Crea `enkarta_commercial_dashboard`, función de lectura con permisos de invocador. Solo `service_role` puede ejecutarla; `PUBLIC`, `anon` y `authenticated` no reciben acceso.
- Reutiliza el snapshot de campos permitidos de 019. El agregado general no materializa notas ni hashes de sesión de todos los contactos.
- No cambia contactos, revisiones, historial, pagos ni invitaciones. Es reaplicable y recarga el esquema de PostgREST.
- El tamaño es fijo: 25 filas. Consulta 26 candidatos para comprobar si hay una página siguiente.

El GET autenticado `/api/admin/commercial` ejecuta este RPC. Si falta, responde HTTP 503 `MIGRATION_REQUIRED`; no vuelve al cálculo anterior con cifras limitadas. Todas las respuestas, incluidos errores, son `Cache-Control: no-store`.

## Métricas y significado

- Visitas: sesiones distintas con eventos de landing, diseño o proceso dentro del período. Las vistas por tipo también son sesiones distintas, no suma de eventos repetidos.
- Intentos: todos los contactos comerciales del período. Registrar la solicitud del enlace de WhatsApp no demuestra que la aplicación se abrió, que se envió un mensaje ni su entrega o lectura.
- Conversaciones: estados distintos de `whatsapp_open`, incluido `lost`, conforme a la definición existente.
- Reservas: estados `reserved` y `won`; ventas: `won`.
- Ingresos registrados: suma decimal de importes de contactos `won`. Son registros del equipo, no cobros procesados.
- Tasas: intentos/visitas, conversaciones/intentos y ventas/conversaciones, multiplicadas por 100 y redondeadas. Denominadores cero devuelven cero.
- Cada desglose muestra las ocho categorías con más intentos, calculadas sobre todos los registros del período. Los empates tienen orden estable por etiqueta. Los identificadores internos de diseño y sus nombres públicos se agrupan juntos, por ejemplo `azure` y `Lunaria`.

El filtro por estado cambia solo el listado y su total. Las tarjetas, estados y desgloses siguen representando todo el período.

## Paginación y edición

- Orden estable por `created_at DESC, id DESC`, conservando los seis decimales de PostgreSQL. Editar una nota no mueve el contacto a la primera página.
- Cursor opaco con versión, fecha de corte, última tupla y filtro. No contiene notas, hashes privados ni credenciales. No es una credencial: el servidor autentica cada consulta y valida el cursor.
- «Anterior» conserva el mismo corte que «Siguiente», incluida la vuelta a la primera página. «Actualizar» o cambiar de estado inicia un recorrido nuevo.
- El corte fija las altas y eventos incluidos. **No congela históricamente los estados**: cambios concurrentes de estado o eliminaciones pueden cambiar los resultados y totales del filtro en consultas posteriores. El texto del panel lo indica.
- Se muestran 25 contactos por página y el total del estado. Los editores limpios de páginas anteriores se retiran de memoria. Los que tienen cambios, conflictos o guardados inciertos permanecen montados y señalados fuera de la página actual.
- Una revisión nueva guardada no se sustituye por una respuesta anterior. Una página incompleta, duplicada, desordenada, de otro corte o de otro cursor se rechaza antes de sustituir la lista y sus métricas.
- Si una carga falla, conserva los datos anteriores, identifica que están desactualizados y permite reintentar. Las solicitudes anteriores se cancelan y sus respuestas tardías no sustituyen la carga vigente.
- No se introduce persistencia de notas o datos privados en almacenamiento del navegador. El comportamiento de revisión, recibos e historial sigue documentado en `SEGUIMIENTO_COMERCIAL_SEGURO.md`.

## Pruebas locales

La batería suma **450 pruebas**:

| Grupo | Casos |
| --- | ---: |
| Constructor, contratos y render | 196 |
| Servicios y rutas | 145 |
| PostgreSQL de actualizaciones comerciales | 19 |
| Contrato y reducer del editor | 24 |
| PostgreSQL del dashboard | 14 |
| Contrato del dashboard y cursores | 16 |
| Integridad | 31 |
| Distribución de originales | 5 |

Los nuevos ensayos PostgreSQL recorren 1.255 contactos en 51 páginas y agregan 10.055 eventos. Comprueban conteos completos, sesiones distintas, importes decimales, estados, aliases de diseño, orden de empates, precisión de microsegundos, límites UTC incluso al cambiar la zona horaria, ausencia de escrituras y permisos reales por rol. La migración se aplica dos veces para verificar que puede repetirse.

Los servicios prueban páginas de 25 + 12 filas, estados y métricas globales, guardas de sesión, consultas inválidas, ausencia de 020, fallos y respuestas malformadas. Los contratos del cliente cubren cursores, whitelist de datos, páginas rechazadas, errores sin detalles internos y conservación de editores pendientes o revisiones nuevas.

`/dev/services/commercial-dashboard` monta la interfaz real con 1.255 contactos ficticios en memoria y respuestas normales, lentas, truncadas, sin conexión o sin migración. La ruta responde 404 fuera de desarrollo. No envía mensajes, procesa pagos ni consulta datos reales.

## Aceptación de producción preparada

Después de aplicar 020 y desplegar desde el workspace completo:

```powershell
node scripts/check-commercial-dashboard-http.cjs --exercise --production --expect-project eodedockxqvynedwhpsp --report tmp/commercial-dashboard/production-http.json
```

Usar una ruta de informe nueva. El script persiste el alcance antes del INSERT y crea exactamente 27 contactos y 27 eventos ficticios en el límite inferior del período. Primero comprueba que esa fecha exacta no contiene contactos. Los cursores limitan las filas leídas a ese conjunto; no se consultan fichas de clientes reales.

Comprueba acceso privado, filtros inválidos, ausencia del fixture de desarrollo, variaciones exactas de las métricas, dos páginas de 25 + 2 filas y una edición de nota con un único historial y recibo. No registra ventas, reservas, ingresos ficticios, operaciones bancarias, usuarios ni mensajes.

La limpieza final exige ID, hash, placement y campaña del alcance persistido. Comprueba que no queden contactos, eventos, historial ni recibos asociados. Si el proceso se interrumpe, ejecutar el mismo comando con `--resume-cleanup` y el mismo informe. La limpieza no depende del RPC nuevo. Retira también la cookie temporal del cliente de prueba.

## Estado de entrega, 19 de octubre de 2026

- Pruebas locales: 450 correctas, lint, TypeScript y build final correctos. El primer build encontró un permiso de Windows en `.next`; la repetición con acceso a esa carpeta terminó correctamente. Persisten solo las advertencias existentes de imágenes de las invitaciones originales. Ver evidencias finales en `tmp/commercial-dashboard/`.
- Conservación: 597/597 archivos protegidos idénticos por SHA-256; sin cambios en diseños, presets, recursos ni adaptador BCP.
- El usuario ejecutó 020 y confirmó `commercial_dashboard_pagination_ready = true`. La comprobación remota posterior, sin escrituras, verificó el contrato de lectura, el rechazo de parámetros inválidos y la denegación de acceso anónimo. El `PGRST202` observado antes de aplicar la migración quedó resuelto.
- Código **`fe64e12`**, fusionado a `main` y publicado desde el workspace completo. Vercel **`dpl_96dAFVEvL15xVu64o1YgYxeCCo3C`**, estado Ready, alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-gqsh7gamt](https://enkarta-gqsh7gamt-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI del código desplegado: **completed / success**, incluida verificación de la aplicación y auditoría de dependencias. [Verify application #39308208533](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39308208533).
- Producción: **7 comprobaciones HTTP correctas**, con exactamente 27 contactos y 27 eventos ficticios. Se verificaron acceso privado, parámetros inválidos, fixture de desarrollo inaccesible, métricas completas, páginas de 25 + 2 sin duplicados ni campos privados y una edición de nota que produjo una sola revisión, historial y recibo, sin cambiar el orden de alta.
- Limpieza final verificada: cero contactos, eventos, historial y recibos del alcance ficticio; cookie temporal retirada del cliente de prueba. Cero usuarios creados, mensajes enviados y llamadas bancarias. No se registraron ventas, reservas ni ingresos de prueba.
- Distribución publicada: **129/129 originales** conservan tamaño y SHA-256, y **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- La aceptación visual de este bloque no se pudo iniciar: el navegador local está desactivado en la configuración de Work. El fixture está preparado; las pruebas de contrato y código no se presentan como aceptación visual ni como prueba en Android físico.
- Evidencia privada en `tmp/commercial-dashboard/`: `verify.log`, `lint-final.log`, `build-final.log`, `production-schema.json`, `production-http.json`, `production-public.json`, `protected-local-final.json`, `deployment.log`, `deployment-inspect.log`, `ci.json` y `RESULTADO.json`. Los informes no contienen contraseñas, claves ni cookies.

BCP permanece desactivado. El despliegue incluyó los originales del workspace que no están en Git y verificó sus hashes publicados. La aceptación HTTP no sustituye la revisión visual pendiente.
