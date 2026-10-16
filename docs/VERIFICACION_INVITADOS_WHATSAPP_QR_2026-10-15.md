# Invitados, WhatsApp y recepción QR — 15 de octubre de 2026

Actualización posterior: el guardado unificado de contactos ya se implementó y
desplegó con la migración 016. Ver [evidencia de contactos](CONTACTOS_INVITADOS_016.md).
Los pendientes que siguen describen el estado del primer despliegue de este bloque.

## Implementación

- CSV: lectura de comillas escapadas y campos multilínea, delimitadores coma,
  punto y coma y tabulación; detección de columnas incompletas, duplicados,
  teléfonos inválidos y pases fuera de 1–20. Conserva columnas finales vacías.
- Listas pegadas: validación explícita; no recorta nombres ni ajusta pases
  silenciosamente. Hasta 200 invitados por lote.
- API: valida todo el lote antes de insertar. Admite 128 KiB para importaciones,
  manteniendo el límite de 8 KiB en las demás operaciones. Rechaza otro origen.
- Edición y eliminación: exige la revisión del invitado. Los conflictos devuelven
  409. El constructor conserva el texto local al fallar un guardado y no presenta
  una lista vacía como si fuera una consulta correcta durante una caída.
- WhatsApp: apertura directa en el gesto del usuario; seguimiento transaccional
  separado entre apertura y marca manual. Variables equivalentes del mensaje se
  sustituyen una sola vez, sin interpretar los datos del invitado como plantilla.
- Pase: PNG de 900 × 1360 px generado en el dispositivo, con nombre, mesa, cupos
  confirmados, ID y QR. El token no se envía a un servicio de imágenes externo.
- Recepción: cupos restantes, ingreso por persona, alerta visual de agotamiento,
  sonidos activados por gesto, bloqueo de lectura continua al revisar un grupo y
  protección frente al inicio simultáneo de la cámara.

No se añadieron migraciones: este bloque reutiliza las existentes. Los archivos
de los diseños y recursos originales no se editaron. BCP continúa desactivado.

## Evidencia automatizada

`npm run verify`: **176 pruebas aprobadas** (81 constructor/lógica, 66 servicios,
29 integridad), comprobación TypeScript y compilación de producción completadas.
El linter conserva advertencias previas de imágenes en plantillas originales.

Los servicios se ejercitan con PostgreSQL real en memoria (PGlite), sustituyendo
únicamente el transporte hacia la base y las cookies. La concurrencia de sesiones
independientes se prueba además mediante dos solicitudes HTTP simultáneas contra
Supabase en el ejercicio descrito a continuación.

## Ejercicio HTTP

El ensayo local contra Supabase aprobó **15 comprobaciones**. Su informe está en
`tmp/audit-2026-10/operations-local-http.json` y registra
`cleanup: verified-no-fixtures-remain`, sin llamadas bancarias.

1. Anónimo no puede editar, publicar ni aprobar pagos.
2. Administración y revisión inician sesiones separadas.
3. Revisión no puede operar invitados, publicar ni acceder a otro evento.
4. Publicación exige una acción explícita y crea su snapshot.
5. La invitación pública muestra lo publicado.
6. Autoguardado conserva publicación y rechaza versiones obsoletas.
7. Historial oculta credenciales y pausar retira contenido público.
8. Evento Exclusive ficticio se publica; anfitrión y puerta acceden por separado.
9. Importación inválida no inserta filas; puerta no puede editar el padrón.
10. Cambios obsoletos se rechazan; abrir WhatsApp no marca envío y su reintento es
    idempotente. Esta prueba registra seguimiento; no abre ni envía un WhatsApp.
11. RSVP por 5 personas con 4 cupos falla; confirmar 4 crea exactamente 4 asientos.
12. Dos solicitudes concurrentes para un asiento dan 200/409; repetir la ganadora
    no suma entradas. Llegan 2 personas y permanecen disponibles otros 2 pases.
13. Con 4 dentro no se acepta otro ingreso; token inexistente devuelve 404. Salir
    y reingresar funciona. No se puede borrar un grupo con pases utilizados.
14. Aprobación de pago manual ficticio activa una vez y admite reintento.
15. Un pago BCP ficticio no verificado no se aprueba desde datos del navegador.

La limpieza restringe sus consultas a UUID creados por el propio ensayo y slugs
con su prefijo aleatorio. Elimina y comprueba asientos, bitácoras, invitados,
versiones, invitaciones, socio, suscripción y pagos ficticios. No altera eventos
de clientes ni cuentas de autenticación.

## Verificación visual y del PNG

En `/dev/operations`, con el componente real de `QrCard`, se descargó
`pase-ENK-QA2026.png` (93.011 bytes). Un lector independiente (`html5-qrcode`)
decodificó el PNG y comprobó la igualdad del token ficticio. Dimensiones leídas
por el navegador: 900 × 1360 px. Sin desbordamiento horizontal a 390 px.
La activación de audio por gesto se reflejó correctamente. La vista de recepción
sin sesión mostró «No registrar ingreso / No autorizado»; no abrió la cámara.

![Pase ficticio y bloqueo de recepción sin sesión](../tmp/audit-2026-10/operations-browser-proof.jpg)

## Límites y pendientes

- Falta aceptación en teléfonos iOS/Android físicos para cámara, permisos y sonido.
  El escritorio y las pruebas HTTP no acreditan esa compatibilidad física.
- Teléfono, grupo y preferencia siguen en `builder_config.guestMeta`, guardados
  con el constructor. Su persistencia no es atómica con el alta SQL del invitado.
- Ceremonia/recepción es una preferencia informativa; no restringe QR por sede.
- WhatsApp no tiene envío masivo automatizado ni recibos de entrega o lectura.
- PNG disponible sin conexión; recepción sigue requiriendo conexión al servidor.
- No hay integración con Apple/Google Wallet ni adaptador BCP activo.
- Cambios locales y despliegue directo mediante Vercel CLI; no se creó commit ni
  se envió el código a GitHub en este bloque.

## Despliegue de producción

Desplegado y activado en <https://enkarta.vercel.app>:

- Deployment: `dpl_9t1X7LHnsfh9Wp31HJt6aSX74pPD`, estado `READY`.
- URL inmutable:
  <https://enkarta-qq57ixrn8-juangabrielchoqueortiz7-engs-projects.vercel.app>.
- Deployment anterior disponible para rollback:
  `dpl_BD4ZN391y8UTUQSyV75SwYkvydcJ`.
- Las **15 comprobaciones HTTP se repitieron correctamente en producción**:
  `tmp/audit-2026-10/operations-production-http.json`.
- Limpieza de producción: `verified-no-fixtures-remain`; llamadas bancarias: 0.
- **129 recursos originales (46.481.464 bytes)** coinciden con sus SHA-256
  archivados después del despliegue:
  `tmp/audit-2026-10/operations-production-originals.json`.
- Inicio y catálogo responden 200; `/dev/operations` devuelve 404:
  `tmp/audit-2026-10/operations-production-smoke.json`.

El despliegue no cambió variables de entorno, no activó BCP y no aplicó SQL nuevo.
Los permisos, publicación y pagos se comprobaron junto al bloque operativo para
detectar regresiones de la Fase 1.
