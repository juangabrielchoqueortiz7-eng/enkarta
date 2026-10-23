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

Capítulo (`designKey: capitulo`) es una edición editorial independiente: papel `#f8f7f3`, tinta `#242825`, piedra `#e4e1d9` y acento `#8c453b`, con tres fotografías nuevas en blanco y negro. Por revisión del usuario usa sobre de papel con apertura, composición centrada, fecha apilada, cuerpo móvil de 16 px y un itinerario aireado sin separadores, aislados en `Capitulo.module.css`. Conserva Áurea/Primicia y las demás invitaciones. Dirección y procedencia: `docs/CAPITULO.md` y `docs/assets/capitulo-images.json`.

Travesía (`designKey: travesia`) mantiene una identidad propia de viaje: laguna `#153e45`, papel `#f4f1e8`, bruma `#dce8e3` y arcilla `#af6550`, con Baskervville/Raleway locales y tres fotografías generadas para esta edición. Su entrada, portada asimétrica y secciones se aíslan en `Travesia.module.css`; no son tokens del portal ni reemplazan Atlas. Composición y procedencia: `docs/TRAVESIA.md` y `docs/assets/travesia-images.json`.

- Constructor: `src/components/admin/builder/InvitationBuilder.tsx`; conservar edición, vista previa y separación de borrador/publicación.
- Invitados: `src/components/admin/host/HostRoster.tsx`; mantener validaciones, revisiones, recuperación de conflictos y significado de las acciones de WhatsApp.
- Recepción: `src/components/admin/scanner/`; separar búsqueda, lectura del pase y registro de ingreso. Encontrar un invitado no registra su acceso.
- Invitación pública: `src/components/invitations/` y `src/app/i/`; respetar tokens, cupos, música, medios y diseño del preset.

Extraer componentes comunes cuando compartan comportamiento real. La composición no debe homogeneizar plantillas visualmente distintas.

## Do's and Don'ts

- Conservar bytes, procedencia y disponibilidad en la biblioteca de cada recurso original; verificar los manifiestos antes de descargar.
- Aplicar color, tamaño o velocidad mediante configuración de instancia, sin reescribir el JSON original.
- Respetar movimiento reducido y los controles de reproducción. Optimizar la carga conservando el original; un derivado requiere ruta propia y procedencia explícita.
- Delimitar el CSS para que el portal no cambie invitaciones fuera del alcance del encargo.
- Revisar etiquetas, foco visible, contraste, errores próximos al campo y uso táctil sin eliminar validaciones para lograr un aspecto más limpio.
- Comparar antes/después de las variantes afectadas cuando cambien estilos o componentes compartidos. No afirmar fidelidad solo porque el build compila.
- No aplicar paletas, tipografías, animaciones o imágenes nuevas como consecuencia automática de instalar una skill.
