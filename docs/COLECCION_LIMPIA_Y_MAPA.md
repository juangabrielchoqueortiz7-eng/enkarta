# Cinco ediciones y mapa editable

Nuevas variantes nativas: Siena (`siena-editorial`), Jardín de Salvia (`jardin-salvia`), Carta Malva (`carta-malva`), Costa Celeste (`costa-celeste`) y Noche Champagne (`noche-champagne`). Comparador público local: `/muestra/coleccion-limpia`. Paletas y composiciones propias: portada editorial asimétrica, arco centrado, carta enmarcada con retrato circular, portada panorámica con mapa, y papelería nocturna. Fotografías de muestra reutilizadas de la biblioteca existente, sin nuevas descargas de Invitali.

Se registran como variantes de la base SQL dolcevita y comparten los controles de contenido y la infraestructura de servicio de María/Mario. Cada starter genera configuración nueva. No asignan música, fondo marino o mapa a las invitaciones anteriores. El formulario sigue siendo Enkarta y los servicios respetan el contrato. No se crearon migraciones ni publicaciones.

Mapa: `config.travelRoute` contiene enabled, origin, destination, originLat/Lon, destinationLat/Lon, curve, seconds, plane, color y landColor. Disponible en los cinco modelos y María/Mario desde los campos del diseño. Elegir una ciudad conocida actualiza nombre/coordenadas. Otra ciudad necesita nombre y coordenadas; no hay geocodificación externa automática. Demo interactiva `/muestra/mapa-editable` solo mantiene cambios durante la sesión de página; el constructor los serializa con el resto de config. El toggle conserva disponible el video original.

SVG con fondo transparente, límites de países, ruta cuadrática y avión siguiendo la tangente. La vista se adapta a ambos puntos y contempla el cruce del meridiano 180°. El avión se pausa al ocultar la página, con movimiento reducido, ahorro de datos o preset sin animación. No modifica JSON ni MP4 originales. Cartografía generalizada: islas pequeñas pueden no aparecer en esta escala, pero su marcador sigue sus coordenadas. Nombres largos pueden necesitar abreviación en el campo de etiqueta.

Fuentes cartográficas de dominio público Natural Earth (descargadas 2026-09-09):
- https://www.naturalearthdata.com/about/terms-of-use/
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
Originales conservados en `public/maps/`; geometría proyectada derivada en `src/lib/travel-land.json`. No volver a descargarlos para futuras rutas. No requiere claves API ni solicitudes de red para dibujar el mapa.

Validación: 71 pruebas del constructor, incluida independencia de variantes, persistencia de coordenadas, valores inválidos y meridiano 180°. TypeScript y lint de los componentes añadidos. Navegador: cinco composiciones de escritorio, cambio real de ciudades, versión móvil de Noche Champagne sin desbordamiento. Las invitaciones anteriores conservan su modo de video por defecto.

## Rediseño por revisión del usuario — 2026-09-10
La primera propuesta resultó demasiado similar. Se sustituyó el wrapper de MariaMario por un renderer de colección independiente: cinco portadas, órdenes de secciones y presentaciones de itinerario diferenciados. Siena: villa/cipreses, relato editorial y secuencia fotográfica. Salvia: flores grabadas, doble fotografía curva e itinerario de jardín. Malva: sello interactivo que abre una carta, fotografías como recuerdos impresos y momentos en tarjetas. Costa: postal, pase personalizado, tablero de itinerario y galería horizontal. Noche: constelación, órbitas y programa vertical.

`CollectionArt.tsx` son ilustraciones SVG nuevas realizadas en código, no originales de Invitali. Se usan también en las transiciones con scroll. Los JSON de itinerario sí reutilizan originales archivados de ceremonia, cóctel, cena, vals y música. Textura de papel ya existente, sin descargas nuevas.

Editor propio `CleanDesignFields` con fotografías, textos, secciones, ruta y editor de itinerario (añadir, quitar, subir, hora, lugar, nota e icono). Muestras soportan m/n para nombre/pases; producción usa activeGuest del sistema. ConfirmationForm sigue el contrato real, muestra no envía. Campos de formulario nocturno con fondo y texto coordinados para contraste.

El SVG de viaje incorpora máscara de borde desvanecido, mapa con volumen suave, retícula, brújula, pulsos de marcadores, línea progresiva y avión con estela. No hay rectángulo de fondo. Sigue siendo ilustración cartográfica generalizada, no recrea el MP4 original.

Verificado: TypeScript/lint, pruebas de persistencia, las cinco composiciones en navegador, apertura de carta, mapa visible y formulario nocturno a 390px sin desbordamiento. Reemplaza la descripción de implementación anterior basada en estilos sobre MariaMario. No se cambian las invitaciones originales.
