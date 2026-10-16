# Padrón paginado en PostgreSQL

La [verificación de producción del 16 de octubre](VERIFICACION_PADRON_018_2026-10-16.md)
registra resultados, despliegue, limpieza y límites de las pruebas.

La migración `018_host_roster_pagination.sql` se ejecuta completa después de 017,
antes del código. Es aditiva y reaplicable; no modifica invitados, publicaciones,
recursos, tokens QR ni pagos. Su comprobación final es
`host_roster_pagination_ready = true`. La aplicación no ejecuta DDL ni usa una
descarga completa como respaldo si falta la RPC.

## Lectura y alcance

- El panel operativo consulta `enkarta_host_roster`: 25 grupos por página en SQL.
  Filas, totales, mesas, ocupación y elegibilidad de WhatsApp salen de una misma
  sentencia. Los KPIs siempre abarcan todo el evento; los filtros abarcan todos
  los grupos. Las respuestas abiertas siguen en su sección independiente.
- Búsqueda literal sin comodines, sin distinguir acentos, por nombre, nombre
  confirmado, teléfono y grupo; mesa/código solo cuando el servicio los permite.
  Orden estable con UUID para desempates; mesas con orden numérico natural.
  Una página que queda fuera del rango se ajusta a la última existente.
- El editor y el contacto actual de WhatsApp pueden consultar hasta dos UUID
  seleccionados fuera de página. Cambiar filtros no cambia la revisión guardada.
  Una consulta en curso bloquea acciones basadas en datos anteriores; una
  respuesta antigua no sustituye la búsqueda más reciente. Buscar espera 250 ms.
- La importación CSV comprueba hasta 200 candidatos contra el padrón completo y
  recibe índices de duplicados, sin descargar sus contactos. Se invalida al
  cambiar de evento, columnas, candidatos o lectura del panel. Conserva la
  deduplicación dentro del CSV. Esto no impone una identidad universal ni impide
  dos importaciones nuevas concurrentes con distintos identificadores de lote.
- Exportar CSV es una acción explícita con lotes SQL de 250 y todos los filtros.
  No se limita a 25 ni al máximo de 1.000 filas de PostgREST. Si cambia el padrón,
  la ocupación o los servicios entre lotes, se descarta la exportación completa
  con 409 y se pide repetirla. No entrega una planilla parcial.
- WhatsApp conserva el límite de 200 y el conteo de elegibles fuera de la
  revisión. La selección sale de todos los resultados filtrados. No acredita
  envío, entrega ni lectura y no envía mensajes automáticamente.

## Seguridad

Las RPC son `SECURITY INVOKER`, solo ejecutables por `service_role`. Las API
validan la sesión y el evento antes de leer, con `private, no-store`. Anónimo,
revisor, recepcionista y anfitrión de otro evento no pueden leer ni exportar el
padrón. Los DTO usan campos explícitos y excluyen tokens, credenciales e
identificadores de reintentos. No existe caché global de datos privados.

BCP permanece bloqueado sin contrato oficial. No se cambiaron dependencias,
estilos globales, diseños, presets ni recursos originales por esta mejora.

## Verificación reproducible

```sh
npm run lint
npm run typecheck
npm run test:builder
npm run test:services
npm run test:integrity
npm run build
```

Las regresiones usan PostgreSQL/PGlite aislado con más de 1.000 grupos, roles,
permisos, contactos fuera de página, filtros, CSV completo y edición concurrente.
`/dev/services/roster-pagination` simula el contrato HTTP solo en desarrollo;
permite revisar consulta lenta, error, vacíos y recuperación con 1.001 grupos.
Esa simulación no prueba SQL ni dispositivos físicos.

La prueba autorizada sobre producción se ejecuta con:

```sh
node scripts/check-integrity-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --roster-pagination --roster-window --report tmp/roster-pagination/production-http.json
node scripts/check-originals-deployment.cjs https://enkarta.vercel.app --report tmp/roster-pagination/production-originals.json
```

Usa exclusivamente cuentas, eventos, grupos y pagos ficticios. No invoca bancos
ni envía WhatsApp. Registra el alcance antes de escribir; elimina los grupos,
asientos, movimientos, publicaciones, cuentas y ledger propios y comprueba su
ausencia. La limpieza también pagina los grupos para no truncarse en 1.000.
Si se interrumpe el proceso, usar los mismos argumentos de origen/proyecto/report
con `--resume-cleanup` recupera solo esa limpieza, sin crear nuevos registros.

## Git y archivos privados

La base ya desplegada se conserva en `ed66c0b`; la paginación se registra aparte.
`tmp/`, `.env.local`, credenciales efímeras y archivos maestros excluidos no se
guardan en Git. Los originales permanecen en su carpeta maestra y distribución.
El despliegue se realiza desde este workspace con Vercel CLI para incluir la
distribución original existente. Un checkout de Git no sustituye ese archivo
maestro: no publicar desde una copia que omita esos recursos.

En CI, las tres comprobaciones que necesitan el archivo maestro privado se
identifican como omitidas cuando no existe; el resto de regresiones sigue
ejecutándose. Localmente y al verificar el despliegue esas comprobaciones son
obligatorias. Los resultados de cada ejecución están en `tmp/roster-pagination/`
y no contienen credenciales en los informes persistentes.
