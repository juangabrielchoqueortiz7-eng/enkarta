# Recuperación de cambios de Ventas sin enviar

## Comportamiento

El editor conserva los cambios de estado, ingreso y nota mientras el operador escribe, en `sessionStorage` de esa pestaña y sesión autenticada. Al recargar, **Cambios sin enviar** ofrece su recuperación explícita durante 24 horas. No se recuperan ni envían automáticamente.

**Recuperar cambios** consulta el contacto con la búsqueda privada existente. Comprueba identidad, referencia y revisión antes de abrir el editor habitual. Una ficha con cambios activos o una operación pendiente impide reemplazarla. Las operaciones enviadas o preparadas tienen prioridad sobre estos borradores.

Se conserva el texto exacto del importe, incluso `930,` o una entrada aún inválida. Guardar mantiene las validaciones existentes. El panel de recuperación muestra referencia y fecha; no repite las notas ni los ingresos. No guarda conversaciones, credenciales, instrucciones bancarias, atribución, historial ni una copia completa del contacto.

## Conflictos y seguridad del guardado

Cada borrador incluye la revisión y los tres valores operativos originales, además de los valores editados. Si el contacto avanzó, se abre un conflicto. **Revisar mis cambios** conserva solo los campos editados y adopta los demás de la versión actual; requiere revisión y un guardado explícito. Una misma revisión con valores operativos distintos se rechaza por inconsistente.

Al pulsar Guardar, primero se conserva la operación canónica con su UUID en el journal de operaciones. Solo después se retira el borrador exacto y se permite el PATCH. Si se recarga entre ambos pasos, la operación tiene prioridad; antes del reintento solo se retira un borrador cuyo cuerpo canónico coincide exactamente. No se elimina una copia ajena o posterior.

Si retirar el borrador falla después de conservar la operación, no se envía el intento. El editor mantiene esa misma solicitud y permite continuar explícitamente con **Comprobar guardado** cuando se recupere el almacenamiento. La interfaz dice que todavía no se envió. Una respuesta incierta conserva el UUID para comprobarlo sin duplicar el historial.

Un conflicto confirmado vuelve a conservar los cambios como borrador antes de retirar la copia de la operación. Si falla esa conservación, la operación queda como respaldo y se avisa. No se anuncia un guardado ni se pierde silenciosamente su intención.

Hay una excepción deliberada: una operación recuperada no conserva la base original de cada campo. Si termina en conflicto, mantiene su journal y advertencia de valores completos hasta que el operador pulse **Revisar valores recuperados**. Esa decisión conserva primero los valores revisados como borrador contra la versión actual y luego retira la operación por comparación exacta. No se inventa qué campos se habían editado ni se presenta su payload antiguo como un borrador normal sin revisión.

## Alcance del almacenamiento

- Clave independiente `enkarta.commercial-drafts.v1:<huella de sesión>`, con versión y validación estricta de campos, estados, revisiones, referencias, UUID, fechas y tamaños.
- Hasta 50 contactos y 240.000 caracteres por journal. No se trunca ni se expulsa otra copia para aceptar una nueva.
- La escritura y el descarte comparan la entrada completa esperada. Un editor antiguo no sobrescribe ni elimina una copia posterior. Se conservan los borradores de otros contactos y sesiones.
- La caducidad se calcula desde la última escritura del borrador. Leerlo no renueva el plazo. Los vencidos se separan para descarte explícito; no se aplican al contacto ni se borran silenciosamente.
- Los cambios permanecen en memoria si el almacenamiento falla o aún no está disponible. El aviso distingue ese estado del borrador conservado. Una copia existente debe recuperarse o descartarse antes de reemplazarla con otra edición.
- Descartar requiere confirmación. El descarte desde el panel retira únicamente esa copia local; no revierte el servidor. Si la ficha sigue abierta, sus valores permanecen en memoria y una nueva edición puede conservar un borrador nuevo.
- No se promete continuidad al cerrar la pestaña, cambiar de sesión o usar otro dispositivo. Se mantiene la advertencia de salida para cambios o guardados pendientes.

La recuperación usa la huella opaca que ya devuelve la configuración autenticada. No añade endpoints, permisos, migraciones, dependencias ni caché global de datos privados. Las callbacks de una sesión anterior y consultas canceladas no pueden abrir un borrador en la sesión nueva.

## Pruebas y muestra

Las suites de dominio, reducer y hook/editor usan almacenamiento y transporte ficticios. Verifican recuperación explícita sin PATCH, texto incompleto, conflictos selectivos, caducidad, límites, sesión, CAS, fallos de almacenamiento, prioridad y promoción entre journals. Las pruebas existentes de servicios y PostgreSQL siguen verificando publicación, permisos y operaciones idempotentes.

