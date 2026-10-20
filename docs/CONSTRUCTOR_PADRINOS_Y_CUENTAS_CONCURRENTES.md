# Padrinos y cuentas: conservación de ediciones locales

## Problema y resultado

Los controles de padrinos en Nocturna y la familia compartida (`dolcevita`, `carmesi_v2`, `napoly`, `euforia`, `rosegold` y `allegria`), y los de cuentas de Seda, reconstruían la lista desde la copia del último render. Dos cambios antes del siguiente render podían borrar el primero. Un callback retenido tras quitar una fila o reordenar la lista podía restaurar datos antiguos o actuar sobre una posición distinta. Además, las filas utilizaban su índice como clave de React.

`TemplateContentFields` utiliza ahora el mecanismo existente `draft.list`: cada fila conserva una identidad exclusiva del editor, y las acciones de editar, eliminar y añadir se calculan con el borrador actual. Las acciones pendientes dirigidas a una fila eliminada o sustituida se ignoran. Las acciones de una fila superviviente conservan su destino al desplazarla. Dos inserciones consecutivas conservan ambas filas.

La escritura de cuentas fusiona `current.config`, de modo que una operación de lista no sustituya cambios recientes de otros campos. Los datos de cuenta siguen siendo texto, incluidos espacios y ceros iniciales. Se conservan los metadatos originales, el orden vigente y los valores de inserción propios de cada colección. Las identidades internas no se guardan en el JSON de la invitación.

## Alcance y conservación

- Corrección local del constructor, compatible con React 18 y el borrador compartido de Socios. Las protecciones existentes de propietario, plantilla, diseño y revisión continúan vigentes.
- No incorpora edición colaborativa entre dispositivos ni resolución de conflictos de guardado en el servidor. No cambia la persistencia, los permisos, las publicaciones, el SQL ni las dependencias.
- Se conservan estructura, textos, controles, clases y valores iniciales. No se modifican invitaciones públicas, presets, fotografías, música, animaciones ni estilos globales.
- BCP mantiene su bloqueo. No hay integración bancaria, cobro ni envío de mensajes.

Skill aplicada: `vercel-react-best-practices`, especialmente actualización basada en el estado vigente y conservación de callbacks seguros. El motor de listas y `useLegacyDraft` se reutilizan sin cambios.

## Pruebas

`scripts/test-template-list-concurrency-ui.cjs` ejercita el componente real con `useLegacyDraft` y `BuilderListState`, utilizando datos ficticios en memoria y prohibiendo peticiones de red. Las pruebas de UX existentes siguen ejecutándose. La suite nueva se integra en `npm run verify`.

- **47/47 pruebas nuevas correctas**: edición de varios campos antes del siguiente render; eliminación y reordenación con callbacks retenidos; rechazo de acciones sobre filas borradas o reemplazadas; dos inserciones consecutivas; listas vacías o ausentes; aislamiento de contextos; configuración reciente y metadatos conservados en borradores locales y heredados.
- En la referencia anterior `8977112713e47557333383203c316b8ee9115c93`, la misma suite produce **43 fallos y 4 aciertos**. Los cuatro aciertos corresponden a protecciones de contexto que ya existían; los fallos reproducen el problema antes de corregirlo.
- **28/28 pruebas de UX existentes correctas**. Las nuevas identidades se comprueban fuera del documento y de los parches enviados por el componente.

La comparación automática de los árboles estáticos de las doce rutas nativas con la versión anterior conserva elementos, clases, textos, valores y atributos accesibles. Se excluyen únicamente callbacks, claves internas y los identificadores generados por el arnés. Esta comprobación no acredita una aceptación visual en un teléfono físico.

La verificación de producción se realiza después de que Vercel confirme el despliegue como `Ready`: correspondencia de fuentes desplegadas, permisos HTTP, comprobaciones privadas acotadas y hashes de los recursos originales. No reproduce una carrera de edición en un navegador autenticado de producción. Las pruebas manuales permanecen aplazadas por solicitud del usuario.

Evidencia técnica privada: `tmp/template-list-concurrency/`.

## Verificación local previa al despliegue

- `npm run verify`: **1.446 pruebas correctas en 48 ejecuciones de suites**, lint, TypeScript y build con **65 páginas generadas**. Código de salida 0, sin reintento separado del build.
- **34/34 pruebas sin red** del verificador privado de producción: rechazos de permisos, cuerpos vacíos y correspondencia de fuentes desplegadas.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 recursos originales**. No se requieren SQL, dependencias ni cambios de variables de entorno.
- Revisión independiente del cambio: únicamente las tres listas previstas; sin modificaciones en el hook, motor de listas, diez editores delegados, estilos, etiquetas o normalizadores.

## Despliegue y comprobaciones de producción

Código de aplicación `29012323ca3d2b04e57f76b864532e952c061c7d`, integrado en `main`. Vercel confirma **Ready** en el despliegue `dpl_FrB1MxQgCC8wbY7hJf6e1DJG5Y32`, asociado a [Enkarta](https://enkarta.vercel.app).

[CI del SHA exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39515369528) completado con éxito: `npm run verify` y `npm audit --omit=dev --audit-level=high`. El cierre automático de evidencia contrastó estos resultados con el despliegue, las fuentes y los contadores de pruebas y conservación.

- Correspondencia exacta de las cuatro fuentes de entrada: `TemplateContentFields.tsx`, `useLegacyDraft.ts`, `builder-list-state.ts` y `payments/bcp.ts`.
- **13 grupos de comprobaciones HTTP correctos**. **75 peticiones denegadas**, incluidas **63 solicitudes de escritura**, verifican que visitantes, cookies inválidas y una sesión de administrador no puedan suplantar a un Socio. Los paneles privados mantienen su redirección y el diseño elegido en el retorno seguro.
- La consulta privada de historial usa un identificador ficticio inexistente. La auditoría de recursos recibe una lista vacía y devuelve únicamente métricas cero; la petición de subida autenticada carece de archivo y propietario y se rechaza antes del almacenamiento. No se leen filas de clientes ni se prueba una subida o guardado positivo como Socio.
- **129/129 originales publicados idénticos por bytes y SHA-256** y **6/6 rutas públicas y de acceso correctas**.
- **Cero datos de negocio escritos, usuarios creados, archivos almacenados, pagos, llamadas bancarias o mensajes enviados**. El identificador ficticio continúa ausente y se cerró la sesión temporal de administrador. No quedan fixtures persistentes que limpiar.

BCP conserva su bloqueo en las fuentes desplegadas y su configuración local desactivada. No se ha consultado el valor remoto del proveedor ni ejecutado operaciones bancarias. La aceptación manual y las carreras dentro de un navegador autenticado de producción siguen aplazadas; las regresiones de concurrencia se ejecutaron localmente con la lógica real.
