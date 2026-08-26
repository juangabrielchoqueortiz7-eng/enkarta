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

## 2. Verificación técnica

Ejecutar:

```bash
npm run verify
```

La verificación debe completar lint, TypeScript y la compilación optimizada de Next.js.

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

1. Ejecutar primero la migración 004.
2. Desplegar una vista previa y realizar la prueba funcional completa.
3. Promover a producción.
4. No eliminar el respaldo local hasta validar la sincronización con datos reales.

