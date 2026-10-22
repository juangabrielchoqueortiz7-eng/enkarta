# Eliminación segura desde el constructor

El flujo anterior enviaba dos DELETE ante dos acciones antes del siguiente render, permitía eliminar una muestra y navegaba tras desmontar o recibir HTTP 200 con success=false. Además, el autoguardado continuaba mientras se eliminaba la fila. Se reprodujeron estos casos con el constructor real en memoria.

La operación adquiere un bloqueo antes de confirmar, confirma el texto inline activo y vuelve a comprobar contexto y operaciones pendientes. El consentimiento identifica la invitación y avisa que la eliminación permanente descarta cambios sin guardar y subidas pendientes. Cancelar conserva el borrador y no envía DELETE. Una muestra, otro contexto, un guardado, publicación o duplicación pendiente impiden iniciar la acción.

Después de aceptar, una vista temporal sustituye los paneles del editor. Las referencias del padre bloquean también callbacks retenidos de edición, historial, guardado, autoguardado, publicación, duplicación y vista privada. Los datos y el historial del padre se conservan para recuperar el editor ante un rechazo; las subidas pendientes se desmontan con el consentimiento, sin prometer revertir operaciones de almacenamiento ya iniciadas.

El transporte y JSON comparten 25 segundos. Solo success=true confirma la eliminación; el endpoint mantiene su contrato y sus permisos. Un 4xx recibido dentro del plazo constituye rechazo definitivo y devuelve el mismo borrador al editor, permitiendo un intento explícito y reanudando el autoguardado. Una pérdida de conexión, 5xx, timeout o éxito ilegible conserva el bloqueo: abortar la espera no revierte la eliminación. Se ofrece revisar el panel en otra pestaña y descargar el estado local capturado tras confirmar el texto inline. No hay reintentos automáticos ni consulta global de clientes. El bloqueo pertenece a esta instancia, sin prometer idempotencia entre pestañas o recargas.

La confirmación limpia la marca de cambios pendientes y navega al panel correspondiente. Si falla la navegación, permanece «Invitación eliminada» con enlace de regreso. Desmontar o cambiar de contexto invalida respuestas tardías; la repetición de efectos de React 18 conserva la incertidumbre de una solicitud enviada. El foco de la vista temporal pasa a su título y los mensajes usan una región de estado accesible. La zona de peligro conserva su función con contraste, foco visible e icono SVG.

Se aplican Impeccable en modo Operate y las guías de React de Vercel. El detector no señala hallazgos. No se modifican renderers, presets ni recursos de invitaciones; no hay SQL ni dependencias nuevas. BCP sigue bloqueado y la modificación preexistente de la migración 021 permanece excluida.

Las 17 regresiones utilizan InvitationBuilder, el hook y Editable reales, con transporte y eventos aislados en memoria. Cubren cancelación, reentrada, respuestas inválidas, plazos, rechazo y recuperación, barrera frente a acciones retenidas, texto inline, cambio de contexto, desmontaje y efectos repetidos. No equivalen a gestos físicos ni a una aceptación visual: el navegador automatizado está deshabilitado en esta sesión y las manuales continúan pendientes.

El código previo `dab8149` obtiene 2 aciertos y 15 fallos con las 17 regresiones nuevas, sin cancelaciones. Se adaptaron cuatro selectores de las pruebas de configuración al texto accesible del botón sin emoji, conservando sus verificaciones de contexto y desmontaje. El primer verify se detuvo en esos selectores; tras corregirlos las 60 pruebas del grupo pasan.

El verify final terminó con salida 0: **1.891 pruebas correctas en 64 ejecuciones**, lint, TypeScript y build de **65 páginas**. Se conservan las advertencias previas de imágenes heredadas, sin supresiones nuevas. Los **597 archivos protegidos** y el hash de la migración 021 coinciden con la línea de base.

Los resultados de producción se registrarán tras terminar la verificación y limpieza ficticia.
