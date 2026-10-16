# Invitaciones y recursos reutilizables

Antes de replicar una invitación, consultar `docs/INVITALI_RECURSOS.md` y `src/lib/invitation-assets.ts`.
El usuario pide fidelidad a la referencia y que cada JSON original aportado se conserve en la biblioteca del constructor y se reutilice en otras invitaciones sin volver a pedirlo.
No reemplazar animaciones originales por dibujos o movimientos aproximados. Verificar la URL completa del recurso: distintos archivos `boda.json` representan animaciones distintas.
Conservar los bytes del original; aplicar colores, tamaño y velocidad mediante configuración de la instancia. Documentar recursos pendientes sin afirmar identidad cuando falta verificarla.
No modificar otras invitaciones al agregar una nueva variante.

Carpeta maestra del usuario: `Iconos INVITALI/`. Antes de descargar cualquier recurso nuevo, consultar `Iconos INVITALI/manifest.json`, `public/invitali-originales.json` y los archivos existentes. No volver a descargar los archivados. Guardar los nuevos en esa carpeta con año y mes en el nombre, registrar URL completa y SHA-256, e importar con `node scripts/import-invitali-originals.cjs`. Las copias de distribución en `public/` deben conservar los bytes originales.

## Skills de diseño y frontend para Enkarta

Antes de trabajar en la interfaz, leer `PRODUCT.md`, `DESIGN.md` y la sección pertinente de `docs/SKILLS_ENKARTA.md`. Son contexto del proyecto; el código actual y las instrucciones del usuario resuelven cualquier discrepancia. La procedencia de las cinco skills instaladas está en `docs/skills-lock.json`.

Elegir las skills según el cambio, sin cargar todas para una corrección pequeña:

- `impeccable`: dirección visual, jerarquía, refinamiento de interfaces existentes y documentación del sistema de diseño.
- `ui-ux-pro-max`: consultar patrones, tipografía o alternativas cuando la tarea requiera exploración. Las recomendaciones del catálogo no sustituyen decisiones existentes ni autorizan un rediseño.
- `web-design-guidelines`: revisar accesibilidad, interacción, formularios y adaptación móvil de los archivos afectados.
- `vercel-react-best-practices`: rendimiento de React/Next.js, consultas y tamaño del código del cliente.
- `vercel-composition-patterns`: composición, variantes y estado compartido de componentes reutilizables.

La landing, el catálogo y el portal operativo tienen funciones distintas de las invitaciones. No propagar el tema del portal a `src/components/invitations/`, `src/app/muestra/`, `src/app/i/`, los presets ni los recursos de `public/`. No normalizar fuentes, colores, fotografías, música o movimientos de las invitaciones por recomendaciones genéricas de una skill. Al tocar estilos globales o componentes compartidos, verificar todas las variantes afectadas; una variante nueva no modifica las demás. Si una mejora requiere cambiar un diseño original fuera del alcance pedido, registrar el hallazgo y continuar con el trabajo autorizado.

Compatibilidad actual: Next.js 15.5.28, React 18, Tailwind CSS 3 y TypeScript. Omitir recetas que requieran React 19 (`use`, `useEffectEvent`, `Activity`, refs como props) o Tailwind 4; no actualizar dependencias para satisfacer una skill. Mantener la separación entre componentes de servidor y cliente y los permisos en el servidor. No cachear globalmente datos privados de invitados, tokens, acceso o pagos.

La instalación de skills no autoriza rediseños, nuevas descargas de recursos, cambios de CSP, despliegues ni operaciones bancarias. BCP continúa desactivado hasta recibir documentación y credenciales, implementar el contrato oficial y validar su integración. No inventar estados de entrega/lectura de WhatsApp ni de pago.
