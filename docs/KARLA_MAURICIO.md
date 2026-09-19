# Karla y Mauricio · invitación 8

Referencia: https://invitali.com/378-karla-y-mauricio/?m=Carlos&n=3%20Pases

Muestra: `/muestra/karla-y-mauricio` (`?full=1` omite la entrada).
Variante nativa `karla-y-mauricio`, configuración independiente `karlaMauricio`, plantilla SQL `dolcevita`.

## Diseño y edición

Entrada con fondos distintos para móvil y escritorio, orquídeas nude en las esquinas, portada fotográfica con fundido blanco, pases sobre franja beige, fecha, padres, lugares, vestimenta, regalos, fotografía, adultos y confirmación.
Nombres, fecha, lugares, familia, pases, foto principal, vestimenta, mensaje de regalo y QR usan campos existentes. Textos adicionales, visibilidad de secciones, fondos, adornos, lista de regalos y velocidad de scroll se editan en el inspector propio. Elementos permite sustituir corazón, ceremonia, recepción, vestimenta y cámara.
Los formularios de Google de la referencia no reciben respuestas desde la muestra. La confirmación usa Enkarta en modo demo y el enlace de fotografías se configura con el campo de galería. No se hereda ningún enlace, cuenta, música ni dato de otra pareja.

## Recursos originales

12 archivos nuevos con URL completa, SHA-256 y copias idénticas en `Iconos INVITALI/karla-mauricio-recursos.json`. Reutiliza tipografías, vestimenta y logo de lista de regalos ya locales. El importador de JSON/música sigue en 29 originales locales sin pendientes.
Corazón original del usuario: `/lottie/boda/annie-corazones-original.json`. La referencia aplica sobre el contenedor brightness(1.71), contrast(1.22), saturate(.46), hue-rotate(80deg); se reproduce por instancia sin modificar JSON. Una paleta personalizada sustituye este filtro. Ancho observado móvil 72px.
Los filtros de separador floral, ceremonia/recepción, vestimenta y logo comercial se aplican por instancia. Los originales conservan sus bytes.
La referencia observada no proporciona una URL de canción válida; no se inventa música. Se puede cargar desde el constructor.

## Movimiento

El fondo perlado usa capa fija con desplazamiento de scroll (velocidad original 7.4) y también sigue el contenedor de previsualización. Las semillas son un efecto CSS separado, no Lottie: tamaño 10–50px, duración 7–12s, desplazamiento vertical -150 a -550px, horizontal ±100px y giro completo, con aparición aleatoria cada 1–3s. Se usan la imagen y parámetros originales. Se limpia el temporizador y las partículas al desmontar, ocultar página o desactivar movimiento. Se respeta movimiento reducido y ahorro de datos.

## Verificación

Typecheck y 68 pruebas del constructor. Prueba de persistencia de textos, secciones, scroll y fondos; auditoría de recursos locales; verificación SHA-256 de cada copia. Revisión visual móvil y escritorio, apertura, QR y formulario de muestra sin enviar respuestas.
La paleta solicitada conserva texto #b3907a sobre fondo claro; el validador existente detecta 2.9:1. La prueba exige que siga informando contraste insuficiente; no se desactiva la validación para publicar.
