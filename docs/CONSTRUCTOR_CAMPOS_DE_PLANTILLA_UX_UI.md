# Constructor: campos específicos de plantilla

## Alcance

Este refinamiento continúa la revisión UX/UI del constructor en `src/components/admin/builder/panels/TemplateContentFields.tsx`. Corrige la presentación y la semántica de sus campos nativos: etiquetas, ayudas, agrupación de padrinos y cuentas, jerarquía, lectura, foco y disposición en el inspector.

El archivo contiene siete ramas de campos nativos que atienden doce claves de plantilla: Lunaria, Áurea, Verdealma, Nocturna, Seda, Atlas y la familia que comparte los campos de Oliva. Además conserva diez delegaciones a editores específicos, la indicación de edición por bloques de Marfil Vivo y el retorno vacío de las plantillas no soportadas.

La revisión no modifica esos editores delegados, el lienzo de vista previa ni las invitaciones públicas. No altera presets, fuentes, colores, fotografías, música, animaciones o recursos originales de las invitaciones. La lógica de campos, normalizaciones, listas y permisos mantiene su contrato anterior; los riesgos heredados fuera del alcance se detallan más adelante.

## Skills y criterio

- **Impeccable**, en modo Operate: continuidad con el panel Datos ya refinado, jerarquía discreta, separación de grupos y controles consistentes.
- **Web Design Guidelines de Vercel**: asociación de etiquetas y ayudas, controles nativos, foco visible, áreas táctiles, contraste y adaptación al espacio disponible. Referencia: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
- **Vercel React Best Practices**: conservación del borrador compartido, guardas de identidad y callbacks existentes, sin introducir consultas o estado privado global.

Se mantuvo el contexto de `PRODUCT.md`, `DESIGN.md` y `docs/SKILLS_ENKARTA.md`, con React 18, Next.js 15 y Tailwind CSS 3. Las skills orientan esta revisión; no sustituyen las comprobaciones ni certifican por sí solas la experiencia completa.

## Problemas y correcciones

| Problema | Corrección |
| --- | --- |
| `Field` mostraba una etiqueta separada del control sin asociación nativa. | La etiqueta envuelve exclusivamente su texto y su control. Los 72 usos originales se conservan y las listas incorporan seis usos adicionales: 78 sitios, cada uno con un único control nativo. |
| Las cinco ayudas aparecían como texto próximo al campo, sin relación accesible explícita. | Cada ayuda tiene un identificador y el control correspondiente la referencia mediante `aria-describedby`. La ayuda se mantiene fuera de la etiqueta para separar nombre y descripción. |
| Los títulos de colección utilizaban encabezados pequeños y tonos débiles. | `Wrapper` es una sección con h3, texto de 14 px y contraste coherente con el resto del constructor. No se convierte en una etiqueta que abarque varios campos. |
| Los campos carecían de nombres nativos y se presentaban con texto de 14 px y bordes discretos. | Se añaden nombres, tipos apropiados y autocompletado controlado. Los campos pasan a 16 px, alto mínimo de 44 px, borde más identificable y foco visible. |
| Padrinos y cuentas se presentaban bajo etiquetas de grupo desasociadas, con varios controles sin nombre y pequeños botones de quitar. | Dos grupos de padrinos y uno de cuentas usan `fieldset` y `legend`. Rol, nombres, titular y datos de cuenta reciben etiquetas individuales numeradas; eliminar identifica su fila en el nombre accesible. Agregar y eliminar conservan sus acciones y mejoran su área táctil. |
| Las parejas de campos y las filas de cuentas competían por el ancho del inspector. | Los contenedores pueden reducirse y los campos ocupan su ancho disponible. Las filas de lista se apilan; las parejas de campos pasan a una columna en los tamaños pequeños antes de su breakpoint existente de dos columnas. |
| El título «Textos de la colección Oliva» se mostraba también para otras cinco plantillas con los mismos campos. | La rama compartida utiliza «Textos de la colección», evitando atribuirles la identidad de otra colección. No se cambian nombres del catálogo ni contenidos guardados. |
| La indicación de Marfil Vivo resultaba pequeña frente a la escala del panel refinado. | Se aumenta su tamaño y altura de línea conservando íntegro el texto que indica editar mediante la vista previa o Bloques. |

La revisión independiente comprobó que ninguna etiqueta incluye dos controles o un botón de eliminar. Las cinco relaciones de ayuda apuntan al identificador del párrafo correspondiente y son únicas dentro de la instancia activa que utiliza el constructor. Los editores delegados no se incluyen en esa afirmación: mantienen sus propiedades e implementación anteriores.

