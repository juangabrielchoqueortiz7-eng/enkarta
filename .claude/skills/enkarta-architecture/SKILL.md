---
name: enkarta-architecture
description: Arquitectura y convenciones del proyecto Enkarta (Next.js 14 App Router + Supabase) para construir features de forma profesional y escalable — flujo de datos, capa de tipos/mapper, builder_config, almacenamiento y dónde poner cada cosa. Úsalo al añadir features, rutas, datos o tocar la base de datos.
---

# Arquitectura · Enkarta

Plataforma de invitaciones digitales. Next.js 14 (App Router) + Supabase + Tailwind.

## Flujo de datos (memorízalo)

```
Supabase tabla `invitations`
  → parseInvitation(row)            // src/lib/types.ts: parsea campos JSON string
      → InvitationParsed.config     // builder_config ya como objeto (BuilderConfig)
  → PREMIUM_REGISTRY[template]      // src/lib/template-registry.tsx: key → { Comp, map }
      → map(parsed)                 // mapper de invitation-mapper.ts: row → props
  → <Comp data={...} />             // src/components/invitations/*
  → envuelto por <EntryGate>        // portada de entrada (salvo ?full=1)
```

- **Lectura siempre server-side** con `supabaseAdmin` (`src/lib/supabase/server.ts`).
  Las páginas de invitación son `force-dynamic`.
- **`builder_config` (JSONB)** es la fuente de verdad para todo lo "rico" y
  editable: textos largos, `theme`, `decor`, `entry`, `galleryImages`,
  tipografías. Es permisivo a propósito (`[key: string]: unknown`): añade campos
  nuevos sin romper datos antiguos; el mapper aplica defaults.
- **Columnas planas** (`names`, `event_date`, `color_*`…) son datos base/legacy.
  Para nuevas capacidades, prefiere `builder_config` antes que añadir columnas.

## Dónde va cada cosa

- `src/app/` — rutas (App Router). `i/[slug]` = invitación real; `muestra/[template]`
  = preview con sample data; `admin/` = panel y builder; `api/admin/*` = endpoints.
- `src/components/invitations/` — plantillas premium + sistema de entrada.
- `src/components/templates/` — plantillas clásicas (legacy).
- `src/components/admin/` — UI del panel y del builder.
- `src/lib/` — `types.ts` (modelo + parsers), `invitation-mapper.ts` (row→props),
  `supabase/`, `motion.ts` (animaciones), `utils.ts` (`cn`), helpers.

## Convenciones para escalar

- **Tipos primero**: extiende `BuilderConfig`/`TemplateTheme`/`TemplateDecor` en
  `types.ts` y deja que el mapper rellene defaults. Nunca leas `config.x` crudo en
  la plantilla sin default.
- **Registrar una plantilla**: una entrada en `PREMIUM_REGISTRY`
  (`src/lib/template-registry.tsx`, `{ key → { Comp, map } }`) la activa en
  `/i/[slug]`, `/muestra` (+ `generateStaticParams`) y `LivePreview` a la vez.
  Además: su sample en `SAMPLES` de `/muestra` y su tema de entrada en
  `entry/config.ts` (ver skill `enkarta-invitations`).
- **Estilos**: Tailwind + `cn()` de `src/lib/utils.ts` para combinar clases sin
  conflictos. Colores de marca via tokens `enkarta-*` (ver tailwind.config).
- **Animación**: framer-motion mediante presets de `src/lib/motion.ts`; no
  redeclares variants por componente.
- **Subida de imágenes**: usa los endpoints en `src/app/api/admin/upload` /
  `icons`; el bucket de Storage se autocrea. Guarda solo URLs en `builder_config`.
- **Seguridad**: `supabaseAdmin` (service role) es solo servidor — nunca lo
  importes en componentes `'use client'`.

## Antes de terminar una feature

- [ ] `npx tsc --noEmit` limpio.
- [ ] Verificado en preview (`preview_*`) sin errores de consola.
- [ ] Datos nuevos en `builder_config` con default en el mapper (compatibilidad).
- [ ] Sin secretos ni `supabaseAdmin` en cliente.
