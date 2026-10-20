# Constructor: revisión de recursos verificable

## Problemas corregidos

El análisis de «Revisión de publicación» esperaba el transporte y su JSON sin plazo. Dos pulsaciones antes del render producían dos POST, aunque se abortara el primero. El resultado se identificaba sólo por URLs: cambiar de invitación manteniendo sus recursos conservaba la comprobación anterior. La conversión directa del JSON admitía «Verificados 999 de 999» con un único resultado y podía romper el panel si `results` era `null`.

Estos casos se reprodujeron con el panel, recolector y métricas reales en memoria, con hooks y respuestas ficticias. No se consultaron invitaciones de clientes.

## Implementación

- `requestPublicationAudit` en `src/lib/publication-audit-client.ts` limita a **25 segundos el intento completo**, incluidos transporte, JSON y validación. Comparten el plazo, sin reiniciarlo al llegar cabeceras. Una carrera con la interrupción y comprobaciones de tiempo transcurrido terminan la espera aunque fetch ignore abort o el navegador retrase su temporizador. No hay reintentos automáticos.
- Se conserva una copia de los recursos enviados. La respuesta debe contener exactamente los primeros 24 resultados, en orden y con URL, tipo, etiqueta y bloque coincidentes. Se respeta el recorte de etiquetas y bloques a 120 caracteres del servidor. Se validan tipos, números y coherencia entre `ok` y estado HTTP, y se recalculan los ocho campos del resumen antes de aceptarlo.
- El panel tiene una identidad por invitación, recursos y generación de la edición. Un cambio A→B→A no recupera una comprobación de la primera A. Un manejador retenido no actúa sobre otro contexto; una respuesta tardía no repone resultados, avisos ni errores anteriores. Las ediciones que no afectan a identidad o recursos conservan una revisión vigente.
- El bloqueo por referencia es síncrono: dos pulsaciones generan una sola consulta. Desmontar y el replay de efectos cancelan la espera y permiten una nueva acción explícita en un contexto vigente. Este POST realiza una lectura de diagnóstico; repetirlo no crea borradores, publica ni modifica la invitación.
- Un nuevo análisis retira el resultado anterior para no mostrar comprobaciones verdes mientras se espera o falla su actualización. Un error o plazo agotado termina «Analizando…», conserva un aviso y ofrece «Reintentar análisis». No declara disponibles los recursos de una respuesta incompleta o incoherente.

La ruta del servidor y su seguridad de URL, autenticación y límite de 24 recursos permanecen iguales. El módulo de solicitudes de Socios y los flujos de pagos no se modifican.

## Criterios UX/UI aplicados

Se usan **Impeccable** en modo operativo para legibilidad, estados y recuperación, y **Vercel React Best Practices** para referencias por instancia, efectos y vigencia de operaciones. No se aplican recetas de React 19 ni se actualizan dependencias.

El refinamiento se limita a «Recursos y enlaces reales»: texto principal y explicaciones de 14 px, métricas de 16 px con etiquetas de 12 px en lugar de 7 px, definición semántica de las métricas, números tabulares, distribución adaptable al ancho del panel, foco visible y un objetivo táctil de al menos 44 px. El contraste de sus estados usa texto oscuro sobre superficies claras. El progreso y resultado tienen `role="status"`; el error persistente tiene `role="alert"`, y el botón indica `aria-busy`.

El botón anuncia como máximo 24 recursos. Si existen más, el resultado explica que sólo se comprobaron los primeros 24 y la revisión completa sigue pendiente. No se presenta una comprobación parcial como si cubriera todo el documento. Sin recursos, el estado vacío indica añadir una foto, música o enlace.

Estas decisiones mejoran un bloque concreto; no certifican el diseño visual integral de todo el constructor o Socios. Esa revisión transversal y la aceptación manual de dispositivos permanecen pendientes.

## Conservación y límites

