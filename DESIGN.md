---
name: Enkarta
description: Referencia del portal existente; cada invitación conserva su propio diseño.
colors:
  brand-gold: "#B8975A"
  brand-cream: "#FAF7F2"
  brand-dark: "#2C2519"
  brand-sage: "#5a6e5a"
  brand-beige: "#D4C5B9"
  operations-action: "#516749"
  operations-success: "#3d6b4f"
  operations-secondary: "#6b7280"
  operations-progress: "#047857"
  operations-progress-track: "#e5e7eb"
typography:
  body:
    fontFamily: "Outfit, sans-serif"
  editorial-heading:
    fontFamily: "Playfair Display, serif"
---

## Overview

Registro del código existente al configurar las skills, no un rediseño ni una certificación de accesibilidad. Los tokens se extraen de `tailwind.config.ts` y `src/app/globals.css`; no se importan en la aplicación desde este documento.

**Regla de identidad independiente.** La marca del portal no reemplaza los diseños de las invitaciones. Cada preset conserva su composición, recursos, fuentes, paleta y movimiento. Las instrucciones de fidelidad de `AGENTS.md` tienen prioridad sobre preferencias estéticas de las skills.

## Colors

El portal tiene una base crema, texto oscuro, acento dorado y colores complementarios salvia y beige. Los nombres y valores están en el frontmatter y corresponden al grupo `enkarta` de Tailwind.

La existencia de un color no acredita contraste suficiente para todo uso. Medir cada combinación de texto y fondo; no usar el dorado como texto pequeño por defecto. Corregir un control dentro del alcance pedido sin recolorear otras invitaciones. Si el cambio afecta la identidad de una referencia, documentarlo y resolverlo dentro de ese encargo.

Los tokens `operations-*` documentan el verde de acción del padrón, el estado de recepción y los controles de revisión de WhatsApp. Se aplican exclusivamente a herramientas operativas; no son una paleta adicional para las invitaciones.

## Typography

Outfit es la fuente base del cuerpo; Playfair Display aparece en títulos del constructor y controles del portal. Tamaños y pesos varían según el componente: no se ha establecido aquí una escala global nueva.

Las invitaciones emplean familias distintas. Sus clases y variables `--ek-font-heading`, `--ek-font-body` y `--ek-font-script` conservan los fallbacks y la personalización existente. No reemplazar ni descargar fuentes para cumplir una preferencia del catálogo.

## Layout

La landing presenta el producto; el portal prioriza tareas de gestión; el lienzo público presenta el evento. Mantener esos ámbitos al modificar CSS o extraer componentes.

El constructor tiene controles y vista previa. Los perfiles con `data-ek-visual-profile` usan el contenedor `invitation` y variantes `invite-*`; las invitaciones heredadas mantienen sus breakpoints. Validar el lienzo móvil dentro del editor además del ancho del navegador. No cambiar estos mecanismos como efecto de una limpieza de clases.

Las tablas y formularios deben funcionar con nombres largos, errores, resultados vacíos, carga y pérdida de conexión. Un ajuste de disposición conserva las acciones, revisiones y estados del flujo existente.

## Elevation & Depth

El portal combina superficies claras, bordes discretos y sombras locales. No se ha extraído una escala universal de elevación. Mantener las decisiones del componente afectado hasta que un cambio de diseño explícito establezca otra escala.

## Shapes

Los controles, tarjetas y diálogos del portal usan radios distintos; no se impone un único radio. No trasladar su geometría a sobres, sellos, collages o marcos originales de las invitaciones.

## Components

