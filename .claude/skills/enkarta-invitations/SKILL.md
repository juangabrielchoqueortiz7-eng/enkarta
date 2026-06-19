---
name: enkarta-invitations
description: Sistema de diseño de las invitaciones premium de Enkarta — paletas, tipografías, motivos decorativos, la entrada ("sobre") temática y cómo crear o editar una plantilla. Úsalo siempre que trabajes en src/components/invitations/*, en la entrada (EntryGate/entry/*) o al añadir una plantilla nueva.
---

# Sistema de diseño · Invitaciones Enkarta

Guía para mantener coherencia visual al crear o editar invitaciones premium.

## Anatomía de una plantilla

Cada plantilla vive en `src/components/invitations/<Nombre>.tsx` y recibe `{ data }`
(tipos en `types.ts`). Patrón establecido:

1. **Paleta interna** `const DEFAULT_C = { ... }` con colores nombrados por rol
   (no por valor): `paper/bg`, `ink`, `soft`, `accent/gold/...`, `line`.
2. **`resolve<Nombre>Theme(t?: TemplateTheme)`**: mapea la paleta semántica
   editable (`primary`, `bg`, `text`, `muted`, `line`…) a los colores internos,
   con *fallback* a `DEFAULT_C`. Nunca hardcodees colores en el JSX: lee de la
   paleta resuelta (vía `ThemeCtx` / `useC()` cuando exista).
3. **`decor` opcional** (`TemplateDecor`): controla fondo (`art|solid|gradient`),
   partículas flotantes, adornos de esquina, divisores y loader. Respeta estos
   flags (`!== false` = encendido por defecto).
4. **Secciones** en orden típico: intro → bienvenida + countdown → ceremonia →
   dress code → itinerario → regalo → galería → RSVP → footer.
   La **portada/entrada NO va dentro de la plantilla**: la pone `EntryGate`.

## Tipografías (clases globales)

- `font-great` — Great Vibes (script, nombres grandes)
- `font-cinzel` — Cinzel (mayúsculas con tracking, títulos de sección, botones)
- `font-cormorant` — Cormorant Garamond (cuerpo serif, mensajes)
- `font-playfair` — Playfair Display (números/fechas en negrita, titulares)
- `font-outfit` — sans (UI/admin)

Convención: títulos de sección en `font-cinzel uppercase tracking-[0.16em]`,
nombres de pareja en `font-great`, fechas/números en `font-playfair font-bold`.

## La entrada ("sobre") — entrada única por plantilla

- Mecánica compartida: `src/components/invitations/EntryGate.tsx`
  (fade + lock de scroll + arranque de música + `AnimatePresence`).
- Paletas y datos por plantilla: `entry/config.ts`
  (`ENTRY_THEMES`, `themeFor`, `entryPropsFor`).
- Escenas visuales: `entry/scenes.tsx`. Tipos de escena (`SceneKind`):
  `envelope` (sobre + sello de cera, por defecto), `passport` (libreta),
  `newspaper` (periódico), `arch` (arco con foto), `luxe` (marco dorado oscuro).

Para una plantilla nueva: añade una entrada en `ENTRY_THEMES['<key>']` con
`scene`, `veil/veil2` (fondo), `panel`, `ink`, `soft`, `accent`, `accentText`,
`script`, `ornament` (`orchid|rose|pampas|leaf|sage|palm|none`) y `tagline`.
Si la forma de datos es nueva, añade un `case` en `entryPropsFor` para extraer
`names`, `initials`, `dateLine` y `coverImage`.

## Animación

Usa el toolkit en `src/lib/motion.ts` (framer-motion): `fadeUp`, `fadeIn`,
`scaleIn`, `stagger`, `float`, `ease`, `viewport`. Mantén la misma curva
(`ease.soft`) y duraciones (`duration.base`) para que el ritmo sea consistente.
Respeta `useReducedMotion()` para accesibilidad.

## Checklist al crear/editar una plantilla

- [ ] Colores leídos de la paleta resuelta, nada hardcodeado.
- [ ] Registrada en `entry/config.ts` (tema + extractor si hace falta).
- [ ] Registrada en `PREMIUM_REGISTRY` (`src/lib/template-registry.tsx`,
      `{ key → { Comp, map } }`) — eso la activa en `/i/[slug]`, `/muestra`
      (incl. `generateStaticParams`) y `LivePreview` de una vez.
- [ ] Sample añadido a `SAMPLES` en `src/app/muestra/[template]/page.tsx`.
- [ ] Verificar en `/muestra/<key>` (entrada + apertura) sin errores de consola.
- [ ] Sin doble portada: la plantilla NO debe repetir lo que ya muestra la entrada.
