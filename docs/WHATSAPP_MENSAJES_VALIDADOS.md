# Revisión de mensajes antes de abrir WhatsApp

La ficha de un invitado y la cola de revisión comparten la validación y vista previa
del texto personalizado. La ficha permite elegir **Invitación** o **Recordatorio**;
este último solo aparece mientras el invitado continúa pendiente. Se utilizan los
datos guardados, sin incorporar cambios de edición todavía no comprobados.

## Validación y recuperación

- Se reconocen `{nombre}`, `{nombre_invitado}`, `{link}`, `{link_unico}`, `{pases}`,
  `{cantidad_pases}`, `{mesa}` y `{codigo}`. Una variable desconocida, con espacios,
  llaves incompletas o anidadas bloquea preparar/copiar el mensaje desde la cola.
- El texto debe contener `{link}` o `{link_unico}`. El enlace generado se verifica
  contra la ruta personal y el identificador público del invitado; no se copia un
  enlace fijo escrito para otra familia.
- La plantilla admite hasta 1.200 caracteres. El resultado personalizado tiene un
  límite de revisión de 4.000 caracteres establecido por Enkarta; no representa un
  contrato ni una garantía de la API de WhatsApp.
- La sustitución se hace una sola vez: unas llaves dentro del nombre de un invitado
  se conservan como datos y nunca se evalúan como variables adicionales.
- Ante un texto inválido, **Usar mensaje predeterminado para este contacto** permite
  continuar esa revisión sin modificar la plantilla guardada. La elección vive solo
  en memoria y se vincula al contacto, contenido, tipo de mensaje y plantilla.
  Otro contacto o un cambio de contenido exige revisar de nuevo. Recargar recupera
  la posición de la cola existente, pero no persiste textos, teléfonos ni esta elección.
- La comprobación se repite al pulsar la acción, además de desactivar su botón.
  No se prepara una apertura con un mensaje inválido o mientras se actualiza el contacto.

En el constructor, **Mensajes personalizados de WhatsApp** muestra un ejemplo ficticio
para cada plantilla, errores asociados al campo y **Restablecer mensaje predeterminado**.
Esta acción sí cambia explícitamente el campo del diseño. Un valor vacío usa el
predeterminado y no vuelve a heredar una plantilla antigua. Los cambios siguen el
guardado del constructor; no publican automáticamente la invitación.

## Significado del seguimiento

El estado visual pasa de «WhatsApp abierto» a **Apertura solicitada**: el navegador
puede solicitar abrir WhatsApp, pero no demostrar que se abrió o que el mensaje se
envió, entregó o leyó. El valor SQL `opened` se conserva para compatibilidad. No se
reescribe el historial ni se añaden estados de entrega inventados.

Ver o validar una plantilla, elegir un predeterminado o continuar por la cola sin
abrirla no registra seguimiento. La marca manual conserva su significado: declaración
del equipo, independiente de la validación del texto. Los reintentos de seguimiento y
la revisión recuperable existentes siguen funcionando por separado.

## Pruebas y límites

Siete regresiones nuevas comprueban alias, sustitución única, acentos, saltos de línea,
codificación de URL, enlaces de otro invitado, URL ambiguas/inválidas, variables,
límites y alcance de la alternativa predeterminada. `npm run verify` ejecuta **307
regresiones**, lint, tipos y build. Las advertencias previas de imágenes originales
se conservan sin reemplazar sus recursos.

La revisión visual local cubre edición de plantillas, ficha individual, invitación y
recordatorio inválidos, predeterminados aislados y foco/lectura a 1280 y 390 px.
Las aperturas locales usan un callback ficticio; no abren WhatsApp ni envían mensajes.

La suite HTTP admite `--message-browser-window` para crear dos contactos y plantillas
con errores dentro de su evento ficticio. Tras la aceptación compara versiones,
seguimientos y movimientos directamente en Supabase; exige cero cambios operativos y
plantillas guardadas intactas, luego limpia su ámbito. No enviar mensajes durante esta
prueba. La emulación del navegador no certifica una nueva aceptación física en iOS/Android.

No hay migración SQL, dependencia, cambio de CSP o variables de entorno. BCP sigue
desactivado. No se modifican los diseños, presets, música o recursos de invitaciones.

## Aceptación manual de producción completada

El 16 de octubre de 2026 el usuario confirmó en Android / Chrome la ficha individual,
el recordatorio y el cambio entre contactos en la cola. El backend comprobó cero
cambios de seguimiento o movimientos y plantillas guardadas intactas. El evento
ficticio fue eliminado y su acceso revocado. Detalles y límites en
[WHATSAPP_ACEPTACION_ANDROID.md](WHATSAPP_ACEPTACION_ANDROID.md).
