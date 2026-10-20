# Cargas recuperables del historial y la configuración de Ventas

## Fallo y comportamiento

El historial y el cotizador programaban `abort()` desde sus componentes, pero seguían esperando sus servicios. Si el transporte o `response.json()` ignoraban la señal, la interfaz podía continuar en carga indefinidamente. La configuración también podía aceptar una respuesta válida que llegara después de aquel plazo y volver a publicar su huella de sesión.

Ambos servicios controlan ahora el intento completo con `runSalesRead`: **20.000 ms para el historial** y **12.000 ms para la configuración**. El presupuesto incluye transporte, lectura JSON y validación; no se reinicia al recibir las cabeceras. Al vencer se rechaza la espera propia antes de abortar el controlador hijo, de modo que el error del transporte no sustituya el motivo de salida.

No hay reintentos automáticos. Un error vuelve a habilitar las acciones existentes **Reintentar consulta** o **Reintentar configuración**. Las respuestas y los rechazos tardíos se consumen sin actualizar la interfaz ni reactivar la configuración.

## Historial

- Sigue cerrado inicialmente y solo consulta al abrirlo. Encontrar un contacto no descarga su historial.
- Si una consulta de página falla o vence, conserva la página anterior con el aviso de que corresponde a la consulta previa. El reintento utiliza exactamente el cursor y corte que fallaron.
- Cerrar, desmontar, cambiar contacto, referencia, revisión o transporte cancela el intento anterior. La página, los errores y el estado de carga se vinculan al contexto actual.
- Las callbacks antiguas no pueden abrir, cerrar ni paginar otra ficha. Volver al mismo contacto después de pasar por otro tampoco reactiva aquellas callbacks.
- Los estados de ausencia, sesión terminada, migración requerida o respuesta inválida siguen siendo errores; no se anuncian como historial vacío.

## Configuración y borrador del cotizador

- Una configuración que agotó su plazo no publica la huella de sesión, no recupera el almacenamiento y no activa copias ni edición. Una configuración anterior tampoco se presenta como vigente durante una nueva comprobación.
- Mientras la configuración no está verificada, las instrucciones de pago se retiran de la propuesta generada y las acciones quedan bloqueadas. El contenido editado del borrador permanece en memoria y su copia local no se modifica por el error.
- El reintento es explícito. Si se valida el mismo scope, se conservan los ajustes de la cotización; si se valida otra sesión, se aplica su recuperación habitual.
- Las respuestas antiguas no sustituyen una configuración más reciente ni reactivan una huella retirada. Desmontar aborta la consulta y retira la huella comunicada al resto de Ventas.
- Los manejadores antiguos de edición, descarte, importación y reintento se invalidan al cambiar el contexto de configuración. Un botón de copia antiguo tampoco escribe un texto anterior después de quedar desactivado, cambiar su valor o desmontarse.
- La configuración mantiene su whitelist de salida y valida que la huella tenga exactamente 64 caracteres hexadecimales. No persiste instrucciones de pago ni procesa cobros.

## Cancelación y límites

Una señal ya abortada no inicia tráfico. El helper usa su propio `AbortController`: agotar el plazo de una consulta no aborta el controlador externo ni otras consultas que lo compartan. Se retiran su temporizador y listener externo al resolver, rechazar, cancelar o agotar el plazo.

Después de recibir el transporte y el JSON, los servicios vuelven a comprobar la cancelación. Si un transporte llega cuando ya fue abortado, no se empieza a leer su cuerpo. Un transporte externo que ignore la cancelación puede seguir pendiente internamente; la interfaz ya no depende de que termine y su resultado no se acepta después del cierre.

El tiempo depende del reloj y temporizadores del navegador. Las pruebas con reloj simulado no certifican segundos de reloj físico en una pestaña suspendida o un Android real.

## Pruebas y muestras

Las nuevas regresiones ejercitan el helper, los servicios y los componentes reales con transportes, almacenamiento, portapapeles y relojes ficticios. Cubren límites compartidos entre fases, transportes y cuerpos que ignoran aborto, respuestas/rechazos tardíos, aislamiento del controlador externo, limpieza de recursos, conservación del cursor y del borrador, y callbacks de contextos anteriores.

Las muestras locales `/dev/services/commercial-history` y `/dev/services/sales-quote` incorporan **Transporte sin respuesta** y **Cuerpo sin respuesta**. Permiten esperar el aviso y después reintentar con el modo correcto. No consultan Supabase, no envían mensajes y no realizan pagos; sus rutas siguen bloqueadas en producción. Los datos del historial están en memoria y la limpieza del cotizador conserva el alcance de sus sesiones ficticias.