## Tipos de campo y datos conservados

Los campos de enlace o imagen ofrecen semántica nativa de URL, pero mantienen las mismas expresiones de valor y cambio. No se añade un `form`, `required`, `pattern`, `checkValidity` o `reportValidity` que bloquee las rutas relativas de recursos ya admitidas. La apariencia de un teclado de URL no se utiliza como validación de negocio ni transforma el dato guardado.

Los números y descripciones de cuentas siguen siendo texto: conservan ceros iniciales, prefijos, espacios, nombres de banco y separadores. No se convierten a un tipo numérico ni se interpreta el contenido como una operación bancaria. Los textos multilínea de nombres de padrinos permanecen intactos; las listas de instrucciones de vestimenta mantienen su recortado y eliminación de líneas vacías anteriores.

La fuente final comprobada tiene SHA-256 `4a5d6735ae48db1d6da95f566910ff07a04db5ccdd84d2665d51411d58e98f44`, frente a la revisión de referencia `de1707876cf5b27d80bc2d8df63576309acd4dfd`.

La comparación AST del autor y la revisión independiente confirman:

- Las **18 condiciones de selección de ramas** y las declaraciones funcionales se conservan, incluido el orden de las delegaciones y la primera selección de Clean Designs.
- Las **88 expresiones `onChange`, 6 `onClick`, 78 valores, 36 atributos `rows`, 77 placeholders y 3 claves de fila** permanecen idénticos. Las expresiones de las cinco ayudas originales también se mantienen.
- Los diez subárboles de editores delegados conservan datos, borrador compartido y callbacks. No se homogeneiza su interfaz desde este archivo.
- Los siete usos de `Wrapper` permanecen. El único cambio factual de su título es el de la rama compartida descrita arriba; la indicación de Marfil Vivo conserva sus palabras.
- No se añaden límites de negocio, consultas, subidas, persistencia o funciones de pago.

Se calcularon contrastes de colores sólidos de la presentación: texto de campo 14,18:1, etiquetas 9,12:1, ayudas 6,87:1, placeholders 5,31:1, borde sobre blanco 3,75:1 y texto de eliminar 6,47:1. Estos cálculos verifican las combinaciones analizadas; no equivalen a una certificación del contraste de toda la plataforma. El detector de Impeccable no registra hallazgos, sin cambiar su configuración.

Evidencia local: `tmp/template-fields-ux/template-field-invariants.json`, `final-review.json` y `template-fields-detector.json`.

## Pruebas automáticas del bloque

La suite final de `scripts/test-template-fields-ux-ui.cjs` registra **28 pruebas aprobadas y 0 fallos**. Se incorpora a `npm run verify` como `test:template-fields-ux-ui`. Utiliza `TemplateContentFields` y `useLegacyDraft` reales, con hooks y datos ficticios en memoria y editores hijos aislados.

Los casos recorren las doce claves nativas, sus nombres de campo y encabezados, las cinco ayudas, grupos y acciones de lista. Comprueban enlaces relativos, cuentas como texto, cambios secuenciales de configuración, separación entre el mensaje principal y `config`, instrucciones de vestimenta, valores multilínea, listas vacías y agregado o eliminación de una fila actual. También conservan las guardas ante cambio de propietario, plantilla, clave de diseño o revisión heredada y las diez delegaciones existentes.

La misma suite sobre la revisión de referencia registra **19 aprobadas y 9 fallos**. El arnés registra todos los intentos HTTP, incluidos los errores que pudiera capturar el componente; una comprobación negativa privada confirma que una solicitud ficticia no autorizada sigue haciendo fallar la comprobación final. No se utiliza red real.

Los casos de listas comprueban acciones sobre la fila y el estado actuales. No acreditan la resolución del riesgo de callbacks antiguos tras cambios estructurales de lista, que se conserva fuera del alcance de este refinamiento.

Evidencia: `tmp/template-fields-ux/template-fields-ux-ui.log`, `template-fields-ux-ui-baseline.log` y `harness-negative-proof.log`. La verificación integral y la publicación se registrarán cuando queden confirmadas.

## Inspección visual y límites

El manifiesto contiene trece escenas: Lunaria, Áurea, Verdealma, Nocturna, colección compartida, Seda, Atlas, listas de padrinos y cuentas vacías, contenidos largos, cuentas largas, indicación de Marfil Vivo y una delegación aislada. Declara la misma fuente final comprobada y el CSS del proyecto.

