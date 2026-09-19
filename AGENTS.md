# Invitaciones y recursos reutilizables

Antes de replicar una invitación, consultar `docs/INVITALI_RECURSOS.md` y `src/lib/invitation-assets.ts`.
El usuario pide fidelidad a la referencia y que cada JSON original aportado se conserve en la biblioteca del constructor y se reutilice en otras invitaciones sin volver a pedirlo.
No reemplazar animaciones originales por dibujos o movimientos aproximados. Verificar la URL completa del recurso: distintos archivos `boda.json` representan animaciones distintas.
Conservar los bytes del original; aplicar colores, tamaño y velocidad mediante configuración de la instancia. Documentar recursos pendientes sin afirmar identidad cuando falta verificarla.
No modificar otras invitaciones al agregar una nueva variante.

Carpeta maestra del usuario: `Iconos INVITALI/`. Antes de descargar cualquier recurso nuevo, consultar `Iconos INVITALI/manifest.json`, `public/invitali-originales.json` y los archivos existentes. No volver a descargar los archivados. Guardar los nuevos en esa carpeta con año y mes en el nombre, registrar URL completa y SHA-256, e importar con `node scripts/import-invitali-originals.cjs`. Las copias de distribución en `public/` deben conservar los bytes originales.
