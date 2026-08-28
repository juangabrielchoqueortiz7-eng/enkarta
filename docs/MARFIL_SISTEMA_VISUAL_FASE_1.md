# Marfil Vivo · Sistema visual, fase 1

## Alcance

Referencia editorial para la muestra y las nuevas invitaciones Marfil Vivo. El
perfil persistido `tokens.visualProfile: "marfil-v1"` activa las reglas. No se
deduce del nombre de la plantilla ni se añade durante una migración: las
invitaciones existentes y las otras colecciones conservan su diseño.

Esta fase establece las reglas, no cambia fotografías, composiciones de la
galería, ilustraciones ni entradas. El pulido artístico completo corresponde a
la fase 2; el resto de bloques del constructor se incorporará en la fase 3.

## Tipografía

Dos familias en el contenido por bloques: **Playfair Display** para titulares y
números; **Outfit** para lectura y acciones. El logotipo Enkarta del pie conserva
su tipografía de marca y es la única excepción.

| Función | Familia | Tamaño base | Tratamiento |
| --- | --- | --- | --- |
| Nombres | Playfair | 42–82 px por defecto | Caja natural; tamaño de portada editable |
| Título de sección | Playfair | 32–44 px | Interlineado 1.2, peso 400, tracking −0.025 em |
| Subtítulo / actividad | Playfair | 22–26 px | Interlineado 1.3 |
| Párrafo | Outfit | 18 px | Interlineado 1.7 |
| Nota / pie de foto | Outfit | 15 px | Interlineado 1.65, sin mayúsculas forzadas |
| Etiqueta breve | Outfit | 12 px | Peso 500, mayúsculas, tracking 0.14 em |
| Horario | Outfit | 14 px | Peso 500, cifras tabulares |
| Botón | Outfit | 15 px | Peso 500, caja natural, tracking 0.02 em |
| Campo | Outfit | 16 px | Interlineado 1.5 |

Los ocho títulos principales comparten la misma regla, incluida la confirmación.
Los tamaños fluidos usan el ancho de la invitación (`cqw`), no el ancho de la
pantalla que contiene el editor. Las variables de fuente y escalas existentes
siguen permitiendo personalizar la invitación. No hay reglas tipográficas con
`!important` ni cambios globales a las clases de las demás colecciones.

## Color

| Función | Valor | Uso |
| --- | --- | --- |
| Papel | `#F7F4EC` | Fondo principal |
| Superficie | `#FFFCF6` | Tarjetas y campos |
| Tinta | `#30392F` | Lectura principal |
| Tinta secundaria | `#696C5E` | Notas y etiquetas |
| Oliva | `#4B5942` | Títulos, íconos y acciones |
| Oliva profundo | `#2C3627` | Pie / superficies oscuras |
| Oro | `#A38A58` | Acentos decorativos; no texto pequeño sobre papel |
| Línea | `#D8D3C4` | Separaciones decorativas |

El foco de teclado usa oliva. Los bordes de campos y botones secundarios tienen
una tinta más fuerte que las líneas decorativas (55 % oliva sobre papel). Las
secciones oscuras conservan el sistema existente de tinta invertida.

## Espaciado y geometría

- Escala: **4, 8, 12, 16, 24, 32, 48, 64, 80 px**.
- Separación de sección: 64 px por lado; 80 px para capítulos destacados.
- Bloques relacionados: 8 o 24 px en la unión, sin sumar dos separaciones grandes.
- Márgenes laterales automáticos: 20–24 px; se respetan valores manuales.
- Anchos máximos: lectura 680 px, composición 940 px, galería 1080 px.
- Radios: sección 0, tarjeta 8, medios 4, campos y botones 6 px.
- Acciones principales y campos: altura mínima de 48 px, sin sombras añadidas.
- Íconos del itinerario editorial: caja común de 38 × 38 px y color oliva.
  La unificación de los dibujos/trazos del conjunto queda para el pulido visual.

## Aplicación y compatibilidad

Las reglas se aplican en el mismo render usado por muestra, editor y publicación,
en los bloques presentes en Marfil: portada, capítulos, información, contador,
calendario, botón, itinerario editorial, galería y confirmación.

No se modifican los datos del evento, enlaces, fotografías ni confirmaciones.
No requiere SQL. El perfil y las fuentes viajan en el JSON existente al guardar.
Se conservan las elecciones explícitas de fuente global, forma de controles y
estilos de bloques. No se publica ni se migra producción automáticamente.

## Comprobación

- Pruebas automáticas: dos familias por defecto, escalas y espaciado válidos,
  controles coherentes, conservación de ajustes y ausencia de migración implícita.
- Revisado en navegador local a 320, 390 y 1280 px: sin desbordamiento horizontal
  de página ni títulos; ocho títulos a 32 px en móvil y 44 px en escritorio.
- Confirmadas dos familias en el contenido, botones de 15 px / 48 px de alto y
  campos de 16 px / al menos 48 px de alto. Capturas inspeccionadas de portada,
  apertura editorial, itinerario, información y confirmación.
- Lunaria por bloques verificada sin perfil: mantiene Cinzel / Great Vibes y sus
  controles anteriores. No se modifican sus valores visuales.
- Validación de código: 15 pruebas aprobadas, TypeScript y lint sin errores,
  compilación de producción completada y muestra compilada comprobada localmente.
- Antes de publicar: aprobar visualmente la composición final de fase 2.
