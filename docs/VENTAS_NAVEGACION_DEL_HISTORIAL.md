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
