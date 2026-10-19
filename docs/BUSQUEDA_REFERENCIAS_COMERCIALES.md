# Búsqueda de referencias comerciales

## Alcance

Admin → Ventas permite consultar una referencia comercial completa `EK-XXXXXXXX`. La búsqueda exacta usa el índice único existente de `commercial_leads.reference`: encuentra contactos anteriores a los 180 días y fuera del límite del listado del embudo. No requiere una migración nueva.

La ficha es de **solo lectura** y muestra referencia, estado consultado, diseño público, paquete, fecha y nota. Se puede volver a consultar con el mismo botón. La edición permanece en las filas existentes del listado; no se monta un segundo editor independiente del mismo contacto. Una consulta no confirma mensajes enviados, reservas ni pagos, y no crea eventos de seguimiento.

No cambia el período, los filtros ni los cálculos del embudo. Sus cifras y listado mantienen los límites actuales de 180 días / 1000 contactos y eventos limitados; encontrar una referencia histórica no la incorpora a esas métricas.

## Interacción y privacidad

- Solicitud explícita por botón o Enter; no consulta en cada tecla. Acepta espacios exteriores y minúsculas; exige los ocho caracteres hexadecimales completos.
- No acepta comodines, prefijos, referencias de pago `ENK-...`, parámetros duplicados ni mensajes completos como búsqueda.
- Distingue entrada inválida, ausencia comprobada, pérdida de conexión, sesión terminada, respuesta incompleta y error de base de datos.
- Al cambiar o limpiar la entrada cancela la solicitud anterior y descarta respuestas tardías, incluso si el transporte ignora la cancelación. Tiempo de espera: 20 segundos.
- El resultado no se persiste en almacenamiento del navegador ni se incorpora a la URL. Limpiar lo retira del estado del componente.
- El servidor autentica al administrador antes de validar o consultar. Respuestas `Cache-Control: no-store`, sin `session_hash`, credenciales ni información bancaria.
- Los controles nuevos usan texto de 16 px, foco visible y objetivos táctiles de aproximadamente 44 px. No cambia estilos globales ni invitaciones.
- Si falla una actualización del embudo, avisa que las cifras visibles corresponden a la carga anterior. Si el embudo no carga inicialmente, el buscador sigue disponible.

## Verificación

- 7 regresiones de contrato/render de cliente: normalización, rechazo de entradas, GET privado, whitelist, errores, datos de otra referencia, ficha sin controles de edición y fixture exclusivo de desarrollo.
- 6 regresiones PostgreSQL: permisos con sesiones reales de distintos roles, referencia antigua excluida del embudo pero localizable, normalización, parámetros inválidos, ausencia y errores sin exposición interna ni escrituras.
- Fixture `/dev/services/commercial-lookup`: datos ficticios en memoria, transporte simulado, sin red de aplicación real. La ruta responde 404 en producción.
- Revisión local en navegador a 390×844 y 1440×1000, errores y carreras entre búsquedas. Evidencia privada en `tmp/commercial-lookup/visual.json` y capturas móvil/escritorio.
- Aceptación HTTP de producción con `scripts/check-commercial-lookup-http.cjs`: un contacto ficticio antiguo con alcance persistido antes del INSERT, lecturas y borrado por ID + hash + placement + campaña. Admite `--resume-cleanup` con el mismo informe ante interrupción. No consulta fichas de clientes reales, no envía mensajes y no llama al banco.

## Pendientes independientes

La edición comercial existente necesita una operación transaccional que guarde contacto e historial juntos, control de conflictos entre dispositivos y reconciliación de respuestas de escritura inciertas. Esta mejora de consulta no modifica ni acredita esos comportamientos. También queda separar las métricas agregadas del límite de filas del listado. Son cambios posteriores con regresiones propias; no se presentan como resueltos por añadir un buscador.

BCP sigue bloqueado. No se modificaron diseños, presets ni recursos originales.
