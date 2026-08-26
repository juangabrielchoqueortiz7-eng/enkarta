# Fase 8 — Publicación segura y revisión colaborativa

## Resultado

La invitación dejó de funcionar como un único documento vivo. El constructor ahora separa tres estados:

1. **Borrador:** lo que el equipo está editando y autoguardando.
2. **Vista privada:** el borrador renderizado únicamente para el administrador o el cliente autenticado.
3. **Versión pública:** un snapshot inmutable que continúa visible para los invitados aunque el borrador cambie.

La implementación reutiliza las tablas de la migración `004_builder_cloud_and_analytics.sql`; no requiere una migración adicional.

## Funciones incorporadas

- Estado de guardado siempre visible: sin cambios, pendiente, guardando, guardado, sin conexión o error.
- Reintento automático al recuperar la conexión y reintento manual desde el indicador.
- Historial persistente en Supabase con espejo local de recuperación.
- Versiones manuales con nombre, autor/rol y resumen.
- Respaldo automático antes de restaurar y antes de un rollback.
- Restauración al borrador sin modificar la versión pública.
- Publicación con nombre, resumen editable y detección automática de cambios.
- Rollback inmediato que crea una nueva publicación y conserva la reemplazada.
- Comentarios generales o vinculados a un bloque.
- Estados de revisión `pending`, `approved` y `changes`.
- Portal del cliente para revisar el borrador privado, aprobar o solicitar cambios.
- Roles visibles: administrador, diseñador, cliente y solo lectura.
- Permisos del servidor: el cliente puede leer el historial y gestionar únicamente sus observaciones; no puede crear, eliminar ni publicar versiones.

## Flujo de publicación

1. El editor trabaja sobre `invitations.builder_config` como borrador.
2. El enlace privado usa `?preview=1` y exige una sesión de administrador o anfitrión del evento.
3. Publicar inserta un snapshot con `source = 'publish'` en `builder_versions`.
4. La invitación pública en `/i/[slug]` carga el último snapshot publicado.
5. Si una publicación falla, su versión local se revierte y no aparece falsamente como activa.
6. Un rollback guarda primero el estado actual y después publica el snapshot elegido como una versión nueva.

Las invitaciones creadas antes de esta fase siguen funcionando: cuando no existe un snapshot publicado se usa la fila actual como compatibilidad legacy.

## Metadatos sin nueva migración

Los campos de Fase 8 se encapsulan en los JSON existentes:

- Metadatos de versión dentro de `snapshot.config.__enkartaVersion`.
- Estado y rol de una observación en una cabecera privada dentro de `builder_review_notes.text`.
- Estado editorial en `builder_config.workflow`.

Los helpers de lectura eliminan esas cabeceras antes de devolver el contenido al editor o a la invitación pública.

## Verificación realizada

- `npx tsc --noEmit`
- `npm run lint`
- Revisión visual del centro de historial en escritorio.
- Revisión visual del diálogo de publicación.
- Revisión visual del portal del cliente en escritorio y móvil.
- Comprobación semántica de versiones nombradas, versión en línea, rollback, notas y filtros.

## Archivos principales

- `src/components/admin/builder/InvitationBuilder.tsx`
- `src/components/admin/builder/panels/VersionsPanel.tsx`
- `src/components/admin/host/ClientReviewPanel.tsx`
- `src/lib/builder-versions.ts`
- `src/lib/builder-workflow.ts`
- `src/lib/published-invitation.ts`
- `src/app/api/admin/builder-state/route.ts`
- `src/app/i/[slug]/page.tsx`
