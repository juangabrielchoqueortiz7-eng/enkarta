# Checklist de producción — Constructor Enkarta

## 1. Base de datos

1. Crear un respaldo de la base de datos de producción.
2. Ejecutar `migrations/004_builder_cloud_and_analytics.sql` en Supabase.
3. Confirmar la existencia de:
   - `builder_versions`
   - `builder_review_notes`
   - `builder_user_sections`
   - `invitation_analytics_events`
   - función `increment_invitation_views(uuid)`
4. Verificar que las cuatro tablas tengan RLS activo y no tengan políticas públicas.

La migración es aditiva. Mientras no esté aplicada, el editor conserva historial, notas y secciones en `localStorage`, y la interfaz indica “Respaldo local”.

Para los cambios de RSVP y acceso de la fase 1 de servicios, aplicar también `migrations/006_reliable_rsvp_and_access.sql` antes de desplegar el código. Seguir la guía de activación, respaldos y pruebas con dos dispositivos de [Servicios · Fase 1](SERVICIOS_FASE_1_RSVP_Y_ACCESO.md). Estas operaciones no tienen respaldo alternativo local: sin la migración muestran mantenimiento y no aceptan nuevas escrituras.

Para la fase 2, ejecutar `migrations/007_separate_design_review.sql` antes de activar los accesos separados. Revisar [Paquetes y accesos](SERVICIOS_FASE_2_PAQUETES_Y_ACCESOS.md), incluyendo el nuevo campo obligatorio `package` en las integraciones de alta. Los clientes deberán volver a iniciar sesión; las invitaciones anteriores no cambian de contrato automáticamente.

Para la fase 3, ejecutar completa `migrations/008_live_host_and_door_access.sql` y seguir [Panel y puerta](SERVICIOS_FASE_3_PANEL_Y_PUERTA.md). La fase 2 ya tiene 007 comprobada; ambas fases siguen pendientes de commit/despliegue. Validar con `node scripts/check-services-db.cjs --phase3` y probar actualización automática, cambios simultáneos de mesa y aislamiento/revocación de puerta antes de publicar.

## 2. Verificación técnica

Para fase 5, aplicar completa `migrations/010_delivery_followup.sql` después de 009 y seguir [Envíos y seguimiento](SERVICIOS_FASE_5_ENVIOS.md). Comprobar con `node scripts/check-services-db.cjs --phase5`; abrir WhatsApp no equivale a entrega y los recordatorios deben limitarse a invitados pendientes.

La fase 6 no necesita SQL: itinerarios enriquecidos y relatos de galería viven en el documento JSON existente. Seguir [Itinerarios y galerías editoriales](SERVICIOS_FASE_6_EDITORIAL.md), comprobar reordenamiento de fotos y revisar los límites de 0/8/20 imágenes por paquete antes de publicar.

Para fase 7, aplicar completa `migrations/011_verifiable_addons.sql` después de 010 y seguir [Adicionales con entrega verificable](SERVICIOS_FASE_7_ADICIONALES.md). Comprobar con `node scripts/check-services-db.cjs --phase7`; la preconfirmación Save the Date es independiente del RSVP final y nunca concede QR ni ingreso.

La fase 8 no necesita SQL: usar el [Centro de calidad y soporte](SERVICIOS_FASE_8_CALIDAD_Y_SOPORTE.md) para probar el recorrido del paquete contratado, restauración, permisos, soporte y publicación por etapas. Entregar las guías de [anfitrión](GUIA_ANFITRION.md) y [puerta](GUIA_PUERTA.md), y seguir el [SOP operativo](SOP_SOPORTE_PRIVACIDAD_RESPALDOS.md). El gate cerrado no debe eludirse marcando fallos como “No aplica”.

Para fase 4 aplicar completa `migrations/009_invitation_validity.sql` después de 008 y seguir [Vigencia y renovaciones](SERVICIOS_FASE_4_VIGENCIA.md). Comprobar con `node scripts/check-services-db.cjs --phase4`; los acuerdos anteriores no se convierten automáticamente. Revisar ampliaciones, cambio de fecha, avisos de 7 días y conservación de datos antes de desplegar juntas las fases 2–4.

Ejecutar:

```bash
npm run verify
```

La verificación debe completar lint, TypeScript, las pruebas del constructor, las pruebas SQL/API de servicios y la compilación optimizada de Next.js. Las pruebas automatizadas no sustituyen la validación de cámara y concurrencia con dos dispositivos en un entorno separado.

## 3. Prueba funcional

1. Abrir una invitación existente en el constructor.
2. Crear una versión manual y una nota vinculada a un bloque.
3. Recargar en otro navegador autenticado y confirmar que ambas aparecen.
4. Guardar una composición en “Mis secciones” e insertarla en otra invitación.
5. Subir una imagen grande y confirmar que el editor muestra el ahorro de peso.
6. Abrir la invitación pública, entrar por la portada, abrir un mapa e iniciar RSVP.
7. Regresar a **Exportar** y confirmar visitantes únicos, fuentes e interacciones.
8. Confirmar que un invitado sin acceso no puede consultar las APIs administrativas.

## 4. Privacidad y observabilidad

- La analítica no guarda nombres, teléfonos ni mensajes.
- `guest_public_id` solo se registra cuando la visita usa un enlace personalizado.
- Observar durante las primeras 24 horas respuestas 4xx/5xx de `/api/analytics`, `/api/admin/builder-state` y `/api/admin/sections`.
- Revisar crecimiento de `invitation_analytics_events` y definir retención antes de superar el volumen operativo esperado.

## 5. Despliegue

1. Ejecutar primero las migraciones requeridas: 004 para constructor y 006 para la nueva confirmación y acceso, con respaldo y siguiendo la guía de servicios.
2. Desplegar una vista previa y realizar la prueba funcional completa.
3. Promover a producción.
4. No eliminar el respaldo local hasta validar la sincronización con datos reales.
