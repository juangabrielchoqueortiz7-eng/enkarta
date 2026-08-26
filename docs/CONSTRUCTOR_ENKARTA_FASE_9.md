# Fase 9 — Auditor profesional y publicación operativa

## Resultado

El constructor ahora dispone de un centro de control previo a producción. La revisión ya no depende únicamente de observar la invitación: combina comprobaciones estáticas, pruebas reales de recursos, vistas exactas del renderer público y controles explícitos para publicar, programar o pausar.

La programación reutiliza `builder_versions` y el JSON de la migración `004_builder_cloud_and_analytics.sql`; no requiere SQL adicional.

## Auditor incorporado

- Puntuación de preparación y filtros por contenido, diseño, accesibilidad, publicación y rendimiento.
- Bloqueos para nombres, fecha, ubicación, URL, contraste crítico, RSVP sin destino y calendario sin fecha.
- Alertas sobre secciones vacías, imágenes sin contenido o descripción, videos y mapas incompletos, botones sin enlace y recursos HTTP.
- Comprobación responsive en 360, 390, 768, 1024 y 1440 px.
- Detección de bloques ocultos en todos los dispositivos, texto reducido, riesgo de cortes y elementos posiblemente superpuestos.
- Auditoría de uniformidad para exceso de tipografías, colores, radios, espaciados y animaciones.
- Métricas de secciones, imágenes, animaciones y peso aproximado del documento.
- Prueba desde servidor de hasta 24 imágenes, audios, videos y enlaces: estado, tamaño conocido y tiempo de respuesta.
- Protección frente a destinos locales o privados y revalidación de redirecciones durante la prueba remota.

## Vista previa de producción

- Acceso privado al borrador usando el mismo renderer de la URL final.
- Tres encuadres automáticos: portada, sección media y cierre.
- Invitado de prueba con nombre, pases y mesa ficticios.
- Confirmación visible del slug y de la fecha de expiración.
- La vista privada no registra analítica ni permite enviar confirmaciones reales.

## Estados de publicación

1. **Publicar ahora:** crea un snapshot inmutable y lo hace visible inmediatamente.
2. **Programar fecha:** conserva la versión pública actual hasta la fecha elegida; si no existe una, mantiene la invitación en preparación.
3. **Cancelar programación:** elimina únicamente el snapshot futuro seleccionado.
4. **Despublicar:** pausa el enlace sin borrar borradores, versiones ni programaciones.
5. **Rollback:** sigue creando una publicación nueva a partir de la versión anterior, por lo que el historial nunca se destruye.

Las versiones futuras llevan fecha efectiva propia. El renderer público ignora una programación antes de tiempo y la activa automáticamente cuando llega su fecha.

## Archivos principales

- `src/components/admin/builder/PublicationAuditPanel.tsx`
- `src/components/admin/builder/InvitationBuilder.tsx`
- `src/components/admin/builder/panels/ConfigPanel.tsx`
- `src/components/admin/builder/panels/VersionsPanel.tsx`
- `src/components/invitations/PreviewCaptureController.tsx`
- `src/lib/builder-validation.ts`
- `src/lib/publication-audit.ts`
- `src/lib/builder-versions.ts`
- `src/lib/published-invitation.ts`
- `src/app/api/admin/publication-audit/route.ts`
- `src/app/api/admin/builder-state/route.ts`
- `src/app/i/[slug]/page.tsx`

## Verificación requerida antes de cerrar

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Revisión visual del auditor, diálogo de publicación y panel de historial.
- Prueba funcional de publicación inmediata, programación, cancelación y pausa con una invitación de prueba.
