# Muestra Laura y Andrés

Ruta local: `/muestra/laura-y-andres`.

Referencia solicitada: https://invitali.com/53-laura-y-andres/?id=4EGxma

La muestra reproduce la composición del primer enlace: sobre de entrada, portada con carrusel y curva, cita, bienvenida, fecha, ubicaciones, vestimenta, itinerario, galería, regalos, indicaciones, sobre de confirmación y despedida. Fotos, fuentes, sobres, sello y separador están guardados en `public/invitations/laura-andres`. Los iconos se adaptan de la biblioteca local y no son todos idénticos a los de la referencia. El pie identifica Enkarta.

## Uso en el constructor

En `/admin/new`, elegir **Laura y Andrés** y **Usar y editar** después de seleccionar el paquete. El diseño utiliza `template: dolcevita` y `config.designKey: laura-y-andres`, sin alterar las invitaciones Oliva existentes ni exigir un enum SQL nuevo. `premiumFor` resuelve el mismo componente en el constructor y la ruta pública. La acción existente **Duplicar invitación** conserva la configuración, los medios y la fecha límite de confirmación.

- Contenido: nombres, fechas, lugares, invitado, pases, padres, itinerario, regalos y WhatsApp; campos específicos para todos los textos del diseño, colores de vestimenta, carruseles, papelería, hospedaje y fecha límite.
- Bloques: controles de las secciones de esta composición, sin convertirla al esquema genérico que cambia su aspecto.
- Elementos: selector de iconos por sección, con colores y velocidad.
- Medios y Estilo: fotos, pies de foto, música, fuentes, paleta, radios y sombras. Animación usa el motor existente de transiciones; Decoración usa la capa de decoración compartida.

La confirmación usa `ConfirmationForm` dentro del sobre: invitados, pases, mesa y QR siguen el contrato y los servicios existentes. En muestras, borradores privados y editor funciona en modo de prueba y no envía respuestas. El formulario público utiliza el slug y el invitado autorizado. No hay un segundo formulario al pie ni dos pantallas de entrada. La fecha límite se guarda y se envía al formulario. El calendario se genera a partir de los datos editados.

La música sigue utilizando el archivo público de la referencia hasta que se sustituya en Medios. Los mapas y la galería externa del ejemplo deben reemplazarse al personalizar otro evento. Los límites de fotos también se aplican a los carruseles; repetir una foto no consume un cupo adicional.

## Animaciones

Tres animaciones Lottie propias, sin dependencias externas, registradas en la categoría Boda y disponibles para cualquier invitación:

- `/lottie/boda/laura-sin-ninos.json`
- `/lottie/boda/laura-corazones.json`
- `/lottie/boda/laura-lluvia-de-sobres.json`

Son recreaciones locales, no los JSON originales de Invitali: el servidor devolvió 403 y el navegador bloqueó la apertura de los archivos JSON. Los restantes iconos utilizan la biblioteca existente y pueden cambiarse desde el selector.

Verificación: 60 pruebas de constructor y 63 de servicios; TypeScript, lint y compilación de producción correctos (advertencias preexistentes de imágenes en `src/app/invitacion-invitali/page.tsx`). Cambio de nombres, ocultación de galería y guardado/reapertura comprobados en `/dev/invitation-quality`, que reutiliza los paneles reales. No se crearon registros ni se enviaron confirmaciones reales: la sesión administrativa requiere iniciar sesión. La muestra conserva el sobre, la música y la galería de la revisión visual anterior.
