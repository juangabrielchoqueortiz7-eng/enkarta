# Ajustes de decoración y conservación de cambios

## Problema y corrección

DecorPanel reconstruía la configuración y los grupos anidados desde el render de cada control. Dos ajustes consecutivos podían sobrescribirse; los interruptores repetían un valor calculado anteriormente. La paleta nocturna y los adornos también podían restaurar valores anteriores después de desactivarlos.

La corrección reutiliza useLegacyDraft y las referencias de borrador y revisión de edición existentes del constructor. Las actualizaciones fusionan únicamente los campos pedidos sobre la configuración actual. Los interruptores calculan el siguiente estado desde los valores actuales, manteniendo los defaults originales de las invitaciones por bloques y de Azure heredada.

Restaurar diseño original reinicia únicamente theme; usar los tres colores de marca toma sus valores actuales. Los detalles de una rama recién desactivada y los callbacks de un documento o revisión anteriores se descartan. No se añade resolución de conflictos entre dispositivos ni se modifica el guardado del servidor.

## Alcance y conservación

- Solo cambian DecorPanel y las propiedades de su instancia en InvitationBuilder. El borrador compartido y el renderizador de decoración permanecen intactos.
- Se conservan exactamente THEME_DEFAULTS local, plantillas habilitadas, condiciones de layout, opciones, valores iniciales, clases, textos y rangos. Los defaults de este panel no se sustituyen por otros catálogos.
- No se descargan ni sustituyen recursos, animaciones o diseños de las invitaciones. No se cambian estilos globales, dependencias, SQL ni permisos del servidor. BCP permanece bloqueado.

Skill aplicada: vercel-react-best-practices, con actualizaciones sobre el estado vigente y referencias locales compatibles con React 18. No se crean cachés globales de datos privados.

## Verificación automática y límites

La suite scripts/test-builder-decor-ui.cjs ejecuta DecorPanel y useLegacyDraft reales con datos ficticios en memoria y hooks controlados. Contrasta las pérdidas del componente anterior y la conservación de cambios actuales. La ejecución normal de CI no requiere Git; la referencia anterior se usa únicamente en la comprobación local de regresión.

El arnés no equivale a ReactDOM, al movimiento visual de las partículas o a la aceptación en un dispositivo real. Las pruebas manuales visuales y móviles permanecen aplazadas por indicación del usuario. La suite nueva obtiene **28/28 pruebas correctas**. La referencia anterior 5c8155dd9a9f16d6b7749bb32c076b38d0b6eade produce **2 aciertos y 26 fallos**. Se verifican paletas, grupos anidados, toggles consecutivos, modo noche, restauración, marca y contextos obsoletos sin red, almacenamiento ni renderizadores de invitación.

## Verificación de producción

Se contrastan cinco fuentes críticas del despliegue Ready, permisos HTTP y hashes de originales publicados. Las solicitudes remotas se limitan a un identificador ficticio inexistente y operaciones acotadas; no se edita decoración desde un navegador de producción ni se escriben invitaciones de clientes.

La evidencia privada se guarda en tmp/builder-decor/. RESULTADO.json reúne CI, fuentes exactas, resultados, cierre de sesión y conservación de originales. No se crean usuarios, archivos, pagos ni mensajes persistentes; las credenciales de la sesión temporal no se registran.

## Validación local final

- **1.680 pruebas correctas en 56 ejecuciones**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. Permanecen las advertencias previas de imágenes en otros componentes.
- Revisión independiente de las dos fuentes y la suite sin bloqueantes. El retorno JSX, sus textos y **48 atributos de clases de DecorPanel** son idénticos salvo los callbacks. PREMIUM, THEME_DEFAULTS, los cuatro helpers visuales y los seis colores/literales nocturnos permanecen iguales. InvitationBuilder sólo añade las dos referencias al panel.
- **46/46 comprobaciones sin red** del verificador privado de producción y revisión independiente de sus cinco scripts.
- **597 archivos protegidos sin cambios** por SHA-256 y distribución completa de **129 originales**. La modificación local preexistente de la migración 021 queda fuera de los commits.
