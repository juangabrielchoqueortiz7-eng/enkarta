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

Evidencia privada: tmp/builder-motion/. RESULTADO.json reúne CI, despliegue, fuentes exactas, contadores, cierre de sesión y conservación de originales. No se crean usuarios, archivos, pagos ni mensajes de prueba persistentes; el cierre de sesión temporal se verifica al terminar. Los resultados remotos de esta entrega se incorporan después de completar el despliegue.

## Validación local final

- **1.624 pruebas correctas en 54 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. Se conservan las advertencias previas de imágenes en otros componentes.
- Revisión independiente de las dos fuentes y el arnés sin bloqueantes. MiniPreview, Section y MINI_CSS permanecen iguales; se conservan íntegramente **41 atributos de clases en MotionPanel y 128 en InvitationBuilder**.
- **46/46 comprobaciones sin red** del verificador privado de producción y revisión independiente de sus cinco scripts.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 originales**. La modificación local preexistente de la migración 021 queda fuera de los commits.
