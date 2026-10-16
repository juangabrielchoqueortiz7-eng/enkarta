# Verificación del padrón paginado — 16 de octubre de 2026

Producción: https://enkarta.vercel.app

- Despliegue final: `dpl_CAvSJs5cS2Ca2BobtR9jb6sLhD8F`, Ready, con el alias
  principal comprobado por Vercel CLI.
- Código desplegado: `2903ec8`. Base anterior: `ed66c0b`; paginación: `83e7206`.
  Rama publicada: `codex/padron-paginacion-real`. No se fusionó con `main`.
- Migración 018 ejecutada manualmente por el usuario; disponibilidad de su RPC
  comprobada con `service_role` sin datos reales antes del despliegue.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Constructor y recursos, local | 130/130 |
| Servicios, SQL y rutas, local | 100/100 |
| Publicación, permisos y pagos, local | 29/29 |
| Lint y TypeScript | Sin errores; permanecen 10 avisos anteriores de imágenes en una invitación no modificada |
| Build local y build final en Vercel | Correctos |
| Auditoría de dependencias de producción | 0 vulnerabilidades |
| Navegador local con contrato HTTP ficticio | 9/9 |
| HTTP/SQL y ejercicio de navegador en producción final | 28/28 |
| Interacciones de navegador final en producción | 5/5 |
| Landing, catálogo y rutas de pruebas cerradas | 11/11 |
| Recursos publicados frente a SHA-256 archivado | 129/129; 46.481.464 bytes |
| Archivos protegidos locales frente a la base previa | 597; ninguno modificado |

La prueba creó un evento operativo con 1.002 grupos ficticios: 1 confirmado y
1.001 pendientes. La API devolvió 25 por página y 41 páginas, sin repetir filas
entre páginas consecutivas. Los KPIs siguieron mostrando el total global.
El CSV filtrado incluyó sus 1.001 grupos; WhatsApp seleccionó 200 y contó 801
restantes. La búsqueda de duplicados encontró un contacto fuera de página y
aceptó 200 nombres de longitud máxima en UTF-8 sin crear invitados.

El navegador confirmó segunda página, contacto de WhatsApp fuera de la página
visible, recuperación de la revisión tras recargar, editor con retorno del foco
y ausencia de desbordamiento a 390 px. Se cerró la sesión antes de limpiar.
No se pulsó enviar WhatsApp ni se hicieron operaciones bancarias.

## Limpieza y límites de la evidencia

El informe final registra `cleanup = verified-no-fixtures-remain`. La limpieza
se retomó mediante `--resume-cleanup` desde su alcance registrado, sin crear
datos nuevos. Se verificó la ausencia de las cuentas, eventos, invitados,
publicaciones, ledger y datos operativos propios. Los archivos temporales con
credenciales y confirmaciones de navegador fueron eliminados.

Una ejecución anterior terminó sus 26 comprobaciones HTTP, pero venció la
espera de confirmación mientras la automatización de descarga del navegador
quedó bloqueada. Esa ejecución también limpió sus datos; su informe se conserva
con el fallo. La ejecución final independiente pasó sus 28 comprobaciones.
La descarga nativa automatizada continúa sin acreditarse: se verificaron el
contenido completo y los filtros del CSV por HTTP. No se probó en teléfonos
físicos, ni con cámaras o audio reales.

El detector de diseño señaló tres colores anteriores del dashboard que no
están documentados en la paleta; se conservaron para respetar el diseño vigente.
BCP permanece desactivado. No se cambiaron diseños ni recursos originales.

Evidencia local, excluida de Git: `tmp/roster-pagination/verification.json`,
`production-final-http.json`, `production-browser.json`,
`production-final-originals.json`, `production-smoke.json`, logs y capturas.