Albor (`designKey: albor`) es la variante independiente inspirada en Euforia: papel `#f9f6ef`, acento decorativo `#8e6f55`, bronce oscuro `#67513e` y tinta `#493c30`. Romantic Lovely, Cormorant Infant, Great Vibes, Apple Chancery, Raleway y Cormorant Garamond son originales locales. La cabecera combina foto nueva izquierda y frase, aro floral y nombres a la derecha; en móvil se apilan. El sobre usa hojas reales y lacre floral verde. Cuerpo de 22 px en escritorio y 21 px en móvil; la frase pequeña usa bronce oscuro para contraste. Siete momentos y los iconos separados de traje/vestido usan JSON originales. La introducción es el archivo exacto de abril de 2024, distinto de los corazones de mayo. CSS, reproductor y revelados aislados; conserva Terracota/Euforia y las demás variantes. Detalle y procedencia: `docs/ALBOR.md` y `docs/assets/albor-*.json`.

Ópera (`designKey: opera`) es la variante independiente inspirada en Obsidiana: mármol negro `#090909`, dorado cálido `#f7e0a5` y superficie oscura `#17150f`. Romantic Lovely (`OperaScript`), Raleway (`OperaBody`), Poiret One (`OperaDisplay`) y Apple Chancery (`OperaAccent`) conservan sus fuentes originales locales. La fotografía nueva ocupa la mitad izquierda de la portada y los nombres, fecha y frase propia quedan dentro de marcos dorados a la derecha; en móvil se apilan. El sobre usa hojas originales con un tratamiento oscuro de instancia y lacre floral negro. Seis momentos y los dos iconos de vestimenta usan JSON originales, con configuraciones independientes. Galería, familias, ubicaciones y confirmación siguen editables. Sus estilos y reproductor están aislados; no modifica Nocturna/Obsidiana ni las demás variantes. Procedencia: `docs/OPERA.md` y `docs/assets/opera-*.json`.

Véspera (`designKey: vespera`) es una variante independiente de Grazia: papel `#fbf8f4`, tinta `#292622`, acento decorativo `#967f60` y bronce oscuro `#5c4a36` en controles. Usa Poiret One (`VesperaBody`), Cinzel (`VesperaRoman`), Tangerine (`VesperaScript`) y Great Vibes (`VesperaEntryScript`) originales y locales; las acciones usan Raleway (`VesperaControls`) para legibilidad. Una fotografía nocturna nueva ocupa la cabecera con nombres y fecha en un medallón marfil centrado; el sobre reutiliza hojas reales y lacre floral negro. Ocho momentos usan JSON originales y efectos propios al aparecer. La galería, familia, lugares y confirmación permanecen editables. Su CSS y reproductor están aislados: no modifica Seda/Grazia ni las variantes anteriores. Dirección y procedencia: `docs/VESPERA.md` y `docs/assets/vespera-*.json`.

Serenata (`designKey: serenata`) es la variante botánica independiente inspirada en Dolcevita: verde `#51765d`, bosque `#2d4c2e`, papel `#fcfbf6`, texto `#2b342b` y bronce decorativo `#89734e`. Usa Meow Script (`SerenataScript`), Cormorant Infant (`SerenataSerif`), Cinzel (`SerenataRoman`) y Raleway (`SerenataBody`) originales. Tres fotografías nuevas en color acompañan el sobre de hojas reales y lacre floral. La portada combina fotografía en arco y nombres caligráficos; en móvil se apilan y el follaje se atenúa para mantener legibilidad. Las tres ceremonias comparten una banda verde y los seis momentos se muestran con JSON originales. Familias, galería y RSVP conservan su función. Sus estilos, reproductor y revelados están aislados; no modifica Oliva/Dolcevita, Capítulo ni otras variantes. Dirección y procedencia: `docs/SERENATA.md` y `docs/assets/serenata-*.json`.

