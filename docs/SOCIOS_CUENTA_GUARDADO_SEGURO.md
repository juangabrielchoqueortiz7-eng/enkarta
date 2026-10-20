# Socios: guardado de «Mi cuenta»

## Fallos corregidos

El botón sólo bloqueaba mediante estado React, después del render: dos invocaciones del mismo manejador podían lanzar dos PUT. La espera no tenía plazo ni catch; tanto la conexión como el JSON podían dejar «Guardando…» indefinidamente. Una respuesta anterior podía notificar éxito y sustituir el perfil después de salir de la pestaña o de recibir datos más recientes.

La reproducción independiente contra `c634a6f1776f457ead2f266be1c6e702cc9dbab2` ejecutó el componente real en memoria: dos PUT antes del render y, al completar primero el segundo y después el primero, aplicación del perfil antiguo al final. No se realizaron peticiones reales.

## Implementación

- `PartnerProfileSave` en `src/lib/partner-account.ts` conserva un único intento por panel, mediante una referencia del `PartnerDashboard`. El bloqueo es síncrono y la incertidumbre sobrevive al cambio de pestaña. Cada intento tiene controlador, identidad, revisión del perfil y copia de los campos enviados.
- Las solicitudes utilizan `partnerRequest`, ya existente, con un presupuesto de **25 segundos para transporte y JSON juntos**. No hay reintentos automáticos. Desmontar cancela la espera y bloquea avisos, respuestas y manejadores anteriores; no supone que el servidor haya revertido la escritura.
- El PUT envía únicamente marca, teléfono y ciudad normalizados en el mismo orden que el servidor: trim, sustitución de controles y límites de 80/30/60 caracteres. La respuesta debe tener un perfil completo, identidad inmutable coincidente y los tres campos enviados. El estado debe ser una cadena válida, sin coerción de arrays u otros tipos.
- El panel observa los perfiles aceptados por lecturas completas y mantiene una revisión monotónica. Una respuesta no repone un perfil más reciente, incluso si sus valores cambiaron de A→B→A. Los pagos, cupo y suscripción siguen actualizándose; aceptar el guardado mezcla únicamente el perfil. Las lecturas iniciadas antes de la operación o de su aceptación se invalidan.
- Las ediciones actualizan referencias antes del render. Los campos siguen disponibles durante la espera; confirmar lo enviado no elimina las ediciones posteriores. El borrador y sus campos modificados permanecen sólo en memoria del panel al salir y volver a «Mi cuenta». Cambiar de identidad los elimina. No se guardan datos de perfil ni bloqueos en almacenamiento del navegador o cachés compartidas.
- Un resultado incierto muestra «Comprobar guardado», que hace exclusivamente GET. Exige una cuenta completa y coherente, con la misma identidad y controles de vigencia. Sólo si sus campos coinciden con el intento se libera la barrera; no se atribuye un recibo de transacción inexistente. Si todavía no coinciden, se conservan borrador y barrera para volver a comprobar.
- Los rechazos HTTP 400, 401 y 403 son definitivos según el contrato actual de esta ruta y permiten otro intento manual. Errores de conexión, 5xx, cuerpos incompletos, discrepancias y tiempos agotados requieren comprobación. Una vez confirmado un borrador sin cambios, repetir el manejador no envía otro PUT.

Se aplica `vercel-react-best-practices` para referencias por instancia, estado vigente y límites de respuestas asíncronas, manteniendo React 18 y las dependencias existentes.

## Conservación y límites

Los controles de perfil mantienen sus etiquetas, disposición y estilos; se añade el estado accesible y el botón de comprobación. Ningún renderizador, preset o recurso de invitaciones cambia. Se conservan fuentes, fotografías, música, animaciones y bytes originales.

La ruta del servidor mantiene autenticación y alcance por socio; no se modifican permisos ni el esquema. No hay bloqueo distribuido ni versionado condicional de la fila en servidor: esta entrega impide duplicaciones y aplicación de respuestas obsoletas en el panel actual, sin afirmar exclusión entre dispositivos. El estado en memoria termina al recargar o cerrar el panel. Si una escritura nunca llegó y el GET no coincide, no se puede probar que terminó; la barrera sigue pendiente en esa sesión, sin emitir otro PUT automáticamente.

