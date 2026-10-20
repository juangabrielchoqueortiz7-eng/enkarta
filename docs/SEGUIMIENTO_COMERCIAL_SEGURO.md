# Guardado seguro del seguimiento comercial

## Problema y resultado

El PATCH anterior actualizaba el contacto y luego insertaba el historial en otra operación. No comprobaba el resultado del historial ni detectaba cambios de otro dispositivo. Además, el editor mantenía valores antiguos después de actualizar sus props.

La nueva operación `enkarta_update_commercial_lead` guarda contacto, revisión, historial y recibo de solicitud dentro de la misma transacción. El servidor solo acepta la revisión que el administrador consultó. Cada intención lleva un UUID estable: volver a comprobar una respuesta perdida recupera su recibo original sin aplicar otro cambio.

## Migración 019

Ejecutar **completo** `migrations/019_commercial_lead_updates.sql` en el SQL Editor del proyecto Supabase existente, después de 012. La última consulta debe devolver `commercial_lead_updates_ready = true`.

- Añade `commercial_leads.revision` y la tabla privada de recibos, con FK y limpieza en cascada al eliminar un contacto.
- El trigger incrementa la revisión cuando cambian estado, ingreso o nota; detecta también escrituras del código anterior durante la transición. No permite que un UPDATE retroceda la revisión.
- Es reaplicable: no borra ni reescribe contactos, atribución, historial anterior, invitaciones ni pagos.
- RPC, snapshots y recibos están limitados a `service_role`; no se concede acceso a `anon`, `authenticated` ni `PUBLIC`.
- El trigger no convierte retroactivamente el PATCH anterior en transaccional. La atomicidad completa del recorrido HTTP comienza con el nuevo despliegue.

## Contrato del guardado

PATCH privado `/api/admin/commercial`: `id`, `requestId`, `expectedRevision`, `status`, `revenueBs`, `notes`. Valida tipos, estado permitido, UUID, revisión entera e importe entre 0 y 1.000.000 Bs con hasta dos decimales; no convierte booleanos/arrays en importes ni recorta notas silenciosamente. El ingreso continúa siendo un registro manual; no ejecuta cobros.

| Resultado | Comportamiento |
| --- | --- |
| `saved` | Cambió seguimiento; una revisión y una fila de historial. |
| `unchanged` | Datos idénticos; sin nueva revisión ni historial. Guarda el recibo del UUID. |
| `replayed` | Misma solicitud y payload: devuelve la foto original del guardado. |
| `conflict` | Revisión diferente: HTTP 409 con datos actuales permitidos; sin escritura. |
| `request_conflict` | UUID reutilizado con otros datos: HTTP 409, sin filtrar otra ficha ni escribir. |
| `not_found` | Contacto ausente: HTTP 404. |
| Migración pendiente | HTTP 503; no vuelve al método anterior. |
| Fallo/respuesta incompleta | No confirma éxito. El cliente conserva el mismo UUID para comprobar. |

El recibo y las respuestas omiten `session_hash`, claves y campos futuros no autorizados. Todas las respuestas son `no-store`. El servidor y el cliente validan identidad, revisión y coincidencia del recibo con los cambios enviados antes de confirmar.

## Interfaz

- Controles de 16 px, objetivos táctiles de unos 44 px, etiquetas y foco visible.
- Mientras guarda o comprueba un resultado incierto, bloquea los campos. «Comprobar guardado» reutiliza exactamente UUID, revisión y payload; no crea una intención diferente.
- El [límite de espera del cliente](VENTAS_LIMITE_DE_ESPERA.md) incluye transporte y lectura JSON. Si cualquiera no termina, la operación pasa a incierta con el mismo UUID; una respuesta tardía no sustituye ese resultado.
- Un conflicto conserva los campos locales y muestra estado, ingreso y nota actuales. «Revisar mis cambios» incorpora los campos remotos que no se habían editado y exige volver a pulsar «Guardar cambios».
- Descartar cambios requiere una confirmación explícita. No permite descartar una operación incierta como si nunca se hubiera enviado.
- Una actualización del panel no retrocede la revisión. Conserva contactos con ediciones pendientes aunque dejen de aparecer en la consulta acotada.
- La revisión inicial conservaba los editores montados al filtrar. Con la paginación 020, los editores pendientes permanecen visibles y señalados aunque estén fuera de la página o estado actual; se retiran las filas limpias de páginas anteriores. Ventas permanece montado al cambiar de sección dentro de la misma sesión.
- Las respuestas de cargas anteriores no sustituyen una carga nueva. Se informa si falla una actualización y quedan cifras de la carga anterior.
- Se solicita la advertencia nativa al abandonar/recargar con cambios pendientes; el navegador decide si la muestra. Los borradores de seguimiento y UUID pendientes viven en memoria, no en almacenamiento persistente. Una recarga completa vuelve a consultar datos canónicos; cerrar sesión retira la memoria privada.

La búsqueda de referencias continúa siendo de solo lectura. No se añade otro editor del mismo contacto. El bloque posterior de paginación y agregación completa, dependiente de 020, se documenta en [VENTAS_PAGINACION_Y_METRICAS.md](VENTAS_PAGINACION_Y_METRICAS.md); su estado de despliegue figura allí.