Capítulo (`designKey: capitulo`) es una edición editorial independiente: papel `#f8f7f3`, tinta `#242825`, piedra `#e4e1d9` y acento `#8c453b`, con tres fotografías nuevas en blanco y negro. Su entrada usa las dos hojas originales de Paradise a pantalla completa, matizadas en marfil mediante composición CSS sobre el papel del evento, y el lacre verde floral real. No modifica los raster originales. Usa Baskervville (`CapituloEditorial`), Raleway (`CapituloBody`) y Poiret One (`CapituloEntry`) archivadas, independientes de las fuentes del portal. Los JSON usan terracota uniforme por instancia y blancos de papel, conservando máscaras y ajustes propios del usuario. Las fotografías se descubren con un recorte suave, acercamiento mínimo y desplazamiento; los titulares preceden a sus textos al entrar en pantalla una sola vez. Todo permanece visible sin efectos y respeta movimiento reducido, ahorro de datos, pestaña oculta y vista previa. Conserva composición centrada, fecha apilada, cuerpo móvil de 16 px e itinerario sin separadores; las familias muestran únicamente etiquetas y nombres, sin avatares. Los estilos se aíslan en `Capitulo.module.css`. Conserva Áurea/Primicia y las demás invitaciones. Dirección y procedencia: `docs/CAPITULO.md`, `docs/assets/capitulo-images.json` y `docs/assets/capitulo-entry-originals.json`.

Travesía (`designKey: travesia`) mantiene una identidad propia de viaje: laguna `#153e45`, papel `#f4f1e8`, bruma `#dce8e3` y arcilla `#af6550`, con Baskervville/Raleway locales y tres fotografías generadas para esta edición. Su entrada, portada asimétrica y secciones se aíslan en `Travesia.module.css`; no son tokens del portal ni reemplazan Atlas. Composición y procedencia: `docs/TRAVESIA.md` y `docs/assets/travesia-images.json`.

- Constructor: `src/components/admin/builder/InvitationBuilder.tsx`; conservar edición, vista previa y separación de borrador/publicación.
- Invitados: `src/components/admin/host/HostRoster.tsx`; mantener validaciones, revisiones, recuperación de conflictos y significado de las acciones de WhatsApp.
- Recepción: `src/components/admin/scanner/`; separar búsqueda, lectura del pase y registro de ingreso. Encontrar un invitado no registra su acceso.
- Invitación pública: `src/components/invitations/` y `src/app/i/`; respetar tokens, cupos, música, medios y diseño del preset.

Extraer componentes comunes cuando compartan comportamiento real. La composición no debe homogeneizar plantillas visualmente distintas.

## Do's and Don'ts

- Fondo vigente de Albor, fiel a Euforia: una sola acuarela original `47cuerpo-1-copia.webp` sobre papel `#f9f6ef`, dentro de un marco fijo a la ventana, posición superior izquierda, `cover` en escritorio y `contain` en móvil. En movimiento activo, la capa mide 149% y usa el progreso de la página respecto de la ventana, redondeado a dos decimales, como el código público de la referencia (velocidad 4,9). Vista previa, movimiento reducido, ahorro de datos y pestaña oculta mantienen el fondo estático. Se conserva la repetición vertical del póster completo declarada por la referencia; no usar franjas de hojas verdes, duplicación en espejo, filtros, máscaras ni banda salvia. Familias y cabecera son transparentes sobre ese fondo. La vista previa pinta el póster dentro de su propio lienzo. Nombres/fecha del sobre sin aro; el aro original se mantiene en la cabecera interior. No alterar otras invitaciones ni los bytes originales.

- Conservar bytes, procedencia y disponibilidad en la biblioteca de cada recurso original; verificar los manifiestos antes de descargar.
- Aplicar color, tamaño o velocidad mediante configuración de instancia, sin reescribir el JSON original.
- Respetar movimiento reducido y los controles de reproducción. Optimizar la carga conservando el original; un derivado requiere ruta propia y procedencia explícita.
- Delimitar el CSS para que el portal no cambie invitaciones fuera del alcance del encargo.
- Revisar etiquetas, foco visible, contraste, errores próximos al campo y uso táctil sin eliminar validaciones para lograr un aspecto más limpio.
- Comparar antes/después de las variantes afectadas cuando cambien estilos o componentes compartidos. No afirmar fidelidad solo porque el build compila.
- No aplicar paletas, tipografías, animaciones o imágenes nuevas como consecuencia automática de instalar una skill.
