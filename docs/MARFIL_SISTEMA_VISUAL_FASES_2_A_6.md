# Limpieza y uniformidad · Fases 2 a 6

Implementado y verificado localmente el 27 de agosto de 2026. Complementa
`MARFIL_SISTEMA_VISUAL_FASE_1.md`. No incluye commit, despliegue ni migración de
invitaciones existentes.

## Fase 2 · Dirección artística de Marfil

- Fotografía de portada conservada; historia y galería con tres fotografías
  originales coordinadas en luz natural, piedra clara, lino marfil y olivos.
- Encuadre de portada afinado y degradado superior para la legibilidad de nombres.
- Galería de proporción 4:5 uniforme, deslizamiento, pies descriptivos y visor.
- Familia de 16 iconos SVG editoriales, trazo de 1.25 y color de colección.
  Las imágenes y animaciones personalizadas no se sustituyen.
- Apertura editorial móvil de una columna, sin un índice gigante que comprima
  el texto. Títulos, detalles, contador y confirmación comparten reglas.

## Fase 3 · Bloques y edición

- Roles tipográficos compartidos en los bloques, incluyendo Atlas. Los estilos
  explícitos siguen teniendo prioridad.
- Diseño guiado: prioriza secciones compatibles y reduce la elección accidental
  de fuentes inconexas. Edición libre vuelve a mostrar esas opciones sin cambiar
  el documento al alternar de modo.
- Restaurar tipografía y acabado conserva contenido, identificadores, vínculos,
  posición, archivos y tamaños gráficos. Puede deshacerse.
- El color global de iconos llega al render nativo. Los tintes y paletas
  individuales prevalecen. Campo HEX adicional para introducir un color exacto.
- El selector de ancho admite los nuevos anchos editoriales, hasta 1200 px.

## Fase 4 · Colecciones coordinadas

- Los 13 diseños nuevos usan documentos nativos. Se mantienen sus colores,
  fotografías, fuentes de colección y la composición viajera de Atlas.
- Perfiles persistidos: `marfil-v1` y `collection-v1`; no se infieren al leer una
  invitación antigua. Las antiguas no se convierten ni se recolorean automáticamente.
- Contadores, itinerarios y galerías tienen tratamientos coordinados; menos
  sombras, partículas y movimiento superpuesto por defecto.
- Las composiciones responden al ancho de la invitación, incluso dentro del
  editor. Los adornos quedan contenidos y no invaden el panel.
- Galerías e itinerarios vacíos no dejan capítulos huecos en lectura. La galería
  se conserva si tiene una acción para compartir fotos. El editor permite
  completar los bloques vacíos.

## Fase 5 · Catálogo fiel al resultado

- Catálogo, muestra y creación comparten la misma fuente de datos.
- Las tarjetas muestran la portada real mediante un recorte de solo lectura,
  cargado al acercarse a la pantalla; sin audio, pie ni barra de desplazamiento.
- Misma proporción entre tarjetas, sin inclinaciones 3D. Tres columnas en
  escritorio, dos en tablet y una en móvil.
- Selector de nueva invitación reutiliza la misma vista. Solo «Usar y editar»
  inicia la creación; mirar una tarjeta no crea registros.
- El carrusel de presentación utiliza fechas y nombres reales de las muestras.

## Fase 6 · Comprobación

Comandos aprobados:

```text
npm run lint          Sin advertencias ni errores
npm run typecheck     Sin errores
npm run test:builder  23/23 pruebas aprobadas
npm run build         Compilación de producción correcta
```

Pruebas de navegador:

- 13 colecciones × 4 anchos (320, 390, 768 y 1280): 52 combinaciones sin
  desbordamiento horizontal de página, títulos o párrafos, con nombres largos y
  diez actividades extensas.
- Mismo ancho móvil dentro de un escritorio: las columnas se adaptan al lienzo.
- Cambio a edición libre, selección de Marcellus, nombres largos, guardado local,
  recarga y reapertura conservando fuente, nombres e itinerario.
- Color HEX de iconos conservado tras guardar y reabrir; los tests de render
  comprueban prioridad del tinte individual y preservación de SVG subidos.
- Galería de Marfil: imágenes cargadas, navegación y visor; revisadas fotos de
  mesa y alianzas. Confirmación de muestra responde sin enviar datos al servidor.
- Versión compilada: Marfil y Nocturna cargan sin errores de consola observados;
  Nocturna conserva fondo oscuro y Cinzel. La muestra clásica de Lunaria sigue
  sin perfil nuevo.
- La página de pruebas no muestra el editor en producción: devuelve la pantalla
  de invitación no encontrada.

El banco de pruebas está en `/dev/invitation-quality` **solo en desarrollo**.
Usa los componentes reales y un documento de muestra. El botón de guardado
serializa a almacenamiento local y reabre con el parser real; no guarda en
Supabase. Los listados administrativos pueden responder 401 sin una sesión.

No se ha probado una escritura autenticada en la base de datos de producción,
ni se han enviado confirmaciones reales. Antes de publicar: revisión visual del
responsable, commit/despliegue autorizados y prueba controlada de guardar/reabrir
un borrador con sesión administrativa. No requiere SQL nuevo.

## Recursos originales y prompts

Se usó la herramienta integrada de **ImageGen**, no CLI ni API independiente.
La foto existente `public/catalog/solar-original.png` sirvió como referencia de
paleta, luz, lugar y pareja; no se copiaron imágenes de la competencia.
Los PNG generados se conservaron y las versiones WebP se integraron en el proyecto:

| Archivo final | Tamaño |
| --- | ---: |
| `public/catalog/marfil/portrait.webp` | 139 274 bytes |
| `public/catalog/marfil/table.webp` | 143 634 bytes |
| `public/catalog/marfil/rings.webp` | 142 634 bytes |

Todos son verticales, 1122 × 1402 px. La pareja es una escena ilustrativa
generada para la muestra, no documentación de una boda real.

Prompt compartido:

```text
Use case: photorealistic-natural.
Asset type: original editorial wedding photograph for the Marfil digital invitation.
Image 1 is a palette, lighting and location reference.
Natural cream linen, olive foliage, warm pale stone, gentle daylight,
restrained editorial photography, realistic material textures.
Vertical 4:5 photograph, no text, logos, borders, collage or watermark.
```

Indicaciones de cada pieza:

```text
portrait: The same couple as the reference, preserving faces, brown hair and
ivory wedding clothes. Waist-up, smiling beneath an olive tree in the same
courtyard, from a different angle. Softly blurred pale stone. Unobstructed
faces in the upper middle, natural hands.

table: No people. An intimate wedding table in the same courtyard: two ivory
ceramic place settings, linen, olive foliage and glass, with afternoon shadows.
Believable, uncluttered editorial composition.

rings: Two plain gold wedding bands on folded ivory linen, a small olive branch
and pale limestone. Minimal natural-daylight composition. No flowers or extra
jewelry.
```

Ubicación final común:
`C:/Users/Usuario/Desktop/PROYECTOS ANTIGRAVITY/Enkarta/public/catalog/marfil/`.