No se modifican invitaciones, renderizadores, presets, fuentes, fotografías, música, animaciones ni recursos originales. Las cuatro secciones JSX fuera del bloque de recursos conservan su estructura y estilos según comparación AST independiente.

Los resultados son diagnósticos por instancia, sólo en memoria. No se persisten ni constituyen una auditoría visual, una publicación o una medición del tiempo de carga de la invitación. El análisis continúa limitado a 24 recursos; la comprobación por lotes de todos los recursos de documentos mayores queda para una entrega propia.

BCP sigue desactivado; no se cambian proveedor, claves o variables, no se necesitan migraciones y no hay operaciones bancarias. Las pruebas manuales permanecen aplazadas. La verificación HTTP de producción distingue fuentes, permisos, recursos y respuesta de un diagnóstico vacío, sin afirmar creación o publicación autenticada desde un navegador.

## Regresiones automáticas

`scripts/test-builder-resource-audit-ui.cjs` añade **30 pruebas** del panel, recolector, métricas y nuevo helper reales, con hooks, reloj y transporte ficticios en RAM. No monta el DOM ni realiza red, autenticación, almacenamiento o descargas de recursos. Se incorpora a `npm run verify` sin sustituir las suites anteriores.

Incluye fetch y JSON suspendidos con plazo compartido, respuestas tardías y temporizador retrasado; doble acción antes del render; desmontaje, StrictMode e instancias independientes; cambios de invitación y recursos A→B→A; manejadores retenidos; informes malformados, contadores falsificados y estados HTTP contradictorios; orden, identidades y número de resultados; truncado del servidor, límite de 24, estado vacío y reintento explícito.

La suite pasa **30/30**. Su modo opcional `--baseline` sustituye únicamente el panel por la fuente de `f129c3c2c0f16332cd42ad9eff8cdbf855e16c0a`, conservando el helper actual: **21 fallos y 9 aprobadas**. La ejecución habitual no necesita Git ni historial completo. Evidencia: `tmp/builder-resource-audit/resource-audit-ui.log` y `resource-audit-baseline.log`.

La revisión independiente repitió **30/30** oficiales y **19/19** casos adicionales de compatibilidad y respuestas alteradas, incluidos cuatro con el handler real aislado. Los casos privados no se suman a las 30 oficiales. Evidencia: `tmp/builder-resource-audit-audit/REVIEW.json`, `client-contract.json`, `official-final.log` y `visual-contract.json`.

## Inspección visual automatizada y verificación local

Se renderizó el componente real a HTML con sus cuatro estados y Tailwind/globales del proyecto, en superficies de 320 y hasta 680 px. El fixture sólo contiene datos ficticios y respuestas en memoria. Se inspeccionaron conjuntamente las ocho superficies en el navegador y se repitió la medición con una configuración móvil de 390 px, cuyo ancho de documento observado fue de 384 px: sin desbordamiento horizontal del documento o de los bloques modificados. Las métricas ocupan dos columnas estrechas y cuatro amplias; el botón conserva el mínimo CSS de 44 px.

El fixture elimina el import remoto de fuentes y declara Arial como respaldo. Permite comprobar distribución y estados, sin afirmar identidad tipográfica con Outfit, integración completa del editor o aceptación en un dispositivo real. Las capturas se inspeccionaron mediante CUA; mediciones, fuentes y render quedan registrados en `tmp/builder-resource-audit/visual-layout.json` y `visual/render-evidence.json`. El fixture y su servidor son privados de prueba y no forman parte de la aplicación desplegada.

El detector mecánico de Impeccable se ejecutó una vez sobre el panel final y devolvió `[]`. Esto complementa la inspección, sin certificar todo el editor. Evidencia: `design-detector.json`.

El cálculo WCAG de nueve pares de colores del bloque, usando la paleta real de Tailwind y las superficies declaradas, supera 4,5:1 en todos los casos; el mínimo calculado es 6,47:1. Excluye controles desactivados y otras secciones. Es una comprobación de sus colores, sin certificar accesibilidad de toda la aplicación. Evidencia: `contrast.json`.

