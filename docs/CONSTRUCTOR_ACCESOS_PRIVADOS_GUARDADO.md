# Guardado de accesos privados

## Problema y alcance

El formulario de accesos de revisión, gestión y puerta dependía de `disabled={saving}` para evitar dobles envíos. Antes del siguiente render, dos invocaciones del mismo botón podían iniciar dos POST. Además, una respuesta antigua borraba incondicionalmente el campo de contraseña, incluso si el usuario había escrito otra durante la espera.

La corrección se limita a `ServiceAccessPanel`: bloqueo inmediato por formulario, captura de los valores que se envían, conservación de ediciones posteriores y aislamiento entre invitaciones y tipos de acceso. Los campos siguen siendo editables durante el guardado. Un éxito requiere la confirmación explícita `{ok:true}`; un resultado sin confirmar no equivale a una reversión del servidor y no provoca reenvío automático.

La contraseña permanece únicamente en la memoria del formulario montado y en la solicitud necesaria para guardarla. No se incorpora a almacenamiento del navegador, URL, informes de producción ni registros. La consulta de metadatos devuelve solo correo, existencia de contraseña y fecha límite: no puede demostrar qué contraseña quedó guardada.

## Límites

- El bloqueo es local al formulario montado. No añade idempotencia, versiones o resolución de conflictos entre pestañas o dispositivos en el servidor.
- No se agregan reintentos automáticos. Una conexión pendiente mantiene el bloqueo hasta que su promesa termina; esta entrega no introduce un plazo máximo ni un mecanismo de reconciliación de escrituras inciertas.
- Los permisos y la validación de los paquetes siguen en el endpoint existente. Cada acceso mantiene su alcance independiente.
- No requiere SQL ni dependencias nuevas. BCP continúa bloqueado; no se modifican pagos, renderizadores, presets, estilos globales ni recursos originales.

Skill aplicada: `vercel-react-best-practices`, con referencias para valores actuales y exclusión inmediata, sin cachés globales de datos privados ni APIs exclusivas de React 19.

## Regresiones automáticas

Las regresiones ejecutan el componente real con transporte controlado y datos ficticios: dobles pulsaciones antes del render, ediciones durante respuestas demoradas, contraseña editada y restaurada al mismo valor, contexto desmontado, respuestas inválidas y separación de accesos. La suite se integra en `npm run verify`.

`scripts/test-service-access-ui.cjs`: **37/37 pruebas correctas**. La ejecución de referencia usa exclusivamente el componente anterior del commit `542d2b1e33df09bc266e8b47aa2e1593ab1bd969`: **11 aciertos y 26 fallos**, reproduciendo los defectos anteriores. La ejecución habitual de CI no requiere Git.

El arnés transpila el componente real y ejecuta sus hooks con respuestas y ciclos controlados; comprueba también las claves del panel completo, aislamiento de los tres formularios y retirada del servicio mediante un paquete real. Registra y rechaza cualquier transporte fuera de la lista ficticia, observa escrituras tardías y detecta intentos de almacenamiento del navegador. Las contraseñas de prueba se generan aleatoriamente en memoria y las aserciones evitan imprimir sus valores.

En producción se contrastan las fuentes exactas del despliegue Ready, la protección de GET/POST de los tres accesos y el rechazo de un identificador ficticio cuya ausencia se comprueba antes y después. No se envía ninguna contraseña en esa comprobación, ni se modifica una invitación real. Se comprueban también los hashes de los originales publicados. Estas pruebas técnicas no sustituyen la aceptación manual del editor autenticado, que queda aplazada.

Evidencia privada: `tmp/service-access-save/`. `RESULTADO.json` contrasta automáticamente CI, fuentes del despliegue, contadores de pruebas, limpieza y conservación de originales.

## Validación local final

- **1.542 pruebas correctas en 51 ejecuciones de suites**, lint, TypeScript y build con **65 páginas generadas**, salida 0. La versión final no introduce advertencias en `ServiceAccessPanel`; permanecen las advertencias previas de otros componentes.
- **40/40 comprobaciones sin red** del verificador privado de producción y revisión independiente sin bloqueantes de sus solicitudes y limpieza.
- Revisión independiente de fuente y regresiones sin bloqueantes. Los 21 atributos de clases existentes se conservan; el botón añade `aria-busy` y la interfaz distingue datos enviados de ediciones posteriores.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución local completa de **129 originales**.
- Una primera validación completa también pasó, pero detectó una advertencia del analizador de hooks. Se sustituyó el incremento abreviado de la generación por una asignación explícita equivalente, sin silenciar reglas; se repitió la validación completa para esa fuente final.

## Producción y limpieza

Código de aplicación **`30f42b441b1875e22e97edc9a77132768df70e17`**, integrado en `main`. Vercel confirma **Ready** para **`dpl_ANS7EtCYiKsz2nxyek1URho7ZKa3`**, publicado en [Enkarta](https://enkarta.vercel.app). [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39539013674) completada con éxito: `npm run verify` y auditoría de dependencias de producción.

- Correspondencia exacta por UID de las tres fuentes cargadas al despliegue: `ServiceAccessPanel.tsx`, la ruta `host-credentials` sin modificaciones y el adaptador BCP bloqueado. Se contrastaron también sus SHA-256 locales.
- **15 grupos HTTP correctos**, con **105 respuestas 401** y **78 solicitudes de escritura denegadas**. Incluyen 30 GET/POST de los accesos de revisión, gestión y puerta con sesiones ausentes o inválidas.
- Para el administrador autenticado, **seis GET/POST adicionales** de esos accesos devuelven exactamente 404 e «Invitación no encontrada». El UUID ficticio se verificó ausente con consultas HEAD antes, inmediatamente antes de esas solicitudes y al finalizar. Los cuerpos de acceso no contienen contraseña ni fecha límite; el servidor rechaza antes de construir o escribir cambios.
- **129/129 recursos originales publicados idénticos por bytes y SHA-256**, **6/6 rutas comprobadas correctas** y **597/597 archivos protegidos locales intactos**.
- **Cero datos de negocio escritos, usuarios creados, archivos almacenados, pagos, llamadas bancarias o mensajes enviados**. La sesión temporal de administrador se cerró y no quedan fixtures persistentes que limpiar. El inicio de sesión normal sí utiliza la contraseña de administrador en memoria, sin registrarla.

BCP conserva el bloqueo de sus fuentes y su configuración local desactivada; no se inspeccionó el valor remoto del proveedor ni se realizaron operaciones bancarias. No se ejecutó SQL nuevo.

Las regresiones de concurrencia ejecutan localmente el componente real con un modelo controlado de hooks, sin ReactDOM ni navegador físico. La comprobación remota acredita despliegue, permisos e inexistencia del objetivo ficticio; **no prueba un guardado positivo de credenciales ni la interacción del editor autenticado en un celular**. La aceptación manual queda aplazada. Siguen abiertos el plazo máximo de una solicitud pendiente y la idempotencia o los conflictos entre pestañas/dispositivos descritos en los límites.
