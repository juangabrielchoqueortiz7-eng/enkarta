# Ajustes de estilo y conservación de cambios

## Problema y corrección

StylePanel reconstruía la configuración desde el render que creó cada control. Cambiar fuentes, colores, formas o escalas en una misma secuencia podía restituir valores anteriores. Los kits visuales y la limpieza también calculaban sus parches desde una invitación capturada, con riesgo de perder contenido reciente.

La corrección reutiliza useLegacyDraft y conecta las referencias existentes del constructor: el borrador vigente y la revisión de edición. Cada ajuste toma los valores actuales antes de componer su parche, incluyendo theme, tokens y la escala tipográfica anidada. Las acciones de kits trabajan con la invitación actual. Los callbacks de una invitación o revisión anterior se descartan. La confirmación de limpieza se vincula al documento y a su revisión: cambiar de plantilla, deshacer o reemplazar el documento exige volver a solicitarla. Cancelar, aplicar un kit o confirmar consume esa autorización local antes del siguiente render.

Se conservan las acciones explícitas de aplicar un kit y normalizar el diseño con confirmación: reemplazan los estilos que esas funciones ya reemplazaban. El objetivo de esta entrega es evitar que también restauren contenido o configuración anteriores. No se añade resolución de conflictos entre dispositivos ni se modifica el guardado del servidor.

## Alcance y conservación

- Solo cambian StylePanel y las propiedades de su instancia en InvitationBuilder. Las librerías de kits, auditoría, almacenamiento local de kits y valores por plantilla permanecen intactas.
- Se conservan catálogos, fuentes, paletas, vistas previas, clases, textos, rangos y diseños originales. No se descargan ni sustituyen recursos.
- No requiere SQL, dependencias ni estilos globales. BCP permanece bloqueado.

Skill aplicada: vercel-react-best-practices, con actualizaciones sobre el estado vigente y referencias locales compatibles con React 18. No se crean cachés globales de información privada.

## Verificación automática y límites

La suite scripts/test-builder-style-ui.cjs ejecuta el panel y el borrador reales con datos ficticios, hooks controlados y almacenamiento aislado. Las pruebas manuales visuales y móviles permanecen aplazadas por indicación del usuario. El arnés no equivale a ReactDOM ni acredita una edición visual en un dispositivo real.

La referencia anterior se utiliza únicamente en la comprobación local de regresión; la ejecución normal de CI no requiere Git. Resultado: **28/28 pruebas nuevas correctas**. La referencia anterior 28d1199f6a200724fa99105c557e933526cfc61e produce **3 aciertos y 25 fallos**. Se verifica el panel real y sus librerías con datos en RAM, incluyendo contenido actualizado, permisos vigentes, fuente Original, borrado de kits, confirmación por contexto y consumo antes del render.

## Verificación de producción

Se contrastan ocho fuentes críticas del despliegue Ready, permisos HTTP y hashes de los originales publicados. La comprobación remota usa un identificador ficticio inexistente y solicitudes acotadas; no realiza una edición de estilo autenticada desde el navegador ni escribe invitaciones de clientes.

La evidencia privada se guarda en tmp/builder-style/. RESULTADO.json reúne CI, fuentes publicadas, resultados, cierre de sesión y conservación de originales. No se crean usuarios, archivos, pagos ni mensajes persistentes; las credenciales de la sesión temporal no se registran.

## Validación local final

- **1.652 pruebas correctas en 55 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. Permanecen las advertencias previas de imágenes de otros componentes.
- Revisión independiente de las dos fuentes y la suite sin bloqueantes. El retorno JSX, sus textos, **123 atributos de clases y 17 estilos inline de StylePanel** son idénticos, excepto los callbacks de eventos. Las constantes y catálogos siguen intactos; el constructor sólo añade las dos referencias a StylePanel.
- **46/46 comprobaciones sin red** del verificador privado de producción y revisión independiente de sus cinco scripts.
- **597 archivos protegidos sin cambios** por SHA-256 y distribución completa de **129 originales**. La modificación local preexistente de la migración 021 queda fuera de los commits.

## Despliegue y comprobaciones de producción

Código de aplicación **ddd5e5f83ccd5c96d64bb77cf3f453be9d0c170d**, integrado en main. Vercel confirma **Ready** para **dpl_DdmSfwtzBEGU41wxgZYFmaz49EZJ**, publicado en [Enkarta](https://enkarta.vercel.app). [CI del mismo commit](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39549714459) completada con éxito: npm run verify y auditoría de dependencias de producción.

- **Ocho fuentes exactas contrastadas** con sus UID de entrada del despliegue y SHA-256: StylePanel, InvitationBuilder, useLegacyDraft, design-kits, design-audit, user-design-kits, template-themes y el adaptador BCP bloqueado.
- **17 grupos HTTP correctos**, **105 respuestas 401**, incluidas **78 solicitudes de escritura denegadas**, y **10 GET de invitados/analítica rechazados con 403**. No se consulta analítica con una sesión válida ni se solicita su operación de retención.
- El UUID ficticio se comprobó ausente por HEAD antes y después. Las consultas protegidas devolvieron resultados vacíos o rechazos exactos, sin leer filas de clientes ni modificar invitaciones. La subida autenticada sin archivo devolvió 400 antes del bucket; la auditoría vacía no recibió URL alguna.
- **129/129 originales publicados idénticos por bytes y SHA-256**, **6/6 rutas correctas** y **597/597 archivos protegidos locales intactos**.
- **Cero datos de negocio escritos, usuarios creados, archivos almacenados, pagos, llamadas bancarias o mensajes enviados**. Se cerró la sesión temporal de administrador; no quedaron fixtures persistentes que limpiar. No se registraron credenciales ni cookies.

BCP conserva el bloqueo de sus fuentes y su configuración local desactivada. No se inspeccionó el valor remoto del proveedor ni se realizaron operaciones bancarias. No se requiere SQL nuevo; la modificación local preexistente de la migración 021 permanece fuera de los commits.

La conservación de ediciones se comprueba localmente con StylePanel, el borrador y las librerías reales, con almacenamiento aislado en RAM. La comprobación remota acredita fuentes publicadas, permisos y originales; **no realiza una edición de estilo autenticada ni guarda kits en un navegador de producción**. La aceptación visual y móvil permanece aplazada por indicación del usuario.
