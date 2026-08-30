# Monitoreo y alertas de Enkarta

## Qué queda comprobado

`GET /api/health` revisa de forma segura la configuración y el acceso de servidor a invitaciones, RSVP, control QR y embudo comercial. Devuelve `200` cuando todo responde y `503` cuando algún servicio crítico falla. No expone nombres de tablas, variables, clientes ni detalles internos.

El detalle se consulta únicamente con sesión administrativa en **Admin → Lanzamiento**.

## Alerta externa necesaria

Una aplicación no puede avisar de su propia caída si su servidor también está fuera de línea. Después de desplegar, conectar `https://enkarta.vercel.app/api/health` a un monitor externo con:

- método `GET`;
- intervalo de 5 minutos;
- éxito esperado: HTTP `200`;
- alerta ante `503`, error de red o 10 segundos sin respuesta;
- notificación al canal operativo elegido por Grupo JABA.

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

