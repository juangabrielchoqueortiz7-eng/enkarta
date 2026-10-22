# Salida protegida del constructor en computadora

Antes, beforeunload solo consultaba la marca de cambios confirmados del editor. Cerrar con texto inline todavía activo podía no advertir: Editable confirma ese texto en blur, que no siempre precede al cierre. Un guardado manual de un documento limpio tampoco activaba aviso durante su petición. «Volver al panel» seguía disponible mientras esas operaciones o una publicación estaban pendientes.

Ahora beforeunload confirma el Editable activo con su blur existente y consulta las referencias actuales de cambios, guardado manual, petición de borrador y operación pública. Solicita la advertencia nativa cuando corresponde, sin guardar en el evento de salida. Si el usuario cancela el cierre, el texto confirmado permanece en el editor y sigue el autoguardado habitual.

El clic normal en «Volver al panel» espera una operación pendiente y explica el motivo en una región de estado. Cuando no hay operación mantiene el enlace nativo de página completa: si quedan cambios sin guardar, beforeunload sigue siendo quien solicita confirmación. Los clics modificados conservan su comportamiento y dejan el editor abierto. No se intercepta el historial global del navegador ni se reemplazan sus diálogos.

Los navegadores pueden limitar beforeunload, exigir interacción previa u omitirlo al terminar un proceso, especialmente en móviles. La protección no sustituye un guardado confirmado ni promete recuperación después de un cierre forzado. Tampoco cubre por sí sola subidas que todavía no han llegado al estado del editor.

Se aplican Impeccable en modo Operate y las guías de React de Vercel. No se cambian renderers, presets, fuentes, música ni archivos originales; no hay SQL ni dependencias nuevas. BCP conserva su bloqueo y la modificación preexistente de la migración 021 sigue excluida.

Ocho regresiones usan InvitationBuilder, Editable y la cola de persistencia reales, con hooks y eventos simulados en memoria. Cubren texto sin blur, ausencia de advertencias falsas, guardados manuales y automáticos, cambios posteriores, operaciones públicas, navegación nativa y desmontaje. El código anterior b4ea294 obtiene 4 aciertos y 4 fallos; el actual pasa los ocho casos. No es una prueba ReactDOM ni una aceptación del diálogo real del navegador: la revisión manual continúa pendiente.

El verify terminó con salida 0: **1.899 pruebas correctas en 65 ejecuciones**, lint, TypeScript y build de **65 páginas**. Se conservan las advertencias previas de imágenes heredadas, sin supresiones nuevas. El detector no señaló hallazgos y los **597 archivos protegidos**, junto al hash de la migración 021, permanecen intactos.

## Producción y limpieza

El commit `b41a235c544cf093ba54556ba777faa9199c4e34` quedó integrado en main y desplegado como `dpl_2rgPWk6o56HpWNdz1BBHatAgrbrQ`, Ready con alias [enkarta.vercel.app](https://enkarta.vercel.app). El [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39832244653) terminó correctamente, incluidos verify y la auditoría de dependencias de producción.

- El release procede del commit, conserva los 129 originales y excluye archivos de entorno, material maestro y la modificación local de la migración 021. Los identificadores de entrada de Vercel coinciden con los bytes revisados del constructor y del bloqueo BCP. Los dos mensajes del nuevo control aparecen en el código compilado servido por producción.
- Se creó un único borrador ficticio con recursos existentes. Su editor privado respondió 200; el contenido coincidió con el plan y las URL anónimas, incluida preview=1, ocultaron sus datos. No se publicaron invitaciones.
- Pasaron seis rutas públicas y **129/129 originales** por longitud y SHA-256. Dos audios grandes se comprobaron íntegramente mediante 34 rangos HTTP ordenados con validación de Content-Range y ETag; no es una prueba de reproducción ni de velocidad de descarga completa.
- Se eliminó exclusivamente el borrador ficticio mediante su UUID/slug fijados y validación de nombre, propietario, estado, etiqueta QA y contenido. Las ocho tablas asociadas quedaron sin filas y los tres prefijos de almacenamiento estaban vacíos. Tras cerrar la sesión técnica, ambas URL devolvieron 404.
- Los **597 archivos protegidos** y el hash de la migración 021 siguen iguales. Cero pagos, mensajes, archivos subidos o llamadas bancarias. BCP conserva su bloqueo; no se consultaron ni modificaron variables remotas del proveedor.

La comprobación de producción acredita fuentes, mensajes compilados, HTTP, privacidad e integridad y limpieza ficticia. Los eventos de salida se ejecutan en memoria: no se afirma haber mostrado o aceptado el diálogo nativo de cierre en producción. La aceptación manual de esta mejora sigue pendiente.

Evidencia privada: `tmp/builder-leave/RESULTADO.json`.
