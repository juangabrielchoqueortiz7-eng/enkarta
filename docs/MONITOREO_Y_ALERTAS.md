# Monitoreo y alertas de Enkarta

## Qué queda comprobado

`GET /api/health` revisa de forma segura la configuración y el acceso de servidor a invitaciones, RSVP, control QR y embudo comercial. Devuelve `200` cuando todo responde y `503` cuando algún servicio crítico falla. No expone nombres de tablas, variables, clientes ni detalles internos.

El detalle se consulta únicamente con sesión administrativa en **Admin → Lanzamiento**.

## Alerta externa activa

Una aplicación no puede avisar de su propia caída si su servidor también está fuera de línea. `.github/workflows/production-health.yml` comprueba `https://enkarta.vercel.app/api/health` desde GitHub Actions con:

- método `GET`;
- intervalo de 5 minutos;
- éxito esperado: HTTP `200`;
- alerta ante `503`, error de red o 10 segundos sin respuesta;
- una incidencia única en GitHub cuando falla y cierre automático después de la recuperación.

La cuenta operativa debe conservar habilitadas las notificaciones de GitHub para Actions e incidencias.

La comprobación manual equivalente es:

```bash
npm run monitor:production
```

## Respuesta operativa

1. Abrir **Admin → Lanzamiento** y revisar cuál control falló.
2. Confirmar si la invitación pública, RSVP, panel o QR está afectado.
3. Evitar cambios destructivos y conservar registros.
4. Informar a clientes afectados por el canal del pedido.
5. Restaurar el último estado estable y documentar causa, duración y solución.
