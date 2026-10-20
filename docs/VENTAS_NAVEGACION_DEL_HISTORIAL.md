# Navegación del historial de Ventas

El historial permite **Anterior**, **Siguiente** y muestra **Página N**. Las páginas mantienen el mismo corte temporal hasta pulsar **Actualizar historial**, cerrar y volver a abrir, o cambiar de contacto, revisión o transporte.

## Contrato de lectura

- Las continuaciones utilizan su cursor validado. Volver a la primera página transmite explícitamente `asOf` sin cursor y usa un límite inclusivo `created_at <= asOf`; no construye un cursor ficticio que pueda excluir registros situados exactamente en el corte.
- `asOf` conserva los seis decimales de PostgreSQL. Se validan fechas UTC, futuro y duplicados; no se admite combinar `cursor` con `asOf` en la URL.
- El cliente verifica el corte esperado aun sin cursor y rechaza páginas de otro contacto, orden inválido, campos inesperados o un corte distinto.
- El servidor mantiene autenticación administrativa y respuestas `private, no-store`. La consulta es de sólo lectura y sigue acotada a 20 movimientos por página.

## Interacción y recuperación

- Se conserva en memoria una pila de destinos, sin copiar historiales a almacenamiento persistente. La ubicación visible cambia únicamente después de recibir y validar una respuesta correcta.
- Si falla Anterior, Siguiente o Actualizar, se conservan la página, los registros y el corte visibles. **Reintentar consulta** repite el destino que falló.
- Mientras se consulta, los controles se desactivan. Los clics repetidos y los manejadores de una navegación anterior no inician solicitudes adicionales ni sustituyen una página reciente.
- Cerrar, cambiar de identidad/revisión/transporte o desmontar cancela la lectura y descarta respuestas tardías. Al abrir de nuevo se consulta la primera página con un corte nuevo.
- **Actualizar historial** vuelve a la primera página con un corte nuevo únicamente al completar la consulta; no confunde volver una página con refrescar los datos.

Se conserva la presentación del historial, sus notas e importes. No se modifican invitaciones, presets, estilos globales, recursos originales, pagos ni envíos. BCP continúa desactivado. No requiere una migración SQL ni dependencias nuevas.

## Validación y aceptación

Las regresiones automáticas comprueban el contrato, las consultas SQL y las transiciones del componente con datos y transportes ficticios. No sustituyen la aceptación visual, el foco, el portapapeles ni el almacenamiento de Chrome en un Android físico.

La aceptación móvil se realiza con un conjunto identificado de contactos y movimientos ficticios. Su alcance se persiste antes de insertar y su limpieza se limita a esos identificadores y marcas. Se mantienen desactivados los pagos BCP y no se envían mensajes durante la aceptación.

## Verificación local, 19 de octubre de 2026

- `npm run verify`: **904 pruebas correctas**, incluidas **17 nuevas**, lint, TypeScript y build completos. Permanecen únicamente los avisos anteriores de imágenes en invitaciones originales.
- Ocho casos nuevos del cliente cubren fechas, cortes explícitos y duplicados, exclusión cursor/asOf, rechazo antes del transporte y respuestas con un corte distinto. El cliente del historial pasa 25 casos.
- Un caso nuevo de servicios ejecuta SQL real con 46 movimientos dentro del corte, incluido el UUID máximo exactamente en su límite y una fila adicional 1 µs después, excluida. Recorre `1→2→3→2→1`, compara páginas y verifica que la lectura no altera revisiones ni recibos. Los servicios pasan 157 casos y amplían los rechazos de parámetros sin SQL.
- Ocho casos nuevos de navegación ejercitan el componente real con hooks/transportes ficticios: vuelta a primera página con `asOf` sin cursor, fallos y reintentos de ambos sentidos y actualización, corte distinto rechazado, doble clic, callbacks antiguos, cierre, desmontaje y cambio de contacto/revisión/transporte. Las 24 regresiones previas de cargas siguen pasando.
- Revisión independiente del contrato, consultas, UI y muestra sin bloqueantes. Revisión de los controles con las [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): botones nativos, foco visible, tamaño táctil, estados accesibles y disposición flexible. El historial no añade inputs ni enfoca un campo de texto.
- **597/597 archivos protegidos** idénticos por SHA-256; distribución completa con **129 originales**. No hay migración, dependencia ni cambio en BCP.

Estas comprobaciones no certifican disposición ni interacción física en Android; la aceptación manual se registra separadamente. Evidencia local privada en `tmp/sales-history-navigation/` y `tmp/commercial-history-return/`.

## Producción y preparación móvil, 19 de octubre de 2026

