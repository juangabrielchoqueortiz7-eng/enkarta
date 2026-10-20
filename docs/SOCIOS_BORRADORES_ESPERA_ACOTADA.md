# Socios: creación de borradores con espera acotada

## Fallo y corrección

`PartnerDesignPicker` esperaba el POST de creación y después su JSON sin plazo. Una conexión o un cuerpo suspendidos podían mantener «Creando…» indefinidamente. La corrección reutiliza `partnerRequest`, con un presupuesto de **25 segundos para transporte y cuerpo juntos**, sin reintentos automáticos ni cambios en la ruta o el esquema.

Cada intento tiene identidad, controlador y bloqueo síncrono por instancia. Dos acciones antes del render producen un único POST. Un UUID válido recibido dentro del plazo abre una sola vez el borrador correspondiente a la plantilla elegida. El bloqueo se conserva al abrirlo. Si falla la navegación, permanece el enlace «Abrir el borrador» ya existente.

Al agotarse el plazo, una respuesta desconocida pasa a «Sin confirmar», termina `aria-busy` y presenta «Revisar mis invitaciones». Errores de red, 5xx, JSON de éxito incompleto o un UUID inválido siguen ese mismo recorrido. No se supone que abortar haya revertido una escritura: los controles de creación permanecen bloqueados en esa instancia.

Los 4xx recibidos dentro del plazo son rechazos definitivos según el contrato de esta ruta: validación y permisos preceden a la creación, y los errores de cupo son transaccionales. Se mantiene la posibilidad de corregir y realizar una **nueva acción manual**. Si el cuerpo del rechazo es ilegible o se atasca, se utiliza un mensaje de rechazo; también su lectura comparte los 25 segundos. Las cabeceras y el texto tardíos no cambian esta clasificación ni su mensaje, incluso cuando el navegador retrasa el callback del temporizador.

Al desmontar se cancela la espera y se descartan respuestas, estados y navegación posteriores. El replay de efectos de React 18 conserva como incierto un POST interrumpido sin rechazo conocido; un 4xx confirmado permite una nueva acción explícita. El replay inicial sin operación activa no impide crear. Los manejadores antiguos consultan el cupo actual antes de empezar una operación nueva.

Un cambio de orden del catálogo, selección, plan o posibilidad de publicar durante una operación no modifica su plantilla enviada ni descarta un ACK válido. El servidor sigue siendo la autoridad para permisos y cupos actuales. No se cancela una creación confirmada por un cambio visual de props.

Se aplica `vercel-react-best-practices` para referencias por instancia, limpieza de efectos y vigencia de respuestas asíncronas, compatible con React 18 y sin actualizar dependencias.

## Conservación y límites

Se conservan los textos, estilos, imágenes y enlaces del catálogo, salvo el nuevo aviso de espera agotada. No se modifican renderizadores, presets, fuentes, fotografías, música, animaciones ni recursos originales de las invitaciones. La utilidad compartida y la API mantienen su código y sus contratos.

El bloqueo es local a la instancia montada. No constituye idempotencia distribuida ni una garantía entre pestañas, dispositivos o recargas. El servidor conserva su control transaccional de cupos. Si el resultado es incierto, se indica revisar el padrón de invitaciones antes de intentar crear otra.

BCP permanece desactivado, sin cambios de proveedor o credenciales, operaciones bancarias ni SQL adicional. Las pruebas manuales permanecen aplazadas. Los escenarios de espera y carreras se comprueban localmente con el componente y helper reales y transporte ficticio; las verificaciones HTTP de producción acreditan fuentes, permisos y recursos, sin afirmar una creación autenticada desde un navegador de producción.

Evidencia privada de esta entrega: `tmp/partner-draft-timeout/`; auditoría independiente: `tmp/partner-draft-timeout-audit/`.

## Regresiones automáticas

`scripts/test-partner-draft-timeout-ui.cjs` incorpora **26 pruebas** con `PartnerDesignPicker`, catálogo y `partnerRequest` reales. Utiliza reloj, hooks y transporte ficticios en memoria; no monta el DOM ni solicita credenciales o servicios remotos. Se añade a `npm run verify` sin reemplazar las pruebas anteriores.

- Fetch que ignora abort, JSON suspendido y reparto del plazo entre ambos: a los 24.999 ms continúa esperando, a los 25.000 ms termina la espera. No nace un segundo presupuesto para el cuerpo.
- Respuestas de transporte o JSON posteriores al vencimiento no navegan, anuncian éxito ni emiten otro POST. El avance de `Date.now()` sin ejecutar el callback del timer también descarta ACK, cabeceras 4xx y mensajes tardíos.
- Los rechazos definitivos mantienen un mensaje seguro y sólo permiten una nueva acción explícita. Un cuerpo anterior que resuelve después no modifica el intento nuevo. Los errores inciertos conservan la barrera y el acceso a «Mis invitaciones».
- Doble pulsación y acciones sobre dos diseños antes del render producen un único POST `no-store`; el UUID válido abre una sola vez y limpia el timer. Los manejadores retenidos consultan el cupo actual.
- Desmontaje, montaje nuevo y replay de efectos de React 18 descartan resultados obsoletos. Cambios de selección, orden y props durante la espera conservan la plantilla enviada; las imágenes, nombres y enlaces de muestra del catálogo permanecen iguales.

