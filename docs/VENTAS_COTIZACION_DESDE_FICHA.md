# Cotizar desde la ficha de Ventas

Cada contacto del listado o abierto por referencia ofrece **Preparar cotización**. La acción reutiliza el cotizador existente y evita tener que volver a buscar una referencia que ya está visible. También está disponible en fichas con cambios pendientes, conservadas fuera de la página o filtro actual.

## Comportamiento

- La acción se muestra sólo con un contacto válido y un manejador explícito del panel. El contexto de cotización contiene exclusivamente referencia, evento, diseño y paquete guardados; no importa notas, estado, ingresos, revisión ni campos privados.
- Se abre el cotizador y se dirige el foco a la revisión. Si todavía se comprueba su configuración, se muestra primero ese estado de carga y después la revisión. No se enfoca un campo de texto ni se abre intencionadamente el teclado del teléfono.
- Para otra referencia, se solicita revisar y aceptar antes de reemplazar el borrador. **Cancelar y conservar borrador** mantiene los datos anteriores. Para la misma referencia se conservan los datos y ajustes existentes.
- Un contacto sin paquete permite iniciar la revisión, pero exige elegir un paquete antes de usar sus datos.
- El botón no guarda el seguimiento, no consulta de nuevo el contacto, no cambia el filtro o página, no modifica las métricas ni envía mensajes. El editor y el cotizador conservan su posición e identidad en React.
- Si el seguimiento contiene cambios sin guardar, se usan el evento, diseño, paquete y referencia del contacto guardado. La nota, el importe y el estado pendientes permanecen en su editor.

El control se incorpora al encabezado existente de la ficha, apilado en móvil y con tamaño táctil mínimo de 44 px, nombre accesible con referencia y foco visible. No se alteran invitaciones, presets, estilos globales ni recursos originales.

## Alcance de validación

Las regresiones usan los componentes reales con dependencias ficticias. Las pruebas manuales y la aceptación visual en Android continúan aplazadas a petición del usuario. Una comprobación HTTP de producción acredita publicación y contratos; no sustituye interacción de navegador ni prueba física de foco o disposición.

No requiere migración, dependencia ni endpoint nuevos. BCP permanece desactivado y conserva su bloqueo. No se realizan pagos ni envíos de WhatsApp.

## Regresiones incorporadas

`scripts/test-commercial-roster-quote.cjs` añade 14 casos al comando `npm run verify`:

- Botón nativo explícito, nombre accesible por referencia y ausencia de acción sin callback o contexto válido.
- Fichas visibles, activas y fijadas con un solo editor; callbacks del panel real y whitelist de salida.
- Conservación de página 2, filtro, métricas completas, editor pendiente y ficha histórica fuera del período.
- Secuencias repetidas sin recargar el listado; composición estable del cotizador y editores.
- Revisión, cancelación y confirmación del reemplazo; elección explícita de paquete general y continuidad de la misma referencia con ajustes locales.
- Configuración pendiente que solicita foco y desplazamiento a la cabecera, seguida de la revisión al estar lista. Se comprueban llamadas a refs ficticias, no el foco físico del navegador.

Las entradas son ficticias y el transporte global real permanece bloqueado en el arnés. El clic de preparación no realiza PATCH ni escrituras en almacenamiento; la confirmación posterior sí actualiza el borrador local según su contrato existente.

## Verificación local, 19 de octubre de 2026

- `npm run verify`: **887 pruebas correctas**, incluidas **14 nuevas**, lint, TypeScript y build completos. Sin nuevos avisos de lint en los archivos afectados; permanecen los avisos anteriores de imágenes en invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256. Guard de distribución completo: **129/129 originales** disponibles, incluidos los archivos ignorados por Git que requiere el despliegue desde el workspace completo.
- Revisión del cambio con Impeccable en modo operativo, las pautas de React y las [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): control explícito con foco visible, tamaño táctil, disposición apilada y texto largo contenido en la cabecera. Los marcadores de acción y confirmación se comprobaron también en el cliente optimizado.
- No se ejecutaron pruebas manuales ni interacción de navegador. Las comprobaciones automáticas de refs no certifican foco real ni disposición en Android.

## Producción, 19 de octubre de 2026

- Código **`d440d5c9cb1524803980c0722c62b3996afd844a`**, fusionado y enviado a `main`. Despliegue desde el workspace completo: Vercel **`dpl_HDaUsaYwFjmyK1enypit59xTFHYt`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). [Versión inmutable](https://enkarta-g7c7fbbmj-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto: job `verify`, verificación completa y auditoría de dependencias de producción correctos. [Verify application #39363141453](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39363141453). Sólo se consultaron metadatos; no se descargaron logs.
- **9 comprobaciones HTTP y de contrato correctas**: gateway BCP bloqueado en código y proveedor local desactivado; configuración privada denegada a visitantes/cookies inválidas; muestras de desarrollo HTTP 404; acción accesible de cotización por referencia y confirmación explícita presentes en los chunks publicados; consulta, historial, listado y guardado anónimos HTTP 401; autenticación normal con cookie segura; whitelist privada y huella vinculada a sesión; entradas ficticias inválidas HTTP 400 antes del acceso a datos; petición anónima separada aún denegada.
- **129/129 originales publicados** idénticos en bytes y SHA-256; **6/6 rutas** públicas y de acceso correctas. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios o movimientos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar. Esta entrega no dejó nuevos datos ficticios persistentes que limpiar.
- La interacción de preparar/revisar/cancelar se comprobó automáticamente con componentes y dependencias ficticias en local. La verificación remota acredita publicación y permisos por HTTP. **La aceptación manual sigue aplazada** y no se presenta como probada la disposición ni el foco físico en Android.
- BCP conserva su código y configuración. No se afirma haber leído la variable remota del proveedor. Los diseños y recursos originales permanecen intactos.

Evidencia privada en `tmp/sales-roster-quote/`: `verify.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`, sin credenciales, cookies ni datos de contactos.