No se realizó aceptación visual, interacción de navegador o comprobación física en Android. **Las pruebas manuales siguen aplazadas por petición del usuario.** La verificación remota se limita a contratos publicados, autenticación, permisos, validación de entradas inválidas y recursos públicos, sin consultar ni modificar fichas de clientes.

No hay migración, dependencia, endpoint, permiso ni operación bancaria nuevos. BCP conserva su bloqueo y configuración. Invitaciones, presets, estilos globales y recursos originales permanecen intactos. Evidencia privada en `tmp/sales-read-deadline/`.

## Verificación local, 19 de octubre de 2026

- `npm run verify`: **873 pruebas correctas**, lint, TypeScript y build completos sobre el código `1e9dada`. Grupos: 200 constructor, 156 servicios, 19 PostgreSQL de guardados, 79 editor/contrato/reducer, 22 journal de operaciones, 35 recuperación de operaciones, 21 journal de borradores, 46 recuperación de borradores, 33 última referencia, 27 interfaz de búsqueda, 14 PostgreSQL del embudo, 26 cliente del embudo, 17 historial, **33 límites de lectura/servicios**, **24 componentes de historial/cotizador**, 11 navegación, 25 recuperación de cargas, 28 cotización, 21 interfaz de cotización, 31 integridad y 5 distribución.
- **57 regresiones nuevas**. Los servicios cubren deadline común, transporte y JSON bloqueados, cancelación en cada fase, errores y respuestas tardías, motivos de salida, controlador externo intacto, limpieza de recursos y esquema privado. Los componentes comprueban el cursor exacto, la página anterior, cierre/desmontaje, identidad/revisión/transporte, callbacks antiguas, revalidación del mismo scope, preservación del borrador y bloqueo de copia/edición mientras falta configuración.
- La expectativa anterior de una señal ya abortada se corrigió para distinguir cancelación de timeout y comprobar cero solicitudes. La prueba del transporte del historial comprueba una señal hija propagada; no depende de identidad de objeto con la señal del llamador.
- Revisión independiente sin bloqueantes. Se aplicaron el contexto operativo de Impeccable y las pautas de React. Los controles afectados se revisaron con las [Web Interface Guidelines de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): estados y avisos accesibles, foco visible, acciones explícitas y conservación del contexto; no equivale a aceptación visual o de foco en un dispositivo físico.
- Sin nuevos avisos de lint en los archivos afectados. Permanecen los avisos anteriores de imágenes en invitaciones originales.
- **597/597 archivos protegidos** idénticos por SHA-256 y **129 originales completos** en el guard de distribución. No hay migración ni modificación de BCP.

## Producción, 19 de octubre de 2026

- Código **`1e9dada9a168bd890337afef5cc5dcd19eded507`**, fusionado a `main`. Despliegue desde el workspace completo, incluidos los originales que no están en Git. Vercel **`dpl_DfoHzH8YWYVyFUMoz8c8rUkKyPi2`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). [Despliegue inmutable](https://enkarta-7zz0abzrg-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA exacto: job `verify`, `npm run verify` y auditoría de dependencias de producción correctos. [Verify application #39360618125](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39360618125). Los conteos detallados proceden del informe local; no se descargaron logs de CI.
- **9 comprobaciones HTTP y de contrato correctas**: bloqueo BCP local y del gateway; configuración privada denegada a visitantes y cookies inválidas; muestras de historial y cotizador HTTP 404; límites y reintentos presentes en el cliente publicado; consulta, historial, listado y guardado anónimos HTTP 401; autenticación normal con cookie segura; configuración privada acotada y huella vinculada a la sesión; entradas ficticias inválidas HTTP 400 antes del acceso a la base; petición anónima separada todavía denegada.
- **129/129 recursos originales publicados** idénticos en tamaño y SHA-256. **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- No se consultaron fichas ni historiales de clientes ni se crearon, modificaron o eliminaron contactos, pagos, usuarios, movimientos o recibos. Cero mensajes y llamadas bancarias. La cookie temporal se mantuvo en memoria y se retiró al terminar. Esta entrega no dejó nuevos datos ficticios en producción que limpiar.
- Los bloqueos de transporte y JSON, plazos y cancelaciones se comprobaron con dependencias y relojes ficticios en local. La comprobación remota verifica publicación y permisos por HTTP; no simula una red bloqueada de un cliente ni una interacción física de Android. **Las pruebas manuales siguen aplazadas.**
- BCP conserva su código y configuración. Se comprobó el bloqueo en código y entorno local; no se afirma haber leído la variable remota del proveedor. Diseños y recursos originales permanecen intactos.

Evidencia privada: `verify.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json` y `RESULTADO.json`, sin credenciales, cookies ni fichas de clientes.
