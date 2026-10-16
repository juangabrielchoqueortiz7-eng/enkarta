# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Organizadores y socios que crean y administran invitaciones digitales; equipos de recepción que registran ingresos; invitados que abren un enlace personalizado y confirman su asistencia desde el celular.

## Product Purpose

Enkarta reúne la creación de invitaciones interactivas, su publicación, la gestión de invitados y pases y la recepción del evento. Las mejoras deben facilitar esas tareas conservando los diseños y recursos originales aportados por el usuario.

## Operating Context

El proyecto utiliza Next.js App Router, React, TypeScript y Tailwind CSS, con Supabase y despliegue en Vercel. Las versiones aplicables se consultan en `package.json`: al configurar estas skills son Next.js 15.5.28, React 18 y Tailwind CSS 3. La interfaz está en español; el HTML declara `lang="es"`.

Las invitaciones se comparten mediante enlaces, habitualmente desde WhatsApp. El constructor necesita una vista previa fiel al lienzo de la invitación. Recepción necesita controles legibles y operables desde un teléfono.

## Capabilities and Constraints

- Borrador y publicación son estados distintos. Los cambios de interfaz conservan las validaciones y permisos del servidor.
- El listado de invitados, los enlaces personalizados, los pases y el registro de ingresos contienen datos privados. No convertirlos en ejemplos reales, consultas externas ni cachés globales.
- Abrir WhatsApp prepara una acción del usuario; no demuestra envío, entrega ni lectura. No anunciar automatización que el código no implementa.
- Los pagos continúan con el proveedor manual. El adaptador BCP permanece bloqueado hasta contar con documentación oficial y completar su implementación y validación. Una API key por sí sola no habilita pagos.
- No introducir dependencias o APIs de React 19 o Tailwind 4 por seguir ejemplos de una skill.
- Instalar o configurar estas herramientas no cambia la aplicación publicada ni requiere una migración SQL.

## Brand Commitments

El nombre del producto es Enkarta. El usuario exige conservar la identidad de cada invitación y los bytes de los originales. El lenguaje visual del portal no es un tema universal para todas las invitaciones.

Se reutilizan los recursos archivados antes de buscar otros. Se identifican por URL completa y SHA-256, no por nombres ambiguos. Las variaciones de color, tamaño o velocidad se aplican a la instancia, conservando el archivo original. No presentar una recreación como si fuera el original.

## Evidence on Hand

- `docs/INVITALI_RECURSOS.md`: referencias, procedencia y restricciones conocidas.
- `src/lib/invitation-assets.ts`: resolución de recursos originales.
- `Iconos INVITALI/manifest.json` y `public/invitali-originales.json`: inventario y verificación de originales.
- `tailwind.config.ts` y `src/app/globals.css`: estilos existentes; `DESIGN.md` documenta su alcance.
- `docs/RECEPCION_BUSQUEDA_Y_SEGUIMIENTO.md`: comportamiento operativo reciente.
- `scripts/test-builder.cjs`, `scripts/test-services.cjs` y `scripts/test-integrity.cjs`: regresiones existentes. Sus resultados no equivalen a una validación visual en dispositivos reales.

## Product Principles

1. Fidelidad a los originales y variantes independientes.
2. Controles claros para completar la tarea, con estados que describan hechos comprobables.
3. Publicación, cupos, permisos y activaciones validados por el servidor.
4. Funcionamiento móvil y una vista previa que respete el lienzo de cada invitación.

Las métricas comerciales, testimonios, garantías y posicionamiento exclusivo que no estén acreditados permanecen sin definir; no inventarlos al diseñar la landing.
