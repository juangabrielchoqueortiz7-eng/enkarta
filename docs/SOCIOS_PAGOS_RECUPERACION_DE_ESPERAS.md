# Socios: esperas y consulta del estado de pago

## Problemas reproducidos

El helper `partnerRequest` esperaba indefinidamente tanto el transporte como `response.json()`. Si la conexión o el cuerpo no terminaba, el checkout conservaba «Preparando…», «Enviando…», «Retirando…» o «Consultando…» y bloqueaba «Actualizar estado». Un error de red tampoco permite concluir que el servidor haya rechazado o revertido una escritura.

La lectura automática de cuenta tenía otra carrera: una consulta de polling iniciada antes podía responder después de una consulta explícita y sustituir un pago aprobado por el estado pendiente anterior. Se reprodujo con `PartnerDashboard` real y respuestas ficticias diferidas. Poner un plazo a la red por sí solo no resuelve ese orden de aplicación.

## Contrato de recuperación

- Un intento completo dispone de **25 segundos** para obtener y leer su respuesta. Incluye transporte, JSON y comprobación final del plazo transcurrido; no se reinicia el presupuesto al llegar las cabeceras.
- Se cancela la espera del cliente mediante `AbortController`. Una promesa propia acotada permite terminar también si un transporte o un lector ignora la señal. La señal externa se propaga sin cancelarla desde dentro y se retiran timers/listeners al finalizar.
- No se reintentan escrituras automáticamente. Una respuesta o rechazo tardío no convierte en éxito un intento que ya terminó ni inicia otra petición.
- Al agotarse el plazo se conserva la incertidumbre: «No pudimos comprobar el resultado en 25 segundos. Pulsa «Actualizar estado» antes de repetir. La operación puede haberse recibido en el servidor.» Detener la espera no demuestra que se haya cancelado la operación del servidor.
- La referencia preparada sigue sin equivaler a un pago. El comprobante continúa en revisión manual y sólo una aprobación válida puede activar la suscripción. BCP permanece bloqueado.

### Panel y evidencia

El checkout libera su indicador de actividad al terminar el plazo, conserva plan, periodo, método, nota y archivo elegidos y exige consultar el estado antes de otra escritura. El bloqueo de recuperación también vive en una ref síncrona: un manejador retenido antes del nuevo render no puede eludirlo. Sólo «Actualizar estado», con una cuenta completa validada, retira ese bloqueo; recibir datos de polling no equivale a esa acción explícita.

El panel registra una verificación pendiente al empezar cada escritura y la conserva aunque se cambie de pestaña durante la espera o después del error. Volver a «Suscripción y pagos» muestra el aviso y mantiene bloqueadas las escrituras. La consulta explícita válida, o la consulta válida que sigue a un ACK de escritura comprobado, son las únicas que la resuelven. Cambiar de pestaña no cancela una operación que el servidor haya recibido; tampoco recupera el archivo de un formulario desmontado.

Se validan perfil, suscripción, cuota, configuración de cobro y los pagos que devuelve la cuenta, incluidos identificadores, estados y ausencia de pagos pendientes duplicados. Una respuesta HTTP 200 incompleta no se aplica ni permite continuar. La consulta explícita también usa el plazo completo de 25 segundos y puede volver a realizarse cuando termina una espera o falla; nunca llama por sí misma a preparar, adjuntar o retirar pagos.

Las lecturas de cuenta llevan una secuencia y cancelación. Una nueva consulta explícita reemplaza la anterior; una operación de pago invalida las lecturas anteriores tanto al empezar como al confirmar su resultado. El polling no se solapa con una lectura u operación en curso. Las respuestas y errores de consultas reemplazadas se descartan sin restaurar datos ni anunciar éxito o fallos antiguos.

El callback de guardar perfil actualiza únicamente el perfil sobre el estado más reciente. No recupera los pagos y la suscripción del render antiguo del formulario. Las respuestas incompletas del perfil no sustituyen la cuenta válida.

Al salir de la pestaña se cancela la espera y se ignoran las respuestas del componente desmontado. No se guardan archivos, números de transacción ni datos de pago en un almacenamiento global o del navegador. Este bloque no promete recuperar el archivo tras recargar ni una confirmación del servidor cuando se interrumpe la red.

## Alcance

Se conservan las rutas de servidor, importes, referencias, contratos de pago y lógica de aprobación de las migraciones existentes. Este bloque no necesita SQL ni añade dependencias, endpoints bancarios o recursos visuales. El constructor y los originales de las invitaciones mantienen sus fuentes, fotografías, música, animaciones y bytes.

Las regresiones de red lenta se ejecutan con relojes, transporte y respuestas ficticias. No equivalen a una espera observada con una cuenta Google real, una aceptación de Android/Safari o una operación bancaria en producción.

## Regresiones incorporadas

