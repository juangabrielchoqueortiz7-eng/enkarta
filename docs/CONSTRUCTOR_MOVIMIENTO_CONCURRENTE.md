# Ajustes de movimiento y conservación de cambios

## Problema y corrección

MotionPanel reconstruía toda la configuración y el objeto de movimiento desde el render que creó cada control. Dos ajustes consecutivos podían sobrescribirse antes del siguiente render, y un control retenido podía restituir música, galería u otros valores anteriores. El botón Restaurar también copiaba esa configuración obsoleta.

El panel reutiliza ahora useLegacyDraft. Cada ajuste fusiona exclusivamente sus campos sobre el movimiento vigente; Restaurar reemplaza únicamente motion por un objeto vacío, conservando el resto de la configuración actual. InvitationBuilder conecta su referencia de datos y su revisión de edición existentes, de modo que se reconocen también cambios del padre anteriores al próximo render.

Las acciones de una invitación, plantilla, variante de diseño o revisión de edición anterior se descartan. Deshacer, rehacer y reemplazar el documento reutilizan la invalidación que ya tenía el constructor. No se añade un sistema de conflictos entre dispositivos ni se cambia el guardado en el servidor.

## Alcance y conservación

- Solo cambian MotionPanel y las propiedades de su instancia en InvitationBuilder. El borrador compartido y el renderizador de movimiento permanecen intactos.
- Se conservan presets, controles, valores iniciales, rangos, conversiones, textos, acceso por plantilla, estilos y miniaturas animadas. No se sustituyen efectos ni animaciones originales.
- No requiere SQL, dependencias, estilos globales ni cambios de los renderizadores o recursos de las invitaciones. BCP permanece bloqueado.

Skill aplicada: vercel-react-best-practices, en particular actualizaciones basadas en el estado vigente, reutilizando referencias locales del editor y manteniendo compatibilidad con React 18. No se introducen cachés globales de datos privados.

## Verificación automática y límites

La suite scripts/test-builder-motion-ui.cjs ejecuta MotionPanel y useLegacyDraft reales con borradores ficticios en memoria y hooks controlados. Contrasta controles consecutivos, cambios externos, restauración y callbacks obsoletos. Las pruebas de la referencia anterior reproducen las pérdidas que corrige esta entrega. Resultado: **24/24 pruebas nuevas correctas**; la referencia anterior 828384fcc5a5ec12b3918bbddde6451dc384826b produce **7 aciertos y 17 fallos**. La ejecución habitual de CI no requiere Git.

El arnés de hooks no equivale a una prueba de ReactDOM, animación al desplazarse o aceptación móvil. Las pruebas manuales permanecen aplazadas por indicación del usuario.

## Verificación de producción

La comprobación técnica contrasta las cinco fuentes críticas del despliegue Ready, permisos HTTP y hashes de originales publicados. Usa un identificador ficticio inexistente, solicitudes denegadas y lecturas acotadas. No realiza una edición de movimiento autenticada desde el navegador ni escribe invitaciones de clientes.

Evidencia privada: tmp/builder-motion/. RESULTADO.json reúne CI, despliegue, fuentes exactas, contadores, cierre de sesión y conservación de originales. No se crean usuarios, archivos, pagos ni mensajes de prueba persistentes; el cierre de sesión temporal se verifica al terminar. La comprobación final se completó con los resultados que se detallan a continuación.

## Validación local final

- **1.624 pruebas correctas en 54 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. Se conservan las advertencias previas de imágenes en otros componentes.
- Revisión independiente de las dos fuentes y el arnés sin bloqueantes. MiniPreview, Section y MINI_CSS permanecen iguales; se conservan íntegramente **41 atributos de clases en MotionPanel y 128 en InvitationBuilder**.
- **46/46 comprobaciones sin red** del verificador privado de producción y revisión independiente de sus cinco scripts.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 originales**. La modificación local preexistente de la migración 021 queda fuera de los commits.

## Despliegue y comprobaciones de producción

Código de aplicación **67b7e46bcfbb2f39fdfc0a6680ee9838c0879c2c**, integrado en main. Vercel confirma **Ready** para **dpl_DPTThXYauHbrpjhvaHnj6mqeyFbj**, publicado en [Enkarta](https://enkarta.vercel.app). [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39548133214) completada con éxito: npm run verify y auditoría de dependencias de producción.

- **Cinco fuentes exactas contrastadas** con los UID de entrada del despliegue y sus SHA-256: MotionPanel, InvitationBuilder, useLegacyDraft, scroll-motion y el adaptador BCP bloqueado.
- **17 grupos HTTP correctos**, **105 respuestas 401**, incluidas **78 solicitudes de escritura denegadas**, y **10 GET de invitados/analítica rechazados con 403**. No se consulta analítica con una sesión válida ni se solicita su operación de retención.
- El UUID ficticio se verificó ausente por HEAD antes y después. Las consultas protegidas correspondientes devolvieron resultados vacíos o rechazos exactos, sin leer filas de clientes ni modificar invitaciones. La subida autenticada sin archivo devolvió 400 antes del bucket; la auditoría de recursos vacía no recibió URL alguna.
- **129/129 originales publicados idénticos por bytes y SHA-256**, **6/6 rutas correctas** y **597/597 archivos protegidos locales intactos**.
- **Cero datos de negocio escritos, usuarios creados, archivos almacenados, pagos, llamadas bancarias o mensajes enviados**. Se cerró la sesión temporal de administrador; no quedaron fixtures persistentes que limpiar. No se registraron credenciales ni cookies.

BCP conserva el bloqueo en sus fuentes y su configuración local desactivada. No se inspeccionó el valor remoto del proveedor ni se realizaron operaciones bancarias. No se requiere SQL nuevo y la modificación local preexistente de la migración 021 permanece fuera de los commits.

La conservación de ediciones se comprueba localmente con el panel y el borrador reales. La verificación remota acredita fuentes, permisos y originales; **no realiza una edición de movimiento autenticada ni reproduce sus animaciones en un navegador de producción**. La aceptación visual y móvil permanece aplazada por indicación del usuario.
