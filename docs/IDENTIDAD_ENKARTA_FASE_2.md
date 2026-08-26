# Identidad Enkarta — Fase 2

## Objetivo

Convertir las primeras cuatro colecciones prioritarias en experiencias reconocibles por su composición, no solamente por su color. Esta fase conserva las claves técnicas `azure`, `primicia`, `passport` y `paradise`; sus nombres públicos continúan siendo Lunaria, Áurea, Atlas y Verdealma.

## Firmas visuales aplicadas

| Colección | Firma | Decisiones principales |
| --- | --- | --- |
| Lunaria | Jardín lunar etéreo | Halo de acuarela, marco translúcido, geometría asimétrica suave y tarjetas de pétalo |
| Áurea | Edición extraordinaria | Papel editorial, tinta, acento dorado, folio de edición y jerarquía de portada periodística |
| Atlas | Cuaderno de viaje | Retícula cartográfica, número de viaje, sellos, papel táctil y cronograma tipo bitácora |
| Verdealma | Jardín envolvente | Ramas lineales propias, arco enmarcado, profundidad bosque y cronograma botánico vertical |

## Mejoras compartidas

- Firma discreta de colección en cada portada.
- Cuentas regresivas convertidas en componentes legibles y coherentes con cada universo visual.
- Itinerarios móviles en una sola columna con conexión vertical, icono, título y hora.
- Separación suficiente entre acciones, texto y ornamento.
- Los iconos respetan `iconColor` y las paletas multicolor configuradas en el editor.
- Corrección de acentos y microcopias visibles.
- Fondos con textura construida en CSS/SVG para evitar recursos externos y mantener buena carga.

## Reglas de continuidad

1. Una firma de colección identifica, pero nunca compite con los nombres de los protagonistas.
2. En móvil, un itinerario nunca distribuye más de un evento por fila.
3. Una cuenta regresiva debe conservar cuatro columnas solo si cada etiqueta sigue siendo legible a 360 px.
4. El color de iconos configurado por el usuario prevalece sobre el valor de fábrica.
5. Las personalizaciones existentes conservan contenido, URL, imágenes y clave técnica.

## Criterio de salida

- Las cuatro portadas se distinguen aun en escala de grises por su composición.
- Los cronogramas no comprimen texto en columnas estrechas en móvil.
- Los contadores tienen jerarquía numérica, etiqueta legible y superficie propia.
- No hay referencias visuales o recursos dependientes de terceros.
- TypeScript, lint y compilación de producción finalizan correctamente.