- `npm run verify`: **1.311 pruebas correctas en 44 suites**, incluidas las 30 nuevas; lint, TypeScript y build de producción finalizados con código 0. Evidencia: `verify.log`.
- **597/597 archivos protegidos** conservan sus hashes y los **129 originales de distribución** están completos, incluidos los recursos archivados fuera de Git.
- **34/34 pruebas offline** de los helpers privados de atestación, permisos y limpieza de sesión correctas. No se suman a las pruebas de la aplicación ni realizan red.

Se conservan los avisos de imágenes anteriores y no se cambian dependencias ni migraciones.

## Producción, 20 de octubre de 2026

Código integrado en `main`: `1f41f38d474e0d74bae8657429ba427d00089bae`. Vercel terminó el despliegue `dpl_9T7WwRaaDETf1CDiaCVDbbvynDNn` en estado **READY**, destino **production**, con alias [enkarta.vercel.app](https://enkarta.vercel.app). URL inmutable: [enkarta-bfkftubgb](https://enkarta-bfkftubgb-juangabrielchoqueortiz7-engs-projects.vercel.app). Se desplegó el workspace completo para conservar los originales archivados fuera de Git.

El workflow [39488150788](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39488150788) del mismo SHA completó correctamente `verify` y `audit` (`npm audit --omit=dev --audit-level=high`).

- El inventario remoto acredita por UID de contenido las **tres fuentes exactas** de `PublicationAuditPanel.tsx`, `publication-audit-client.ts` y la ruta `api/admin/publication-audit/route.ts`. Acredita entradas del despliegue Ready, sin afirmar ejecución de las carreras o temporizadores en un navegador de producción.
- **13 grupos HTTP correctos**, con **75 denegaciones exactas 401**, incluidas **63 solicitudes de escritura rechazadas**. Se conservaron las comprobaciones anteriores de cuenta, borradores, publicación, pagos y subidas. Se añadieron cinco POST de diagnóstico vacío sin sesión o con cookies inválidas de administrador, anfitrión, revisión y puerta; todos se rechazaron antes de analizar recursos.
- Una cookie administrativa válida realizó **un análisis con lista vacía**: `results: []` y los ocho contadores a cero. No se enviaron URLs ni se ejecutaron sondas de recursos. Esta respuesta positiva comprueba el contrato del diagnóstico; no acredita un análisis de recursos completo desde el editor autenticado.
- La configuración administrativa y el historial privado mantienen sus políticas de privacidad, con `Vary: Cookie` en el historial. Un UUID ficticio se comprobó mediante conteos HEAD exactos antes y después, sin leer filas de clientes. El único upload autenticado fue un formulario sin archivo ni propietario, rechazado antes del almacenamiento.
- **6/6 rutas públicas correctas**, **129/129 originales distribuidos** con tamaño y hashes intactos y **597/597 archivos protegidos locales** sin cambios.
- **Cero** usuarios Auth, invitaciones, perfiles, archivos, pagos o fixtures persistentes creados o modificados; **cero** operaciones bancarias y mensajes. Se cerró y descartó la cookie temporal administrativa. No quedaron registros de prueba que retirar. También se detuvieron el servidor de fixture y su pestaña temporal.

BCP conserva su bloqueo y no se modificaron proveedor ni credenciales. El smoke no inspeccionó variables remotas del proveedor ni llamó endpoints bancarios. La aceptación manual permanece aplazada; tampoco se afirma una revisión tipográfica exacta o una aceptación de Android/Safari por las capturas del fixture.

La comprobación final conjunta terminó correctamente. Evidencia privada en `tmp/builder-resource-audit/`: `ci.json`, `deployment-final.json`, `deployment-files.json`, `production-http.json`, `production-public.json`, `protected.json` y `RESULTADO.json`. No se necesita SQL adicional.