BCP permanece bloqueado, sin cambios de proveedor o credenciales, sin llamadas bancarias y sin SQL. Las pruebas manuales permanecen aplazadas. Las regresiones locales con componentes reales y la atestación de fuentes y permisos de producción no equivalen a un guardado autenticado de perfil en un navegador de producción.

Evidencia privada: `tmp/partner-account/` y revisión independiente en `tmp/partner-account-audit/`.

## Regresiones automáticas

`scripts/test-partner-account-ui.cjs` añade **30 pruebas** con `AccountTab`, el panel completo en los recorridos de integración, el controlador y el helper de solicitudes reales. El reloj, transporte y ciclo de hooks se controlan en memoria; los perfiles son ficticios. No se monta el DOM, no se autentica ni se modifica un perfil remoto.

- Dos invocaciones antes del render producen un único PUT; el cuerpo utiliza los últimos campos editados, incluidos cambios realizados en ese mismo turno y la normalización del servidor.
- Transporte y JSON suspendidos comparten 25 segundos. Las respuestas tardías no se leen o aplican después del plazo, cancelación, desmontaje o comprobación nueva. Los errores se capturan sin promesas rechazadas sin manejar.
- Respuestas incompletas, identidad distinta, campos que no coinciden y estados de tipo incorrecto no anuncian un guardado confirmado. Rechazos definitivos y resultados inciertos siguen recorridos distintos.
- «Comprobar guardado» hace GET, no PUT, conserva la barrera si la respuesta es incompleta o no coincide y libera únicamente un resultado válido. Los manejadores anteriores no repiten una escritura al resolver la incertidumbre.
- Las ediciones posteriores al envío permanecen en el formulario, también tras salir y volver a la pestaña. La recuperación conserva esos cambios y permite guardarlos después mediante una acción nueva.
- El polling mantiene pagos y suscripción actuales sin reponer el perfil; una consulta iniciada antes del guardado no puede revertir su confirmación. Cambios posteriores de perfil y A→B→A invalidan el ACK antiguo.
- Montaje, desmontaje, cambio de identidad, replay de efectos de React 18 y consumidor independiente sin actualización inmediata de props no generan escrituras, estados o avisos tardíos.

La suite final pasa **30/30**, también en ejecución independiente. El modo opcional `--baseline` sustituye **únicamente `AccountTab`** por su fuente de `c634a6f1776f457ead2f266be1c6e702cc9dbab2`, manteniendo actuales el panel y las utilidades: **25 fallos y 5 aprobadas**. La ejecución habitual no utiliza Git y funciona con checkout superficial de CI. Logs: `account-ui.log`, su copia `partner-account-ui.log` y `reproduction-baseline.log`.

La auditoría independiente ejecutó seis comprobaciones del controlador y una reproducción del consumidor independiente, sin bloqueantes; no se suman a las 30 oficiales. Su comparación AST conserva los **201 textos y atributos visuales existentes** del panel, además de los nuevos controles de comprobación. Evidencia: `../partner-account-audit/visual-contract.json` y logs de revisión.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.255 pruebas correctas en 42 suites**, incluidas las **30 nuevas**, lint, TypeScript y build de producción; comando completo terminado con código 0. Evidencia: `verify.log`.
- **597/597 archivos protegidos** conservan sus hashes y los **129 originales de distribución** están completos, incluidos los recursos archivados fuera de Git. Evidencia: `protected.json` y `distribution.json`.
- **28/28 pruebas offline** de los helpers privados de atestación, permisos y cierre de sesión pasan. Incluyen el nuevo PUT de cuenta denegado con campos ficticios y sus conteos exactos. No se suman a las pruebas de la aplicación ni realizan red. Evidencia: `smoke-helper-tests.log`.

Permanecen los avisos anteriores de imágenes; no se modifican dependencias ni migraciones.
