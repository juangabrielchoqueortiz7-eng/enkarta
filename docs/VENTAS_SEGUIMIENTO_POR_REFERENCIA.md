# Seguimiento comercial desde la búsqueda por referencia

## Problema y comportamiento

Ventas podía encontrar un contacto anterior a los últimos 180 días mediante su referencia exacta, pero el resultado era de solo lectura. El editor dependía de las páginas del período actual; no había una acción para actualizar ese contacto antiguo.

El resultado de la búsqueda incorpora **Abrir seguimiento**. Abre y fija la ficha en la superficie habitual de edición, con estado, importe, nota e historial. Si el contacto ya está en la página, se utiliza su mismo editor. Encontrar o abrir una ficha no modifica datos ni registra conversaciones, ventas o cobros.

La ficha permanece visible al actualizar el embudo, paginar o cambiar el filtro. Una selección nueva retira una selección anterior limpia que esté fuera de la página; conserva los demás editores con cambios, guardados inciertos o conflictos. **Dejar de fijar ficha** queda desactivado mientras existan cambios pendientes en esa ficha. Cuando se retira una ficha limpia, el foco vuelve al encabezado del listado; si pertenece a la página actual, continúa en ella como una fila normal.

El listado y el editor conservan su posición en el árbol de React durante la carga o un error del embudo. Por ello, una búsqueda exacta puede abrir un seguimiento aunque todavía no se hayan cargado las métricas. No se muestran ceros ni recuentos de páginas ficticios mientras falta esa respuesta.

Al abrir se solicita foco y desplazamiento a la ficha, sin animación de scroll. El resultado consultado se actualiza después de un guardado confirmado, utilizando la revisión más reciente conocida. Las confirmaciones antiguas no retroceden el editor ni el snapshot. Limpiar o cambiar la búsqueda no resucita resultados anteriores ni cierra un editor pendiente.

## Lógica y límites

- La búsqueda exacta y el guardado reutilizan los permisos de administrador, las rutas existentes y la transacción de la migración 019. No hay migración, dependencia, permiso ni endpoint nuevos.
- Las métricas y páginas mantienen su cohorte de **altas de los últimos 180 días**. Actualizar hoy una ficha de 2001 no incorpora su venta ni su ingreso a ese período. La interfaz explica este límite cuando la ficha está fijada.
- Una consulta antigua no reemplaza una revisión superior. Los datos que entran mediante la búsqueda se validan y limitan a los campos públicos del contrato comercial.
- Abrir otra referencia y navegar conserva los editores activos durante la sesión de la pantalla. La selección y los borradores sin enviar permanecen en memoria. La ampliación posterior [recupera operaciones por comprobar](VENTAS_RECUPERACION_DE_OPERACIONES.md) después de recargar, sin restaurar automáticamente las fichas ni reenviar guardados.
- El importe sigue siendo un registro manual de ingresos verificados; no procesa cobros. BCP continúa bloqueado y no se cambia su configuración.
- Invitaciones, presets, estilos globales y recursos originales quedan fuera del cambio.

## Regresiones automáticas

Se añaden **24 casos**: diez de selección y mezcla de páginas, trece de render/composición/estado y uno de integración HTTP con PostgreSQL local. Cubren contactos históricos, selección limpia y pendiente, editor único, revisiones, eliminación de campos inesperados, snapshots y búsqueda disponible durante fallos.

La integración local crea una ficha ficticia de 2001, la busca, prepara un ingreso `930,50`, guarda y repite exactamente la operación. Verifica una sola entrada de historial y un solo recibo, consulta la revisión actual e historial y comprueba que las métricas de 180 días siguen vacías pese a actualizar hoy la ficha.

El caso de confirmación tardía ejecuta los callbacks del dashboard con un pequeño runner de estado en memoria, sin efectos ni navegador. La composición comprueba tipos, padres y claves estables; no sustituye una prueba del reconciliador con DOM ni certifica foco, teclado o disposición física en Android.

La muestra de desarrollo `/dev/services/commercial-dashboard` añade la referencia ficticia `EK-ABCDEF99`, anterior al período y disponible incluso ante un fallo simulado del embudo. Su guardado usa únicamente memoria; **Limpiar QA** restablece los datos ficticios y retira los recibos de esa sesión. La muestra permanece bloqueada en producción. Se deja preparada para una aceptación manual futura, sin ejecutarla en este bloque.

Evidencia privada de verificación y despliegue: `tmp/sales-reference-followup/`. Las pruebas manuales permanecen aplazadas por petición del usuario.

## Verificación local

- `npm run verify`: **579 pruebas correctas**, lint, TypeScript y build. Desglose: 200 constructor/contratos, 155 servicios, 19 PostgreSQL del guardado, 55 editor/contrato/render, 14 PostgreSQL del dashboard, 26 cliente del dashboard, 17 historial, 11 navegación, 21 recuperación/render/estado, 15 dominio del cotizador, 10 render del cotizador, 31 integridad y 5 distribución.
- Revisión independiente sin bloqueantes. Permanecen los avisos anteriores de imágenes en las invitaciones originales; no se modifican para satisfacer este cambio del portal.
- **597/597 archivos protegidos** idénticos por SHA-256 y **129 recursos originales** completos para distribución. Sin migración ni modificación de BCP.

## Producción, 19 de octubre de 2026

- Código **`a62b9e8`**, fusionado a `main`. Vercel **`dpl_3UTohShkPmFWCUJSrnb663FnuFW3`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-lx8yk6tsd](https://enkarta-lx8yk6tsd-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto, con `npm run verify` y auditoría de dependencias de producción correctos. [Verify application #39348527766](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39348527766). El conteo de 579 procede del informe local; no se descargaron los logs de CI.
- **9 comprobaciones de contrato y HTTP correctas**: bloqueo BCP local; configuración denegada sin caché a visitantes/cookies inválidas; ambas muestras comerciales de desarrollo HTTP 404; acciones nuevas presentes en el código publicado; búsqueda, historial, listado y guardado anónimos HTTP 401; autenticación normal con cookie segura; configuración privada acotada y borrador ligado a la sesión; entradas ficticias malformadas HTTP 400 antes de acceder a la base; petición anónima separada todavía denegada.
- **129/129 recursos originales publicados** conservan tamaño y SHA-256; **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios, movimientos o recibos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar; esta entrega no dejó nuevos datos ficticios en producción que limpiar.
- La integración positiva con la ficha histórica, guardado, repetición e historial se verificó con PostgreSQL local. La comprobación remota verifica publicación y permisos, sin presentarla como una interacción real de navegador. Las pruebas manuales permanecen aplazadas.
- BCP conserva su código y configuración sin cambios. Se comprobó el bloqueo en el código y entorno local; la variable remota del proveedor no está expuesta por la configuración de Ventas y no se afirma haberla observado. Diseños, presets y recursos originales permanecen intactos.

Evidencia privada: `verify.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json` dentro de `tmp/sales-reference-followup/`, sin contraseñas, claves, cookies ni fichas de clientes.
