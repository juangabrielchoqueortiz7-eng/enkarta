# Aurelia y Velada

Dos diseños independientes de la colección Atelier. Ambos incluyen invitado, pases, familia, fecha, calendario, lugares, itinerario, galería, vestimenta, regalos y confirmación. Se editan desde el constructor nativo.

- Aurelia: retrato ovalado, orquídeas transparentes, papel perla, itinerario vertical y galería con fotografía principal y miniaturas.
- Velada: verde profundo, flores suspendidas, guirnalda SVG original, destellos cálidos, banda fotográfica con scroll y álbum alineado.

Recursos reutilizados sin descarga: orquídeas de Karla, acuarela de Jardín de Seda y fotografías locales. Los JSON originales de corazones, pareja, cámara e itinerario conservan sus bytes; el color se aplica en cada instancia. Las luces y los separadores nuevos son SVG/CSS propios, no se presentan como JSON originales.

`config.atelier` conserva decoración y encuadres. Los diseños comparten controles del constructor y tienen componentes/CSS independientes. Los movimientos respetan el modo reducido y la visibilidad de la página. El formulario de Velada mantiene contraste también después de confirmar.

Validación: tipos, lint, 74 pruebas del constructor y 63 pruebas de servicios. Revisión visual de portadas, galería móvil, selección y ampliación de fotos, confirmación de muestra. No se enviaron respuestas de eventos reales.

Para publicación se corrigieron filtros de valores nulos en builder-state y sections, compatibles con los tipos de la versión de Supabase del lockfile. No cambia el comportamiento de escritura ni requiere migraciones.
