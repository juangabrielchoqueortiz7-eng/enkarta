# Constructor Enkarta — Fase 6

## Resultado

La pestaña **Estilo** dejó de ser una colección de controles aislados y ahora funciona como un sistema de diseño para invitaciones completas.

## Kits visuales

- Seis kits oficiales con dirección artística propia: Jardín editorial, Noir champagne, Terra mediterránea, Celebración pastel, Minimal contemporáneo y Azul celestial.
- Cada kit incluye paleta, tipografías, botones, campos, radios, sombras, espaciado, iconos, decoración, costuras y movimiento.
- Los kits se ordenan por afinidad con la plantilla y el tipo de evento.
- Aplicar un kit solo cambia estilo. No modifica textos, fotos, bloques, invitados ni datos del evento.
- El kit activo queda identificado y puede personalizarse después.

## Kits personalizados

- El usuario puede guardar la dirección visual actual con un nombre propio.
- Los kits personales aparecen con vista previa y pueden volver a aplicarse a la invitación.
- Se conservan hasta 30 kits en el navegador.

## Tokens semánticos

La paleta está organizada por función, no por colores sueltos:

- Papel
- Tinta
- Primario
- Acento
- Superficie
- Línea

El renderer de bloques consume además los tokens de superficie, radios y sombras para que tarjetas y controles compartan el mismo acabado.

## Escalas globales

- Escala tipográfica independiente para títulos, subtítulos, texto y etiquetas.
- Escala de espaciado global.
- Radios diferenciados pero coordinados para secciones, tarjetas, botones y campos.
- Sombra global: ninguna, suave, media o profunda.
- Densidad compacta, balanceada o amplia.
- Tamaño y color globales para iconos.

## Auditor de consistencia

El panel calcula un puntaje de 0 a 100 y revisa:

- Familias tipográficas distintas.
- Colores fuera del sistema semántico.
- Radios diferentes.
- Espaciados manuales aislados.

La acción **Limpiar diseño** elimina overrides visuales antiguos y reaplica el kit activo o recomendado. Conserva contenido, medios, estructura y datos del evento.

## Validación

- Aplicación de kit oficial comprobada en navegador.
- Guardado de kit personalizado comprobado.
- Limpieza segura comprobada con textos y bloques intactos.
- Auditor comprobado en 100/100 con un kit oficial.
- Sin errores de consola.
- ESLint, TypeScript y compilación de producción completados.