La muestra local `/dev/services/commercial-dashboard` permite editar sin guardar, **Reiniciar carga** y recuperar el borrador contra el mismo servidor ficticio en memoria. **Limpiar QA** retira borradores activos y vencidos, operaciones y cotización del scope ficticio, sin tocar otras sesiones. Una recarga real reinicia ese servidor ficticio; no representa persistencia de Supabase. La muestra sigue bloqueada en producción.

Las pruebas de hooks y estado no certifican el DOM, el foco, la presentación en Android ni el almacenamiento de un navegador físico. Las pruebas manuales permanecen aplazadas por petición del usuario.

BCP conserva su bloqueo. No se modifican invitaciones, presets, estilos globales ni recursos originales. La comprobación remota se limita a publicación, permisos, contratos y recursos públicos; no crea contactos ni pagos de producción. Evidencia privada en `tmp/sales-unsent-drafts/`.

## Verificación local, 19 de octubre de 2026

- `npm run verify`: **756 pruebas correctas**, lint, TypeScript y build completos sobre el commit `735eeff`. Grupos: 200 constructor, 156 servicios, 19 PostgreSQL de guardados, 79 editor/contrato/reducer, 22 journal de operaciones, 35 recuperación de operaciones, 21 journal de borradores, 46 recuperación de borradores/editor/Dashboard/limpieza, 14 PostgreSQL del embudo, 26 cliente del embudo, 17 historial, 11 navegación, 25 recuperación de cargas, 28 cotización, 21 interfaz de cotización, 31 integridad y 5 distribución.
- **79 regresiones nuevas**: 12 del reducer, 21 del journal y 46 del hook, panel, editor, Dashboard y limpieza. Incluyen la recarga entre ambos journals y tras una limpieza fallida de un conflicto revisado, sin sobrescribir una copia distinta ni generar otro UUID.
- Revisión independiente: corregidos los bloqueos al fallar la promoción, la pérdida de la advertencia del payload completo recuperado y la reanudación con un borrador revisado ya existente. Sin bloqueantes conocidos tras esas correcciones.
- Impeccable y las pautas de React se aplicaron dentro del contexto visual existente. Revisión de los controles afectados con las [Web Interface Guidelines de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): etiquetas, foco visible, botones semánticos, avisos de estado, confirmación de descarte, contenedores acotados y conservación de la advertencia de salida. No equivale a aceptación visual o de lector de pantalla en un dispositivo.
- Sin avisos nuevos de lint en los archivos afectados. Permanecen los avisos anteriores sobre imágenes de invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256. Guard de distribución: **129 recursos completos**, sin faltantes ni cambios de bytes. No hay migración ni cambio en BCP.

## Producción, 19 de octubre de 2026

- Código **`735eeffcaefc9e0c146a44515cd3a81f053970e5`**, integrado en `main`. Despliegue desde el workspace completo, con los originales que no forman parte de Git. Vercel **`dpl_4EAZpzEM5URxSQ6wLYMsmnw9igXy`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). [Despliegue inmutable](https://enkarta-9d915zdgd-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto: job `verify`, `npm run verify` y auditoría de dependencias de producción correctos. [Verify application #39356386364](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39356386364). Los conteos detallados proceden del informe local; no se descargaron logs de CI.
- **9 comprobaciones HTTP/contrato correctas**: bloqueo BCP local y del gateway; configuración privada denegada a visitantes y cookies inválidas; muestras de desarrollo HTTP 404; controles de borradores y operaciones presentes en el cliente publicado; consulta, historial, listado y guardado anónimos HTTP 401; autenticación normal mediante cookie segura; configuración privada acotada y huella de almacenamiento vinculada a la sesión; entradas ficticias inválidas HTTP 400 antes del acceso a la base; petición anónima separada todavía denegada.
- **129/129 recursos originales publicados** idénticos en tamaño y SHA-256. **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios, movimientos o recibos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar. Esta entrega no dejó nuevos datos ficticios en producción que limpiar.
- La recuperación de borradores y las transiciones entre journals se verificaron con pruebas automáticas locales; las comprobaciones remotas verifican publicación, permisos y contratos, sin representar interacción de navegador o almacenamiento real de Android. **La aceptación manual sigue aplazada.**
- BCP conserva su código y configuración. Se comprobó el bloqueo en código y entorno local; no se afirma haber leído la variable remota del proveedor. Diseños, presets y recursos originales permanecen intactos.

Evidencia privada: `verify-final.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`, sin credenciales, cookies ni fichas de clientes.