La suite final pasa **26/26**. El modo opcional `--baseline`, que sustituye únicamente el Picker por la fuente de `c905b082ad91c5062b4d31511bb8a289d54862d0`, reproduce **19 fallos y 7 aprobadas**. La ejecución habitual no depende de Git ni de historial completo de CI. Logs: `draft-timeout-ui.log` y `reproduction-baseline.log`.

La revisión independiente repitió **26/26 nuevas y 9/9 originales**, sin bloqueantes finales. La comparación AST conserva los **54 textos y atributos visuales existentes** del Picker. Las reproducciones privadas adicionales no se suman a las 26 oficiales.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.281 pruebas correctas en 43 suites**, incluidas las 26 nuevas; lint, TypeScript y build de producción completados con código 0. Evidencia: `verify.log`.
- **597/597 archivos protegidos** conservan sus hashes; los **129 originales de distribución** están completos, incluidos los archivados fuera de Git. Evidencia: `protected.json` y `distribution.json`.
- **28/28 pruebas offline** de los helpers privados de permisos, atestación y cierre de sesión correctas. Incluyen el nuevo POST de creación denegado con plantilla ficticia en seis contextos y sus conteos exactos; no realizan red ni se suman a las pruebas de la aplicación. Evidencia: `smoke-helper-tests.log`.

Permanecen los avisos anteriores de imágenes. No se cambian dependencias, migraciones ni variables de pago.

## Producción, 20 de octubre de 2026

Código integrado en `main`: `a3c1f2778cefdf1b7200eef31170d58d651c9079`. Vercel terminó el despliegue `dpl_AzBYc3kM3J2U4KQzAVwemGK4ZYmk` en estado **READY**, destino **production**, con alias [enkarta.vercel.app](https://enkarta.vercel.app). URL inmutable: [enkarta-gp88783po](https://enkarta-gp88783po-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para conservar los originales archivados fuera de Git.

El workflow [39484859521](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39484859521) del mismo SHA completó correctamente `verify` y `audit` (`npm audit --omit=dev --audit-level=high`).

- El inventario remoto acredita por UID de contenido las **tres fuentes exactas** del Picker, la ruta `api/partner/invitations/route.ts` y el helper `partner-checkout.ts`. Los hashes constan en `production-http.json`; acreditan las entradas del despliegue Ready, sin afirmar ejecución de un POST autenticado en un navegador.
- **11 grupos HTTP correctos**, con **70 denegaciones exactas 401**, incluidas **58 solicitudes de escritura**. La matriz añade el POST de creación con plantilla ficticia en seis contextos: sin sesión, cuatro cookies inválidas y una sesión válida de administrador. Todos se rechazaron, conservando las comprobaciones anteriores de perfil, publicación, pagos y subidas. La sesión administrativa no suplanta una de Socios.
- Las lecturas administrativas siguen siendo privadas y `no-store`; el historial conserva `Vary: Cookie`. Un UUID ficticio se comprobó mediante conteo HEAD exacto antes y después, sin leer filas de clientes ni crear invitaciones. El único upload autenticado fue un formulario sin archivo ni propietario, rechazado antes del almacenamiento.
- **6/6 rutas públicas correctas**, **129/129 originales distribuidos** con hashes intactos y **597/597 archivos protegidos locales** sin cambios.
- **Cero** usuarios Auth, invitaciones, perfiles, archivos, pagos o fixtures persistentes creados o modificados; **cero** operaciones bancarias y mensajes. Se cerró y descartó la cookie temporal de administrador. No quedaron registros de prueba que eliminar.

BCP mantiene su bloqueo en el código y no se modificaron proveedor ni credenciales. El smoke HTTP no inspeccionó variables remotas del proveedor ni llamó endpoints bancarios. La validación positiva de creación, espera agotada y carreras fue local con componentes reales y transporte controlado; en producción se comprobaron fuentes, permisos y recursos. La aceptación manual autenticada permanece aplazada.

La comprobación final conjunta terminó correctamente. Evidencia privada en `tmp/partner-draft-timeout/`: `ci.json`, `deployment-final.json`, `deployment-files.json`, `production-http.json`, `production-public.json`, `protected.json` y `RESULTADO.json`. No se necesita SQL adicional.
