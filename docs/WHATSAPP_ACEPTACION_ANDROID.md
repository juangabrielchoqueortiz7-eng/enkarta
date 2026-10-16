# Aceptación visual de WhatsApp en producción — Android / Chrome

Completada el 16 de octubre de 2026 en https://enkarta.vercel.app. La versión de
aplicación probada es `1efe98b614e6c33ff62d79e46b42ad3582f37eeb`. El usuario realizó
los pasos en su Android con Chrome y confirmó los resultados; no se presenta esta
evidencia como una inspección visual automatizada del agente.

## Recorrido confirmado

1. Evento aislado **QA Visual WhatsApp**: dos grupos ficticios, cinco pases, dos
   pendientes, cero confirmados y cero dentro. En la ficha de QA Visual Pérez,
   la variable desconocida y el enlace ausente mostraron errores y bloquearon abrir
   WhatsApp. El predeterminado explícito mostró nombre y enlace personales correctos
   y habilitó la acción. Lectura y desplazamiento sin textos cortados ni desbordamiento
   horizontal. Respuesta del usuario: «Si correcto esta todo bien».
2. El recordatorio sin enlace quedó bloqueado. Su predeterminado mostró nombre,
   enlace y texto de recordatorio correctos. Volver a invitación expuso de nuevo los
   errores de la plantilla original: no heredó la elección del recordatorio.
   Respuesta del usuario: «si coincide».
3. La cola mostró dos contactos. El primero exigió corregir o elegir el predeterminado;
   avanzar sin abrir WhatsApp dejó los errores de plantilla del segundo visibles,
   sin heredar la elección anterior. Su predeterminado mostró su propio nombre y
   enlace diferente. La revisión finalizó y volvió a invitados.
   Respuesta del usuario: «si todo coincide».

No se pidió abrir WhatsApp, enviar mensajes ni marcar envíos manualmente. Las tres
verificaciones del backend conservaron exactamente los registros iniciales y las
dos plantillas guardadas: cero cambios de seguimiento, cero pases materializados y
cero movimientos. Ninguna prueba realizó llamadas al banco.

## Limpieza comprobada

El evento y sus registros quedaron eliminados con estado
`verified-no-fixtures-remain`. Se comprobó ausencia en diez ámbitos: invitaciones,
invitados, respuestas, versiones, notas de revisión, vigencia, analítica, operaciones
de importación, movimientos y pases. El acceso temporal quedó revocado (login 401),
la sesión anterior dejó de acceder al panel (403) y el enlace público devolvió 404.
Los archivos locales de credenciales temporales se eliminaron.

Los 597 archivos protegidos locales conservan sus bytes. BCP continúa desactivado.
Esta aceptación no certifica Safari/iOS, cámara, sonido ni envío real por WhatsApp.

## Evidencias

`tmp/whatsapp-visual-acceptance/` conserva `human-step-01.json`, `human-step-02.json`,
`human-step-03.json`, `backend-verification.json`, `scope.json`, `prepare.log` y
`cleanup.log`. Son evidencias locales fuera de Git y del despliegue; los accesos
efímeros de esta prueba ya no son utilizables.