La inspección realizó **65 comprobaciones**, correspondientes a las trece escenas en anchos de **320, 390, 768, 1200 y 1280 px**. En esos casos no se encontraron desbordamientos, campos sin etiqueta, áreas táctiles menores de 44 px, identificadores duplicados o referencias de ayuda rotas. La medición táctil admite una tolerancia de 0,2 px por redondeo subpíxel. Los campos medidos utilizan 16 px de fuente. La confirmación a 1200 px cubre el inicio de las columnas antes de que el inspector alcance su ancho `xl`.

La comparación con la fuente anterior realizó seis comprobaciones a 390 y 1280 px: Verdealma presentaba 14 campos sin nombre accesible, Atlas 9 y Seda 20, con campos de 14 px. En la fuente corregida, pulsar nativamente «Vestimenta — mujeres» enfocó `template-dress-women`, conservó su valor y mantuvo la descripción `passport-dress-women-hint` con el texto correspondiente. Las capturas de móvil, listas y panel a 1200 px no requirieron cambios posteriores de aplicación.

Las fixtures reproducen los anchos reales del inspector y el rail de herramientas de 88 px, pero utilizan datos ficticios y fuentes de sistema. Los diez editores delegados son componentes aislados explícitos; no se renderizan invitaciones originales. No hay datos de clientes, solicitudes remotas u operaciones bancarias. No se afirma una aceptación visual de la tipografía original, los hijos delegados o el lienzo público.

La revisión de código confirma campos reducibles y de ancho completo, filas apiladas y ayudas que pueden cambiar de línea. La evidencia de tamaño y disposición corresponde a los casos enumerados, no a todos los contenidos o navegadores posibles. Resultados y manifiesto: `tmp/template-fields-ux/visual-review.json` y `visual-after/manifest.json`.

Las pruebas manuales en Android físico y la aceptación con tecnologías de asistencia permanecen aplazadas por solicitud del usuario.

## Riesgos heredados fuera de este cambio

Se documentan dos comportamientos existentes para un bloque lógico posterior; no fueron introducidos ni corregidos por el refinamiento visual:

- **Padrinos y cuentas usan arrays capturados e índices.** `setSponsor`, `setAcct`, agregado y eliminación mantienen sus expresiones y claves por índice. Un callback retenido después de agregar o eliminar puede operar sobre la colección capturada y restaurar o reemplazar una lista anterior. Las guardas de propietario y revisión del borrador no convierten esas filas en identidades estables.
- **La descripción de hospedaje sustituye el array por su primer hotel.** Conserva el objeto y sus medios del primer elemento, pero no garantiza conservar hoteles adicionales. Esta transformación anterior se mantiene y necesita una corrección específica si se admite más de un hospedaje.

El recortado de las instrucciones de vestimenta y la exclusión de líneas vacías también permanecen como normalizaciones existentes. No se presentan como defectos nuevos ni se cambian durante una tarea de etiquetas y estilos.

## Conservación de originales y pagos

La comprobación local conserva **597 archivos protegidos sin cambios** y verifica la distribución completa de **129 recursos originales**, sin incidencias. No se descargan, regeneran, recomprimen o sustituyen recursos. Evidencia: `tmp/template-fields-ux/protected.json` y `distribution.json`.

**BCP permanece desactivado.** Los campos de cuenta o QR de regalo son contenido de la invitación; no habilitan una pasarela ni realizan cobros o transferencias. No se cambian credenciales, variables de entorno, proveedor, precios, cupos o permisos. No se requiere una migración SQL adicional.

## Cierre de verificación y publicación

Los resultados finales se incorporarán después de confirmarlos. Los datos locales anteriores no acreditan todavía que esta revisión esté desplegada en producción.

| Comprobación | Resultado |
| --- | --- |
| Suite final del bloque y comparación con la referencia | 28/28; referencia: 19 aprobadas y 9 fallos |
| Inspección visual en navegador y medidas | 65 comprobaciones: 13 escenas y 5 anchos; sin incidencias de desbordamiento, etiquetas, áreas táctiles o ayudas en esos casos |
| Verificación integral: lint, TypeScript, suites y build | `npm run verify`: salida 0; 1.399 pruebas en 47 archivos, sin fallos; lint, TypeScript y build correctos; 65 páginas generadas |
| Commit y CI de la revisión publicada | Pendiente de registrar |
| Despliegue y cotejo de fuentes en producción | Pendiente de registrar |
| Permisos y recursos originales mediante HTTP de producción | Pendiente de registrar |
| Datos ficticios y limpieza final, si se utilizaron | Pendiente de registrar |
| Aceptación manual en dispositivos físicos | Aplazada por solicitud del usuario |