- `scripts/test-partner-checkout.cjs`: **14 casos** del helper real con reloj controlado. Cubren presupuesto compartido de fetch/JSON, señales externas, transporte que ignora abort, respuestas y rechazos tardíos, bloqueo del event loop, limpieza de timers/listeners, errores anteriores y aislamiento entre solicitudes.
- `scripts/test-partner-checkout-ui.cjs`: **17 casos** de `PartnerDashboard` y `SubscriptionTab` reales con hooks/efectos y transporte ficticios. Cubren preparación, comprobante, retirada, consulta explícita lenta/inválida, evidencia, handlers anteriores al render, polling antiguo, ACK, perfil, desmontaje y cambios de pestaña antes o después del timeout y durante la consulta posterior a un ACK.

Antes del ajuste UI se ejecutaron dos reproducciones fallidas con el helper ya acotado: un handler retenido repetía POST tras el timeout y un polling antiguo revertía el refresco explícito reciente. Esto prueba que el plazo por sí solo era insuficiente. Después del ajuste pasan los 17 casos de UI y las 14 pruebas del helper; la revisión independiente de la fuente no detectó bloqueantes. Las dos suites se incorporan a `npm run verify`.

El alcance visual se limita al aviso de recuperación y conserva el contenedor, textos de activación manual, historial y controles existentes. La revisión usa las pautas de React de Vercel para refs, efectos y secuencias y Web Interface Guidelines para el aviso accesible y la acción explícita. No se infiere aceptación visual de las pruebas de hooks.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **985 pruebas correctas en 29 suites**, incluidas **31 nuevas** de este bloque, además de lint, TypeScript y build de producción. Permanecen los avisos de imágenes anteriores de las invitaciones originales; no hay nuevos avisos de lint en los archivos afectados.
- **597/597 archivos protegidos** permanecen idénticos por SHA-256. La comprobación de distribución encuentra completos los **129 originales públicos**, incluidos los audios conservados fuera de Git.
- La revisión independiente de los cambios del helper y del panel no detectó bloqueantes. Los helpers privados para comprobar HTTP y recursos en producción tienen 17 regresiones offline correctas; esos casos no se suman a las 985 pruebas de la aplicación.

Evidencia privada: `tmp/partner-checkout-recovery/verify.log`, `helper-tests.log`, `ui-tests.log` y `protected.json`. No se necesita otra migración SQL. La aceptación manual de dispositivo queda pendiente por decisión del usuario.

## Producción verificada, 20 de octubre de 2026

- Código **`2317b6d44a50568bb671540a79a701cede1853ce`**, integrado en `main`. [CI del commit exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39418505993): `completed/success`, con `npm run verify` y auditoría de dependencias aprobados.
- Vercel **`dpl_8zGCumjnT9zNNg4NrBYfw7PYzZZj`**, `READY`, destino producción y alias [enkarta.vercel.app](https://enkarta.vercel.app). Despliegue inmutable: [enkarta-8i6u29bwe](https://enkarta-8i6u29bwe-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para incluir los originales ignorados por Git.
- Los identificadores de contenido de `PartnerDashboard.tsx` y `partner-checkout.ts` coinciden con los dos archivos de entrada del despliegue Ready. Esto acredita la fuente subida; no acredita haber ejecutado el nuevo timeout desde un navegador real.
- **9 grupos HTTP correctos**, incluidas **24 denegaciones**, de las que **18 son intentos de escritura**. Las rutas de cuenta, preparar referencia, retirar y adjuntar comprobante rechazan sesiones ausentes, cookies inválidas de otros roles y una cookie administrativa válida sin sesión de Socios. El panel conserva el acceso normal de Socios. No se autenticó ninguna escritura de negocio.
- La configuración administrativa conserva `no-store` y su vinculación a la sesión. El historial privado del constructor conserva `no-store` y `Vary: Cookie`, con respuesta vacía para un UUID ficticio cuya ausencia se comprobó mediante conteos exactos antes y después. No se leyeron filas de clientes.
- **129/129 originales públicos** conservan tamaño y SHA-256 y las **6/6 rutas** públicas, de acceso y de desarrollo comprobadas responden como corresponde. Los **597/597 archivos protegidos** de la verificación local permanecen intactos.
- Se cerró correctamente la cookie administrativa temporal, mantenida sólo en memoria. **Cero registros de negocio, usuarios Auth, pagos, fixtures, llamadas bancarias o mensajes creados**: no hay datos de prueba que retirar de la base.

BCP permanece bloqueado por el contrato existente y no se cambiaron sus credenciales ni configuración. Las comprobaciones no consultaron variables remotas de pago ni endpoints bancarios. Las carreras, plazos y cambios de pestaña se validaron con pruebas automáticas locales; la aceptación manual de Android/Safari, Google y el flujo autenticado completo de comprobante siguen pendientes. Este despliegue no necesita SQL ni modifica los diseños originales.

Evidencia privada adicional en `tmp/partner-checkout-recovery/`: `deployment.log`, `deployment-final.json`, `deployment-files.json`, `ci.json`, `production-http.json`, `production-public.json` y `RESULTADO.json`. La aceptación y limpieza anteriores de Ventas y el borrador del cotizador del navegador permanecen intactos.
