# Recuperación de cargas en Ventas

## Problemas corregidos

Cuando fallaba «Siguiente», «Anterior» o un cambio de estado, la interfaz mantenía visible la última carga correcta. Sin embargo, «Reintentar página actual» consultaba esa ubicación anterior: perdía el filtro, cursor, corte y posición que realmente habían fallado.

Además, el cotizador no se montaba hasta que respondiera el embudo. Una falla inicial de las métricas lo ocultaba aunque su configuración tuviera una consulta independiente. El buscador aparecía en el error inicial, pero desaparecía al reintentar; ese desmontaje retiraba su referencia, resultado y consulta en curso.

## Comportamiento

- La navegación distingue la página visible, la solicitud en curso y el destino fallido. Los cursores y el recorrido de páginas se copian al iniciar cada solicitud.
- **Reintentar carga solicitada** conserva exactamente estado, cursor, corte, número de página y recorrido de retorno. No hay reintentos de red automáticos por una falla.
- Mientras falla o carga otra página, los datos visibles siguen correspondiendo a la última consulta correcta. El mensaje de error identifica el destino solicitado y avisa que los datos son anteriores. El filtro visible solo cambia cuando la consulta se completa.
- **Actualizar** conserva su función de volver a la primera página del estado visible y tomar un corte nuevo. Si esa actualización falla, el reintento mantiene esa misma intención de actualización.
- El cotizador y el buscador permanecen en la misma posición del árbol de React desde el inicio. La carga, el error y la recuperación del embudo no desmontan sus estados ni borradores. Cada herramienta conserva su propia consulta, errores y requisitos de conexión/autorización.
- Se mantienen los editores de contactos pendientes y la advertencia al abandonar. Los borradores de seguimiento siguen viviendo en memoria; este bloque no añade persistencia de notas, historiales ni operaciones inciertas.
- Cada carga tiene una secuencia. Las respuestas y errores de solicitudes superadas no sustituyen la navegación actual. El límite de 20 segundos aborta la consulta y libera el estado de carga incluso si un transporte personalizado ignora la señal; una respuesta posterior no se acepta.
- No se modifican rutas de servidor, permisos, RPC, métricas, precios, paquetes, proveedor de pagos ni dependencias. BCP conserva el bloqueo por contrato pendiente. Las invitaciones y sus originales quedan fuera del cambio.

## Regresiones y muestra de desarrollo

- **11 casos de navegación**: inicio sin métricas inventadas, éxito, fallo y reintento de siguiente/anterior/filtro, error inicial, copia de cursores, respuestas fuera de orden, solicitudes duplicadas, actualización/cancelación y GET privado exacto con transporte ficticio, sin reintento implícito.
- **8 contratos de interfaz y render**: herramientas presentes en el panel inicial y ante error, identidad/posición/clave de React estables, destino fallido y aviso de datos anteriores, botón de reintento explícito, desaparición del error al iniciar otra consulta, escape de texto, semántica accesible y ausencia de consultas durante el render.
- `/dev/services/commercial-dashboard` añade «Fallar una consulta», «Reiniciar carga» y búsqueda por la referencia ficticia `EK-00000001`. Su transporte utiliza solo los registros sintéticos en memoria. La ruta continúa devolviendo 404 fuera de desarrollo. La muestra está preparada para una aceptación futura; no se presenta como un recorrido manual ejecutado.
- Las regresiones no certifican medidas visuales en Android, estado real del portapapeles ni un timeout observado durante 20 segundos en un navegador. La aceptación manual permanece aplazada por el usuario.

Evidencia privada de esta entrega: `tmp/sales-dashboard-recovery/`. No se crean contactos, pagos, usuarios ni mensajes en producción durante este bloque.

## Verificación local

- **523 pruebas correctas**: 200 constructor/contratos, 153 servicios, 19 PostgreSQL de guardado, 24 contrato/reducer comercial, 14 PostgreSQL del dashboard, 16 contrato del dashboard, 17 historial, 11 navegación, 8 recuperación/render, 15 dominio del cotizador, 10 render del cotizador, 31 integridad y 5 distribución.
- Lint y TypeScript correctos. La primera ejecución de `npm run verify` terminó esas pruebas, pero el sandbox impidió crear una carpeta de `.next` durante el build (`EPERM`). Se repitió únicamente `npm run build` con el permiso de ejecución necesario y terminó correctamente; no se presenta la primera ejecución como exitosa. Persisten las advertencias previas de imágenes en las invitaciones originales.
- Revisión cruzada sin hallazgos bloqueantes. **597/597 archivos protegidos** conservan su SHA-256 y el guard de distribución encuentra los **129 recursos originales** completos. Ninguna prueba requiere un banco, WhatsApp ni datos de producción.
- Desarrollo en `codex/sales-dashboard-recovery`, posteriormente fusionado y desplegado desde `main`, sin nueva migración SQL. La aceptación manual y visual permanece aplazada.

## Producción, 19 de octubre de 2026

- Código **`d6f6edc`**. Vercel **`dpl_8uqK27csarPyxEZ22szLRJxm2eek`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-j4oxzopcv](https://enkarta-j4oxzopcv-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI del código desplegado: **completed / success**, incluidos `npm run verify` y la auditoría de dependencias de producción. [Verify application #39341353006](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39341353006). El conteo de 523 pruebas procede del informe local; se consultó el resultado de los pasos de CI, sin descargar sus logs.
- **129/129 recursos originales publicados** conservan tamaño y SHA-256. **6/6 rutas** públicas/de acceso respondieron como se esperaba. La muestra `/dev/services/commercial-dashboard` responde **404** en producción. Comprobación local final: **597/597 protegidos** idénticos.
- **7 comprobaciones correctas** de lectura y contrato: bloqueo BCP local conservado, denegación HTTP 401 sin caché ni instrucciones para visitantes/cookies inválidas, muestra del cotizador HTTP 404, presencia de los textos nuevos de recuperación en los archivos JavaScript entregados por `/admin`, autenticación normal con cookie segura, lectura privada y acotada de configuración con alcance de borrador ligado a la sesión, y denegación de una petición anónima separada. El bloqueo BCP se comprobó en código y entorno local; no se afirma haber leído el valor remoto del proveedor.
- No se consultaron contactos ni historiales de clientes. Cero registros creados, modificados o eliminados, cero usuarios nuevos, cero llamadas bancarias y cero mensajes. Las instrucciones de pago y la cookie administrativa temporal se mantuvieron en memoria, sin sus valores en los informes; la cookie del cliente de automatización se retiró al terminar.
- La prueba HTTP verifica publicación y permisos. No reproduce una desconexión dentro del navegador ni acredita la conservación del foco, la búsqueda o el borrador en un Android físico; ese recorrido sigue aplazado. No se han cambiado BCP, estilos globales, invitaciones, presets ni originales.

Evidencia privada adicional en `tmp/sales-dashboard-recovery/`: `verify.log`, `build.log`, `deployment.log`, `deployment-inspect.log`, `production-public.json`, `production-readonly.json`, `production-development-route.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`.

## Pendientes separados

El campo de ingresos del seguimiento exigía punto decimal aunque el teclado móvil podía ofrecer coma. Se resolvió en el bloque posterior [Importes decimales en Ventas](VENTAS_IMPORTES_DECIMALES.md), que acepta coma en el editor y conserva el formato canónico del PATCH; no forma parte del cambio de recuperación descrito arriba.
