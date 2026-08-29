# Servicios · Fase 2: paquetes coherentes y accesos separados

Estado: implementado localmente, pendiente de commit y despliegue. Migración 007 aplicada por el usuario y comprobada mediante `node scripts/check-services-db.cjs --phase2`: columnas disponibles y tablas privadas protegidas, sin modificar registros. La fase 1 quedó publicada con el commit `93bd23f` el 28/08/2026, verificado contra el registro de compilación de Vercel y su alias de producción.

## Una sola matriz

`src/lib/packages.ts` controla la tabla comercial, los precios, la configuración y los permisos. No se cambiaron precios.

| Paquete | Precio Bs / USD | Confirmaciones | Acceso del cliente | Fotos |
| --- | --- | --- | --- | --- |
| Plus | 750 / 107 | WhatsApp | Revisión de diseño separada | 0 |
| Premium | 930 / 133 | Formulario | Planilla de consulta y CSV, sin edición ni QR | 8 |
| Exclusive | 1100 / 157 | Formulario y gestión | Panel operativo y escáner | 20 |

Los restantes servicios (música, entrada, hospedaje, calendario, mesas, compartir fotos y personalización de color) se resuelven desde la misma matriz. La galería se limita recursivamente, contando las fotos visibles de cada viewport; los datos originales no se borran. Los bindings se verifican después de resolverlos para que no reintroduzcan funciones excluidas.

Las altas nuevas requieren un paquete explícito, tanto en la selección visual como en las APIs administrativas y la integración `/api/invitations`. Las integraciones deben enviar `package: "plus" | "premium" | "exclusive"`; no se adivina un paquete cuando falta.

## Contratos anteriores y adicionales

- Solo los documentos con `serviceContract.version = 2` adoptan los límites nuevos. No hay migración automática de acuerdos anteriores.
- Configuración muestra el contrato, los servicios incluidos, los que están ocultos y las excepciones. Los toggles nunca conceden servicios no contratados.
- Un adicional requiere servicio, valor, motivo y fecha; se registra como contratado o como condición anterior. Esto registra el alcance, no efectúa un cobro ni acredita un pago.
- Pasar una invitación anterior a la matriz requiere confirmación explícita. Se conservan sus permisos operativos mediante excepciones visibles. Hay que revisar esas excepciones y los servicios visibles antes de publicar; no se debe usar esta acción para recortar un acuerdo sin autorización del cliente.
- Restaurar una versión visual sin contrato no elimina el acuerdo actual. El render publicado usa el contrato operativo vigente aunque su snapshot visual sea anterior.
- Plus conserva su paleta: el inspector global deshabilita su personalización; el servidor rechaza cambios de tema, colores base y colores de bloques existentes sin el adicional. Añadir o quitar bloques no queda bloqueado. Esto no es un sistema de cobro ni una defensa frente a un administrador que modifique datos directamente en Supabase.

## Accesos

- `/revision`: credenciales propias de revisión. Puede consultar el diseño y sus versiones, comentar y revisar. No puede crear/publicar versiones, ver la planilla, gestionar invitados ni registrar ingresos. No puede sobrescribir notas del equipo o de otro evento por su id.
- `/panel`: Premium consulta/exporta; Exclusive opera. Los contratos nuevos no usan esta sesión para revisar el diseño: requieren el acceso separado. Los contratos antiguos conservan su acceso combinado.
- `/panel/scan` y `/api/checkin` comprueban el permiso QR del evento. También lo comprueban cuando el operador es administrador. Un QR conservado en la base no habilita un servicio retirado del contrato.
- Las cookies de revisión y operación tienen dominios de firma distintos y están ligadas a la contraseña vigente. Cambiarla o deshabilitar el acceso invalida la sesión correspondiente. Los clientes tendrán que iniciar sesión otra vez al desplegar esta versión; las contraseñas guardadas siguen funcionando.
- Nunca se envían hashes de contraseñas ni la copia cruda de `builder_config` al público, a la planilla ni a revisión. La vista pública solo recibe el invitado de su enlace, no el padrón completo.
- La planilla exporta solo columnas de consulta. Las fórmulas potenciales de CSV se neutralizan; no incluye tokens ni códigos QR.

## Activación

1. Conservar el respaldo de producción. La base debe tener aplicadas las migraciones existentes, incluida 006.
2. Ejecutar **todo** `migrations/007_separate_design_review.sql` en Supabase. Añade `review_email`, `review_password_hash` y un índice único de correo de revisión; no modifica credenciales antiguas ni invitados. Se puede reaplicar.
3. Verificar sin consultar datos privados:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invitations'
  AND column_name IN ('review_email', 'review_password_hash');

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'invitations_review_email_unique';
```

4. Preparar vista previa, ejecutar `npm run verify` y probar un evento ficticio por paquete. No usar invitados reales para el ensayo.
5. Desde Configuración, crear por separado el acceso de revisión y el de planilla/operación. Si falta 007, el editor informa la migración pendiente y no muestra un falso guardado.
6. Tras aprobar, hacer commit y desplegar. Esta fase todavía no se ha subido a producción.

## Verificación y límites

- Pruebas automatizadas: 31 de constructor y 34 SQL/API. Base PostgreSQL aislada en memoria; se verifican los guards y firmas reales, sin utilizar credenciales ni invitados de producción.
- Cubren precios, matriz, extras, colores, galerías anidadas y responsive, bindings, API de integración, planilla/CSV, aislamiento de eventos, rechazo de QR en Premium, acceso de revisión, revocación por contraseña y notas ajenas.
- La mesa de pruebas `/dev/services` solo existe en desarrollo y usa datos ficticios. En producción devuelve 404.
- Revisión visual local: selección obligatoria de paquete, registro de adicional QR con sus dependencias, filtros de respuestas, tarjetas a 390 px y tabla a 1280 px. Sin errores de consola observados en esa prueba; no se crearon invitaciones ni confirmaciones reales.
- La fase 1 sigue pendiente de aceptación con dos dispositivos reales simultáneos. Las pruebas en memoria no equivalen a sesiones de PostgreSQL independientes ni a una prueba de cámara.
- La actualización automática y el acceso de puerta están implementados localmente en [fase 3](SERVICIOS_FASE_3_PANEL_Y_PUERTA.md); requieren 008 y despliegue conjunto. La entrega aislada de fase 2 utilizaba Actualizar.
- La automatización de vigencias 30/60/90 días pertenece a fase 4; aquí se conservan los valores comerciales, sin ejecutar nuevas tareas de caducidad.
- El registro comercial/entrega de adicionales completos pertenece a fases posteriores. Aquí se documentan excepciones funcionales y se aplican permisos; no hay cobro ni aprovisionamiento de dominios/entregas express.