## Verificación y despliegue

1. Completar lint, tipos, pruebas de contrato/render, servicios, PostgreSQL del nuevo RPC, reducer y build.
2. Validar localmente `/dev/services/commercial-update` con dos pantallas ficticias, conflictos, errores y recuperación. Su transporte solo usa memoria; no hace llamadas reales ni pagos. Esa ruta responde 404 en producción.
3. Aplicar 019 manualmente y comprobar el resultado final. No desplegar el nuevo código antes de esa comprobación: el panel requiere la columna y el RPC nuevos.
4. Desplegar desde el workspace completo para conservar los recursos de distribución originales que no están en Git. Recargar Admin para usar el cliente nuevo; los clientes antiguos sin revisión no pueden escribir mediante el contrato nuevo.
5. Ejecutar `scripts/check-commercial-updates-http.cjs --exercise --production --expect-project eodedockxqvynedwhpsp --report tmp/commercial-update/production-http.json` después del despliegue. Crea un único contacto ficticio y persiste su alcance antes del INSERT. Prueba dos PATCH concurrentes, replay, reutilización inválida y respuesta descartada. La limpieza exige ID + hash + placement + campaña y verifica ausencia de contacto, historial, recibos y eventos ficticios. Admite `--resume-cleanup` con el mismo informe.
6. Verificar hashes originales publicados y rutas públicas. No marcar la concurrencia entre transacciones independientes como probada hasta completar el paso HTTP remoto.

PGlite usa una sola conexión: sus pruebas reales de SQL verifican revisiones, serialización de intenciones, recibos y rollback, pero no certifican por sí solas bloqueos entre sesiones PostgreSQL independientes.

BCP permanece desactivado. Los recursos y diseños originales quedan fuera de este cambio.

## Estado de entrega, 19 de octubre de 2026

- Código `f026c34` fusionado a `main` y desplegado después de que el usuario confirmó 019 y se verificaron remotamente la columna y el RPC con un ID inexistente, sin crear registros.
- `npm run verify` terminó correctamente: 412 pruebas (196 constructor/contratos/render, 137 servicios, 19 PostgreSQL comercial, 24 contrato/reducer comercial, 31 integridad y 5 distribución), lint, TypeScript y build. Persisten solo las advertencias existentes de imágenes en invitaciones originales.
- Navegador local: 18 comprobaciones correctas con dos editores del mismo contacto ficticio. Incluyen conflicto, revisión de campos, descarte explícito, pérdida de respuesta, desconexión, respuesta incompleta, SQL pendiente, bloqueo mientras guarda e importe inválido sin solicitud. Capturas y medidas a 390×844 y 1440×1000 sin desbordamiento, controles de 16 px / aproximadamente 44 px. No sustituye aceptación física en Android ni prueba del portal completo de navegación; los cambios de ciclo de vida del panel también se revisaron en código.
- Se retiraron los datos QA de memoria, se cerró la pestaña local y se restauró el tamaño del navegador. La aceptación posterior de producción usó contactos ficticios y terminó con limpieza verificada.
- 597/597 archivos protegidos idénticos por SHA-256. Sin modificaciones en BCP, diseños, presets o recursos originales.
- Evidencia privada: `tmp/commercial-update/verify.log`, `visual.json`, `protected-local.json`, `mobile.jpg` y `desktop.jpg`.
- **SQL 019 confirmado y despliegue terminado:** Vercel `dpl_6mZGNUp6z1ELY6MfRBtikmUnPCWY`, Ready y alias `https://enkarta.vercel.app`. URL inmutable: `https://enkarta-3luownxf5-juangabrielchoqueortiz7-engs-projects.vercel.app`.
- CI del código desplegado finalizó correctamente, incluida verificación de la aplicación y auditoría de dependencias: `https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39287611018`.
- Producción: **7 comprobaciones de guardado** correctas con un contacto ficticio. Dos solicitudes HTTP paralelas sobre revisión 0 produjeron exactamente un guardado y un conflicto, una fila de historial y un recibo. El replay devolvió la misma foto y fecha; reutilizar el UUID con otros datos se rechazó. Descartar el cuerpo de una respuesta y repetir la solicitud recuperó la segunda operación sin duplicados. No se simuló una caída real de red ni se inspeccionaron las sesiones internas del pool PostgreSQL.
- Regresión de búsqueda histórica: **6 comprobaciones** correctas con otro contacto ficticio antiguo, incluido acceso privado y diseño público conservado. Los dos ensayos finalizaron por separado y verificaron que no quedaran sus contactos, historial, eventos ni recibos asociados. Se retiraron las cookies temporales de ambos clientes de prueba. Cero usuarios creados, mensajes enviados y llamadas bancarias.
- Distribución: 129/129 recursos originales publicados mantienen tamaño y SHA-256; seis rutas públicas/de acceso respondieron como se esperaba. Revisión local final: 597/597 protegidos idénticos.
- Evidencia adicional privada: `production-schema.json`, `production-http.json`, `production-lookup.json`, `production-public.json`, `protected-local-final.json`, `deployment-inspect.log`, `ci.json` y `RESULTADO.json`, dentro de `tmp/commercial-update/`. Sin credenciales ni cookies en los informes.
