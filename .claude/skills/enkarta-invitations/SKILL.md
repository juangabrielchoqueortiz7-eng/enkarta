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

## Costuras entre secciones ("capas")

Una invitación es una pila de bandas de color. El salto de una a otra NUNCA va
en recto: lo resuelve `<Seam>` (`shared.tsx`), que pinta el color de la banda
anterior sobre la franja superior de la siguiente, recortado con una forma, más
sombra suave y un filete fino opcional. Va DENTRO de la sección (`relative`), así
que ningún `overflow-hidden` lo recorta.

Formas (`SeamShape`): `arch` (cúpula), `curve` (valle), `wave` (ola en S),
`bevel` (V muy abierta), `scallop` (festón de encaje), `fade` (degradado),
`line` (filete recto + sombra), `none`.

Se declaran con `seamsFor`, que recibe la pila de bandas EN ORDEN DE PINTADO —
solo la sección que ABRE cada tirada de color, y las opcionales como
`cond && {...}` — y devuelve `sew(clave)`:

```tsx
const sew = seamsFor([
  { k: 'portada', c: C.paper },
  { k: 'invitado', c: C.accent },
  !!data.noKids && { k: 'ninos', c: C.paper },
  { k: 'pie', c: C.accentDeep },
], { shape: 'arch', hairline: C.gold });

<section className={`relative px-6 ${SECTION.base}`} style={{ background: C.accent }}>
  {sew('invitado')}
  …
</section>
```

Si dos bandas seguidas comparten color no dibuja nada. Para portadas con FOTO a
sangre (no hay color anterior que traer) se usa directamente
`<Seam edge="bottom" from={C.paper} … />`: es el papel de la sección siguiente
el que sube sobre la foto.

### En el constructor por bloques

`BlockRenderer` dibuja la costura **solo cuando un bloque cambia de fondo
respecto al anterior**, y la forma la fija el token `seam` de la plantilla de la
que partió la invitación (`TEMPLATE_TOKEN_DEFAULTS` en `src/lib/template-themes.ts`)
— no hay control por bloque: en el constructor el cliente elige colores libres y
no hay "personalidad" de la que deducir la forma, así que se hereda la de su
plantilla y sale coherente sin que él decida nada.

Al añadir una plantilla nueva, dale su fila en `TEMPLATE_TOKEN_DEFAULTS` con
`seam` (si falta, cae al preset de azure). La costura se salta sola cuando:
el bloque anterior es degradado o imagen (no hay un color sólido que nombrar),
los dos bloques comparten fondo, o el `padTop` del bloque es < 28px (no cabe).

Reglas:
- **Una forma por plantilla**, elegida por personalidad, no al azar: arco para
  lo formal/arquitectónico, festón para lo romántico, ola para boho/viaje,
  chaflán para lo editorial y art-déco, filete recto para lo tipográfico.
- El `padding-top` de una sección con costura debe ser ≥ 56px (`SECTION.tight`
  ya cumple con 40px frente a los 36px de la costura en móvil; los pies y las
  secciones con padding a medida se suben a `pt-14`).
- El filete (`hairline`) es opcional: en plantillas minimalistas (Allegria) la
  capa se nota por la forma y la sombra, sin línea decorativa encima.

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

## NUNCA definas un componente dentro del componente de plantilla

Toda plantilla con cuenta regresiva re-renderiza **una vez por segundo**. Un
componente declarado dentro del cuerpo (`const Band = (...) => ...`) es una
función nueva en cada render, y para React eso es otro TIPO de componente: le
desmonta y le vuelve a montar el árbol entero. Resultado: los iconos Lottie
arrancan de cero y las animaciones de entrada se reinician — se ve como un
parpadeo, y con presets 3D (`depth3d`, `unfold3d`) además deja zonas en blanco
mientras se revuelven.

Ya ha pasado dos veces: `SecIcon` en Azure y `Band` en Obsidiana (12 de 13
secciones reconstruidas cada segundo). Las dos salidas válidas:

1. **Sácalo a nivel de módulo** y pásale lo que necesite. La paleta la lee de
   `useC()`; lo que dependa del cuerpo (una costura, un handler) entra por prop
   ya montado: `<Band seam={sew('regalo')}>`.
2. **Que no sea un componente**: una función que devuelve el elemento y se
   invoca, no se instancia — `{sectionDivider('w-24')}` en vez de
   `<SectionDivider className="w-24" />`. Es lo que hace `seamsFor`.

Para detectarlo: `MutationObserver` sobre `document.body` unos segundos, o
comprobar si las `<section>` conservan identidad (`before[i] === after[i]`).

## Animación

Usa el toolkit en `src/lib/motion.ts` (framer-motion): `fadeUp`, `fadeIn`,
`scaleIn`, `stagger`, `float`, `ease`, `viewport`. Mantén la misma curva
(`ease.soft`) y duraciones (`duration.base`) para que el ritmo sea consistente.
Respeta `useReducedMotion()` para accesibilidad.

## Checklist al crear/editar una plantilla

- [ ] Colores leídos de la paleta resuelta, nada hardcodeado.
- [ ] Costuras declaradas con `seamsFor` y una forma propia (nunca copiar la
      ola genérica de otra plantilla: era lo que las hacía parecer la misma).
- [ ] Ningún componente definido dentro del cuerpo de la plantilla (ver arriba:
      con la cuenta regresiva se remonta todo cada segundo).
- [ ] Registrada en `entry/config.ts` (tema + extractor si hace falta).
- [ ] Registrada en `PREMIUM_REGISTRY` (`src/lib/template-registry.tsx`,
      `{ key → { Comp, map } }`) — eso la activa en `/i/[slug]`, `/muestra`
      (incl. `generateStaticParams`) y `LivePreview` de una vez.
- [ ] Sample añadido a `SAMPLES` en `src/app/muestra/[template]/page.tsx`.
- [ ] Verificar en `/muestra/<key>` (entrada + apertura) sin errores de consola.
- [ ] Sin doble portada: la plantilla NO debe repetir lo que ya muestra la entrada.
