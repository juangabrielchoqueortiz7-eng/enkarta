# Constructor: iconos de secciones e itinerario sin perder cambios

## Fallos corregidos

`SectionIconsEditor` construía la configuración y sus mapas de iconos desde el render que creó cada callback. Una subida pendiente podía restaurar colores SVG, tamaños o ajustes de otra sección. `ContentPanel` copiaba el itinerario completo y dirigía cada cambio por índice: una respuesta tardía podía recuperar textos anteriores, restaurar una fila eliminada o terminar en su vecina.

Los campos específicos de la plantilla comparten esa misma pantalla. Mantenerles borradores independientes permitía que un cambio de texto repusiera una configuración anterior después de recibir un icono. Por ello el alcance incluye el despachador y sus diez variantes, conservando sus controles y diseños.

## Implementación

- `ContentPanel` usa el `useLegacyDraft` existente y lo comparte con `SectionIconsEditor`, `TemplateContentFields` y las diez variantes. Los subpaneles que ya heredaban el borrador mantienen esa relación. Configuración, mapas y listas se combinan sobre los valores vigentes, incluso cuando varios callbacks terminan antes del siguiente render.
- El constructor pasa su `dataRef` como fuente vigente. El borrador observa los cambios aceptados realmente por `commit`, incluidos el estado de revisión automático y los rechazos por contrato de color; una copia optimista no puede reponer esos valores en el siguiente cambio.
- El itinerario utiliza `BuilderListState`, ya existente, con claves de edición por fila. Editar, añadir y quitar operan sobre la lista actual. Las claves sólo existen en memoria y como claves React, sin añadirse al documento, versiones o almacenamiento del navegador. Si una sustitución externa no conserva referencias identificables, se descarta la identidad anterior en vez de adivinar a qué fila pertenece.
- Los selectores reciben un destino y una comprobación de vigencia. Los iconos de itinerario comprueban que su fila siga existiendo. Deshacer, rehacer y restaurar documentos cambian la revisión que el constructor ya utilizaba para los medios por bloques; ahora también protege el contenido antes del siguiente render. La generación se propaga a los destinos heredados.
- El desmontaje bloquea las escrituras. La limpieza de efectos conserva las claves de lista durante el replay de React 18 StrictMode; eliminarlas en esa limpieza dejaba los controles montados con claves inválidas. Cambiar de contexto sigue limpiando las identidades y un montaje nuevo crea referencias propias.

Se aplica `vercel-react-best-practices` para combinar el estado actual y evitar cierres asíncronos obsoletos. No se usan APIs de React 19 ni dependencias nuevas.

## Conservación y límites

Los cambios afectan a la lógica del editor y al paso de su contexto. Los textos, clases, estilos y recursos predeterminados de las invitaciones se conservan. No se modifican renderizadores públicos, presets, fotografías, fuentes, música, animaciones o bytes originales. No se descargan recursos nuevos.

La API de subida, los permisos del servidor, la publicación y el proveedor de pagos conservan su contrato. Descartar una respuesta no demuestra que un archivo ya recibido se haya borrado del servidor; no se añaden borrados remotos ni publicación automática. Los controles de padrinos y otros campos ajenos no reciben funciones nuevas de ordenación o identidad por este cambio.

BCP permanece bloqueado, sin modificaciones de proveedor, credenciales, CSP o SQL. Las pruebas manuales siguen aplazadas. Las regresiones locales de componentes y las comprobaciones HTTP y de fuentes publicadas no equivalen a ejecutar una subida autenticada en un navegador de producción.

Evidencia privada de la entrega: `tmp/builder-section-icons/`. La reproducción y revisión independiente se conservan en `tmp/builder-section-icons-audit/`.

## Regresiones automáticas

La suite `scripts/test-builder-section-icons-ui.cjs` incorpora **35 pruebas** con los tres paneles, las diez variantes, `IconPicker`, `ImageUploader`, `useLegacyDraft` y `BuilderListState` reales. Se controla el planificador de hooks, montaje y efectos; sólo la compresión, el transporte, la carga del registro de animaciones y sus fronteras visuales se sustituyen por datos y promesas en memoria. Los PNG ficticios no salen a la red y no se monta el DOM.

- Subida de sección en compresión, transporte y JSON mientras se cambian color SVG, tamaño y otros iconos antes del siguiente render. Dos subidas que terminan en orden inverso conservan los dos mapas actuales.
- Contenido, itinerario y secciones que editan el mismo borrador en un turno; campos específicos reales de las diez variantes y ciudad de la plantilla genérica que no reponen configuraciones anteriores tras recibir el icono.
- Padre simulado que enriquece `workflow` o rechaza un campo por contrato: el siguiente cambio observa el estado aceptado realmente.
- Edición de hora y título, eliminación del destino o de su vecino, reordenación, adición y sustitución externa del itinerario. No reaparecen filas eliminadas y las filas con iconos iguales mantienen destinos distintos. Los duplicados clonados sin identidad verificable descartan el resultado anterior.
- Cambio de invitación, plantilla y variante de ida y vuelta; controles retenidos de un contexto anterior; desmontaje en las tres fases; montaje nuevo y replay de efectos de React 18 seguido de una subida válida.
- Revisión de historial cambiada antes del render, que invalida los iconos pendientes y permite después una sesión nueva. Los destinos permanecen estables durante ediciones normales y las identidades no se serializan.

Resultado: **35/35**, también en ejecución independiente. El modo opcional `--baseline` sustituye únicamente `ContentPanel`, `SectionIconsEditor` y `TemplateContentFields` por sus fuentes del commit `d9c0c01945b3133cdb6d2995e60f0460c879acc5`; mantiene actuales el hook, las variantes, los selectores y las listas. Ese contraste arroja **32 fallos y 3 aprobadas**. La ejecución habitual no utiliza Git y funciona con checkout superficial. Logs: `section-icons-ui.log` y `reproduction-baseline.log`.

La auditoría independiente añadió ocho reproducciones en memoria correctas; no se suman a la suite oficial. La comparación AST de los **14 archivos TSX** afectados conserva textos JSX, clases, estilos y atributos visuales estáticos frente a ese commit. La implementación de los selectores, cargador y motor de listas no cambió. No se encontraron bloqueantes finales. Evidencia: `visual-contract.json` y `../builder-section-icons-audit/`.

## Verificación local, 20 de octubre de 2026

- `npm run verify`: **1.225 pruebas correctas en 41 suites**, incluidas las **35 nuevas**, lint, TypeScript y build de producción; comando completo terminado con código 0. Evidencia: `verify.log`.
- **597/597 archivos protegidos** conservan sus hashes y los **129 originales de distribución** están completos, incluidos los recursos archivados fuera de Git. Evidencia: `protected.json` y `distribution.json`.
- **28/28 pruebas offline** de los helpers privados de permisos, atestación y cierre de sesión pasan. No se suman a las pruebas de la aplicación ni realizan red. Evidencia: `smoke-helper-tests.log`.

Permanecen los avisos anteriores de imágenes. No se modifican dependencias ni migraciones.
