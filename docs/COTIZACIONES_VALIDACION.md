# Validación del cotizador de Ventas

## Problemas corregidos

El campo de adicionales convertía la edición con `Number(...) || 0`: podía perder una entrada incompleta o con coma y sustituirla por cero. El cálculo redondeaba valores con más de dos decimales y podía desbordarse con números extremos. La fecha aceptaba la normalización de JavaScript, por ejemplo 31 de febrero como un día de marzo. La etiqueta «Copiar propuesta» dependía únicamente de las instrucciones de pago, aunque faltaran los datos del cliente o evento.

## Comportamiento

- **Adicionales Bs** utiliza texto decimal. Acepta coma o punto y hasta dos decimales, sin separadores de miles. Vacío significa cero adicionales. Rechaza negativos, exponentes, exceso de precisión y decimales sin terminar; conserva el texto para corregirlo.
- El cálculo usa centavos enteros para base, adicionales, reserva y saldo. No redondea importes inválidos ni los cambia a cero. El total máximo es **1.000.000 Bs**, coherente con el límite existente de ingresos registrados del seguimiento comercial; incluye el precio del paquete.
- Las fechas no vacías deben representar un día de calendario real, incluido año bisiesto. No se exige una fecha futura: no se introduce esa regla comercial.
- Una cotización con valores inválidos no genera ni permite copiar un resumen. Los errores se muestran junto al campo. Si el importe es inválido, los totales no muestran un cero ficticio.
- Una cotización válida pero incompleta permite **Copiar borrador**. El texto empieza por **BORRADOR DE PROPUESTA · ENKARTA** e indica los datos por confirmar.
- Para **Copiar propuesta** deben estar completos cliente, evento, fecha, diseño, instrucciones de pago y, cuando hay adicionales, su descripción. Un diseño personalizado escrito por el equipo sigue siendo válido; no se limita al catálogo.
- Las respuestas de solicitud de reserva y materiales requieren los datos completos; todas las copias quedan bloqueadas mientras existan valores inválidos. Los mensajes siguen siendo textos para revisión y copia manual, sin envíos automáticos ni confirmación bancaria.

## Recuperación de borradores

Los nuevos registros locales usan versión 2 y conservan el importe crudo hasta 24 caracteres, incluso cuando está incompleto o requiere corrección (`12,`, `1e3`). Recuperar el borrador no convierte ese texto a cero ni publica una propuesta. La validación del cotizador decide qué puede copiarse.

Se mantiene la clave por sesión, la duración de 24 horas y la lectura de la versión 1 con importes numéricos. Un importe heredado `0.105` se recupera sin redondeo para poder corregirlo. No se reescribe un borrador al leerlo; una nueva edición guarda versión 2.

La recuperación conserva cliente, evento, fecha, diseño y descripción. La whitelist continúa excluyendo instrucciones bancarias, contraseñas, claves y datos de otras sesiones. El borrador local no es un pago, una propuesta aceptada ni un registro de ingresos del servidor.

## Verificación y entrega

- Regresiones de dominio: coma/punto, centavos, límites, desbordamiento, fechas imposibles/bisiestas, información pendiente frente a inválida, marca de borrador y propuestas completas.
- Regresiones de almacenamiento: compatibilidad de versiones, texto crudo, recuperación exacta de importes heredados, TTL, errores y separación de sesiones.
- Contratos de render: copia bloqueada ante valores inválidos o configuración pendiente, marca de borrador, texto escapado y cálculo revisado con centavos.
- La muestra `/dev/services/sales-quote` añade casos con coma, decimal incompleto, importe inválido, fecha inválida y un borrador anterior con `0.105`. Usa configuración y portapapeles simulados; permanece inaccesible fuera de desarrollo.
- Verificación completa: **504 pruebas correctas** (200 constructor/contratos, 153 servicios, 19 PostgreSQL de guardado, 24 contrato/reducer comercial, 14 PostgreSQL del dashboard, 16 contrato del dashboard, 17 contrato/render del historial, 15 dominio del cotizador, 10 render del cotizador, 31 integridad y 5 distribución), lint, TypeScript y build correctos. Persisten las advertencias existentes de imágenes de las invitaciones originales.
- Conservación: **597/597 archivos protegidos** idénticos por SHA-256. Revisión cruzada de dominio e interfaz sin hallazgos bloqueantes. Las pruebas de render no se presentan como aceptación visual en Android.
- Desarrollo en `codex/sales-quote-validation`, posteriormente fusionado a `main` y desplegado. No requiere otra migración SQL. La aceptación manual sigue aplazada y no se han creado datos de producción para este bloque.

BCP permanece desactivado. No se cambian precios, paquetes, diseños, presets ni recursos originales de las invitaciones.

Evidencia privada: `tmp/sales-quote-validation/verify.log`, `protected-local.json`, `RESULTADO.json` y `tmp/sales-quote-draft-tests.log`.

## Despliegue y comprobaciones de lectura, 19 de octubre de 2026

- Código **`1195225`**, fusionado a `main`. Vercel **`dpl_66psm7k9Fy7B7HdHehB15U6xcAGv`**, estado Ready y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-q73p18qxs](https://enkarta-q73p18qxs-juangabrielchoqueortiz7-engs-projects.vercel.app).
- CI del código desplegado: **completed / success**, incluida `npm run verify` y la auditoría de dependencias de producción. [Verify application #39339665122](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39339665122). El conteo de 504 pruebas procede del informe local completo; los metadatos de CI confirman el resultado de los pasos, sin atribuirles un desglose no consultado.
- Publicado desde el workspace completo, incluidos los originales que no están en Git. **129/129 recursos publicados** conservan tamaño y SHA-256; **6/6 rutas** públicas/de acceso respondieron como se esperaba. Comprobación local final: **597/597 archivos protegidos** idénticos.
- **7 comprobaciones correctas**: bloqueo local del proveedor BCP y del adaptador sin contrato, denegación privada HTTP 401 en cinco casos sin sesión administrativa válida, muestra de desarrollo HTTP 404, presencia del nuevo contrato del cotizador en los archivos JavaScript entregados por `/admin`, acceso administrativo normal con cookie segura, contrato acotado de `sales-config` sin caché y borrador ligado a la sesión, y persistencia de la denegación para una petición anónima separada. La comprobación BCP corresponde al código y entorno local; no se afirma haber leído la variable remota del proveedor.
- Cero consultas a contactos reales, cero registros creados, modificados o eliminados, cero llamadas bancarias y cero mensajes. Las instrucciones de pago y la cookie temporal permanecieron exclusivamente en memoria; no se guardaron sus valores en los informes. La cookie del cliente de automatización se retiró al terminar.
- La comprobación HTTP acredita publicación y permisos; no ejecuta edición, portapapeles, recuperación de borradores ni adaptación visual en Android. Esas interacciones conservan la cobertura automática local indicada arriba y siguen pendientes de aceptación manual.
- No se modificaron precios, paquetes, invitaciones, presets, recursos ni configuración del proveedor de pagos. BCP permanece bloqueado hasta disponer de su contrato oficial y validar la integración.

Evidencia privada adicional en `tmp/sales-quote-validation/`: `deployment.log`, `deployment-inspect.log`, `production-public.json`, `production-quote-readonly.json`, `protected-local-final.json` y `ci.json`, sin claves, contraseñas ni cookies.
