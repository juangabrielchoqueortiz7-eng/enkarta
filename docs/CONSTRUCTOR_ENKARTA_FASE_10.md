# Fase 10 — Exportación y analítica

## Resultado

El constructor cierra su ciclo operativo: además de diseñar, revisar y publicar, ahora puede entregar archivos útiles para clientes y coordinación del evento, y medir el recorrido de los invitados con una política de privacidad explícita.

## Centro de exportación

### Paquete completo ZIP

Incluye:

- portada social generada por Enkarta;
- QR público en alta resolución;
- calendario universal `.ics`;
- invitación estática A4 en PDF;
- textos esenciales en formato plano;
- respaldo completo del diseño en JSON;
- hasta 30 imágenes del documento;
- listado de enlaces cuando un recurso externo no permite descarga.

El ZIP se construye directamente en el navegador con un escritor estándar sin compresión. No transmite el diseño ni los invitados a servicios de terceros.

### Entregables especializados

- PDF estático multipágina para impresión.
- Tarjeta QR general en PNG y HTML imprimible.
- Kit social ZIP: Story `1080×1920`, post `1080×1350` y WhatsApp `1200×630`.
- Tarjetas personales PNG con QR, pases, mesa y enlace único.
- Tarjetas personales PDF: un archivo individual por invitado y un PDF combinado.
- Resumen PDF de mesas y accesos, paginado cuando una mesa supera 34 grupos.
- CSV de métricas y embudo.
- Calendario ICS y respaldo JSON independientes.

## Analítica de recorrido

Eventos registrados:

- visita y apertura de portada;
- profundidad de scroll al 25%, 50%, 75% y 100%;
- clics en botones y enlaces;
- reproducción o pausa de música;
- apertura de mapas, calendario y galería;
- compartir y enlaces externos;
- inicio y envío del RSVP.

El panel presenta:

- vistas y visitantes únicos;
- tasa de respuesta y conversión;
- embudo `Abrió → Vio detalles → Inició RSVP → Confirmó`;
- profundidad de lectura;
- clics y uso de música;
- fuentes de visita;
- actividad y respuestas de los últimos siete días.

## Privacidad y retención

- No se guardan IP, nombre, teléfono ni mensajes en la tabla analítica.
- El identificador del enlace personal se transforma en un hash irreversible antes de guardarlo.
- La configuración permite desactivar la recolección inmediatamente.
- Retención configurable: 30, 90, 180 o 365 días.
- La API elimina eventos vencidos al recibir una nueva visita y al abrir el reporte.
- Los reportes muestran sesiones y totales agregados.

## SQL requerido

Después de la migración 004 se debe ejecutar:

`migrations/005_phase10_analytics_journey.sql`

La migración amplía el catálogo permitido de eventos y hace idempotentes los cuatro umbrales de scroll. No modifica invitaciones, versiones ni respuestas existentes.

## Archivos principales

- `src/components/admin/builder/panels/ExportPanel.tsx`
- `src/components/admin/builder/panels/ConfigPanel.tsx`
- `src/components/invitations/InvitationAnalytics.tsx`
- `src/lib/export-artifacts.ts`
- `src/app/api/analytics/route.ts`
- `src/app/api/admin/analytics/route.ts`
- `migrations/005_phase10_analytics_journey.sql`

## Verificación

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Validación de la estructura ZIP y PDF.
- Prueba con invitados suficiente para paginación de mesas.
- Comprobación del embudo antes y después de aplicar la migración 005.