- Código **`dcece70763cbaac03e12c1a70632f43351c6ec53`**, fusionado a `main` y desplegado desde el workspace completo, incluidos los originales ignorados por Git. Vercel **`dpl_GW1dsUWJaSuUhxRdU33HvqH5DCor`**, Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). [Versión inmutable](https://enkarta-k0wbo7ua8-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI **completed / success** para ese SHA: job `verify`, verificación completa y auditoría de dependencias de producción correctos. [Verify application #39364520309](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39364520309). Sólo se consultaron metadatos, sin descargar logs.
- Comprobación previa de publicación: **9 controles HTTP y de contrato correctos**, configuración privada y acceso anónimo denegado, muestras de desarrollo inaccesibles, navegación y explicación del corte presentes en el cliente publicado, whitelist privada, autenticación segura y entradas inválidas rechazadas. Esa comprobación no escribió datos y cerró su cookie temporal.
- **129/129 originales publicados** conservan bytes y SHA-256; **6/6 rutas** públicas/de acceso correctas. **597/597 archivos protegidos** idénticos localmente. BCP conserva su código y configuración; el proveedor local está desactivado y el gateway bloqueado. No se afirma haber leído su variable remota.
- A continuación se preparó, con autorización del usuario, un conjunto manual independiente: **27 contactos, 27 eventos de visita y 45 movimientos** de un único contacto ficticio. Todos los contactos parten en «No concretó», los movimientos mantienen ese estado y el importe sin registrar. No se crearon usuarios, reservas, ventas ni ingresos, ni se enviaron mensajes o peticiones bancarias.
- El manifiesto se persistió antes de cada inserción. El helper comprueba identificadores, referencias, hashes, placement y campaña; sólo lee páginas del filtro tras verificar que contiene exclusivamente los 27 QA. Las métricas ajenas se leen por agregado sin recuperar sus fichas.
- Aceptación HTTP con ese conjunto: listado **25 + 2**, métricas iguales entre páginas, historial **20 + 20 + 5**, retorno **3→2→1** con corte e identificadores exactamente iguales. Los clientes temporales de las comprobaciones cerraron su sesión.
- El conjunto se conservó para la aceptación humana y posteriormente se eliminó con el manifiesto original. **Aceptación Android/Chrome aprobada y limpieza verificada**, según el cierre registrado a continuación. El manifiesto se conserva como evidencia y no debe reutilizarse para insertar otro conjunto.

Evidencia privada: `verify.log`, `deployment.log`, `deployment-inspect.log`, `production-readonly.json`, `production-public.json`, `protected-local-final.json`, `ci.json`, `RESULTADO.json` y `acceptance-scope.json` dentro de `tmp/sales-history-navigation/`. El manifiesto incluye referencias ficticias y propiedad del conjunto; no contiene claves, contraseñas ni cookies. Las cifras globales pueden cambiar por actividad real y no deben confundirse con errores de paginación.

## Cierre de aceptación Android/Chrome, 19 de octubre de 2026

El usuario confirmó siete comprobaciones en su dispositivo:

1. Tarjetas, filtro, referencias y presentación completos, sin desplazamiento horizontal.
2. Listado de 25 y 2 contactos, regreso a primera página y métricas conservadas.
3. Historial `1→2→3→2→1`, registros 20/20/5 y corte «Hasta» invariable al navegar.
4. Actualizar desde página 2 devuelve a la primera; ocultar/reabrir muestra una sola sección con los primeros 20 registros.
5. Nota ficticia conservada localmente y recuperada explícitamente tras recargar la misma pestaña, sin guardar todavía.
6. Guardado explícito confirmado, nota conservada tras recargar y nuevo movimiento visible en el historial; el borrador sin enviar ya no aparece.
7. Preparar cotización desde la ficha desplaza a la revisión; cancelar conserva el borrador anterior y sus valores. No se confirmó una importación, ni se copió o envió una propuesta.

Las lecturas de la ficha ficticia verificaron antes de guardar: revisión 45, 45 movimientos, cero recibos y nota original intacta. Después: revisión 46, 46 movimientos y **un único recibo y movimiento con la nota nueva**; el estado siguió «No concretó» y el ingreso permaneció sin registrar. La nota introducida incluía un espacio adicional respecto del texto sugerido; se conservó sin normalizar y coincidió exactamente con el movimiento. No hubo duplicación de guardado.

La limpieza usó identificadores y marcas de propiedad del manifiesto. Retiró los 27 contactos, 27 eventos y los hijos del contacto editado, incluido el movimiento y recibo generados durante la aceptación. Se verificó **cero contactos, eventos, movimientos, identificadores de historial sembrado y recibos** del alcance. No se alteró el almacenamiento de cotizaciones del navegador ni el borrador previo del usuario. Para retirar de pantalla una ficha fijada que ya fue eliminada, se requiere recargar la página completa.

**Resultado: aceptación Android/Chrome aprobada y sin datos QA persistentes.** Cero usuarios creados, mensajes enviados y llamadas bancarias. BCP y los diseños y recursos originales permanecen intactos. El alcance no incluye iPhone/Safari, operaciones bancarias reales ni envío efectivo de WhatsApp.

Evidencia privada adicional: `ACEPTACION_FINAL.json`, `manual-note-before-save.json`, `manual-note-after-save.json` y cierre del manifiesto `acceptance-scope.json`. Las comprobaciones finales sólo leyeron la ficha y los hijos ficticios identificados; no recuperaron fichas de clientes.
