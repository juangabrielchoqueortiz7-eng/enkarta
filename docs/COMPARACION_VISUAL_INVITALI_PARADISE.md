# Comparación visual: Paradise de Invitali y Verdealma de Enkarta

Observación: 22 de octubre de 2026. Skill aplicada: `.agents/skills/enkarta-invitali-fidelity/SKILL.md`.

## Estado posterior: variante independiente de entrada y cabecera

Después de esta comparación se inició el incremento `config.designKey = 'paradise-referencia'`, manteniendo `paradise` / Verdealma. Su alcance es la entrada con sobre y la cabecera; todavía no completa el interior, la música ni una invitación de catálogo. El detalle está en [PARADISE_REFERENCIA_ENTRADA_CABECERA.md](PARADISE_REFERENCIA_ENTRADA_CABECERA.md).

Se verificaron por URL completa y SHA-256 ocho recursos existentes: los dos sobres, el sello verde y cinco fuentes. Se archivaron únicamente los dos que faltaban, mármol y fotografía de portada, conservando sus bytes. El registro `Iconos INVITALI/paradise-referencia-recursos.json` documenta las diez identidades. Esto resuelve la incertidumbre de recursos de entrada/cabecera señalada más abajo; los demás pendientes del interior se conservan.

El importador específico aprobó 27 regresiones y una segunda importación no cambió ninguno de los diez archivos. El despliegue y la comprobación visual del incremento en producción siguen pendientes de cierre en su documento propio. No se certifica identidad completa. BCP permanece desactivado y los diseños originales se conservan.

Las secciones siguientes describen la comparación histórica anterior a la implementación; las afirmaciones «no se modificó» y «no se descargó» se refieren exclusivamente a aquella revisión.

## Resultado

**La muestra actual de Enkarta no es una réplica visual de la Paradise actual de Invitali.** Comparten nombres, intención botánica, alternancia verde/marfil y varias secciones; difieren desde la entrada hasta el cierre. No corresponde presentarlas como «igualitas» ni resolverlo sustituyendo dos colores o una fuente.

Se comparó una muestra concreta en producción: [Paradise de Invitali](https://invitali.com/muestra-paradise/?n=2%20pases&m=Daniel%20Martinez) y [Verdealma de Enkarta](https://enkarta.vercel.app/muestra/paradise). No se inspeccionó el constructor privado de Invitali. Esta revisión no certifica las otras 23 muestras del inventario previo ni la landing comercial.

El resultado permite preparar una variante independiente fiel a esta referencia, conservando `paradise` / Verdealma y los demás diseños. En esta revisión no se modificó la aplicación, ninguna invitación ni sus medios. BCP continúa desactivado.

## Método y límites

- Navegador integrado, viewports comprobados mediante `innerWidth` / `innerHeight`: **390 × 844** y **1440 × 900**. Es una revisión adaptable en navegador de escritorio, no una prueba física en Android/iOS.
- Mismo contenido nominal: Laura Ruggeri, Elvis Garrido, Daniel Martinez y dos pases. Se registran las diferencias reales de fotografías, fechas y horarios; no se alteró el DOM para esconderlas.
- Entrada cerrada y página abierta comprobadas por separado. Las capturas excluyen la barra de desplazamiento y por eso su ancho de imagen puede ser menor que el viewport.
- Se conservaron capturas de regiones visibles, estilos computados y un manifiesto de archivos con SHA-256. Las capturas de página completa se descartaron: los saltos sobre elementos con `Reveal` y los fondos fijos producían composiciones incompletas. No se interpretan esas zonas vacías como un fallo de la invitación.
- Las familias recogidas son **estilos computados**; no constituyen una certificación independiente de los archivos de fuente efectivamente rasterizados. La API disponible no permitió enumerar `document.fonts`.
- Se observó apertura, desplazamiento y cambio del carrusel de hospedaje. No se midieron duración exacta de Lottie, easing, sincronía musical, LCP, INP, CLS ni rendimiento con red móvil. No se atribuye equivalencia temporal a capturas estáticas.
- Solo se abrieron muestras públicas. No se crearon eventos, cuentas, invitados, pagos ni archivos en Supabase; no se enviaron mensajes ni formularios. No hay fixtures de esta comparación que borrar. Se cerraron las pestañas temporales y se retiró el viewport de prueba al terminar.

## Diferencias verificadas y corrección requerida

| Área | Invitali observado | Enkarta observado | Requisito para una variante fiel independiente |
| --- | --- | --- | --- |
| Entrada | Sobre blanco, pliegues diagonales, sello verde y «Ver invitación». | Fondo verde oscuro, foto en arco, nombres, fecha y botón dorado. | Reutilizar los dos sobres originales ya archivados; verificar sello por URL y hash. Configurar tamaño, centro y apertura por viewport. No reemplazar la entrada de Verdealma. |
| Cabecera móvil | Nombres arriba; arco fotográfico debajo; fecha y ciudad verticales a ambos lados de la foto. | Foto antes de los nombres; fecha y ciudad verticales ocultas a este ancho. | Componer la cabecera móvil propia de la referencia; conservar el contenido vertical sin depender del breakpoint `sm` actual. |
| Cabecera de escritorio | Nombres compactos a la izquierda; foto alta y protagonista a la derecha. | Nombres considerablemente mayores y arco más pequeño. Añade marca de colección y ramas. | Ajustar geometría por región y retirar únicamente del nuevo perfil los ornamentos y rótulos inexistentes en la referencia. |
| Tipografía | Nombres Cinzel; apellidos y acentos Nathalia; cuerpo Poiret One; `&` Cormorant Infant; fecha Cinzel Decorative. | Cinzel, Great Vibes, Nunito y Cormorant Garamond. | Definir roles tipográficos del perfil; verificar originales de fuentes antes de reutilizarlos. No asignar una única fuente global ni sustituir Nathalia por Great Vibes. |
| Fondos | Mármol verde visible en las bandas verdes, con colores y textura propios. | Degradados radiales y lineales; la función `MarbleBg` no carga el mármol original. | Resolver el recurso exacto `2025/03/Fondo-verde-marmol-copia.webp`, comprobar si existe archivado y preservar sus bytes. Registrar su encuadre y comportamiento. |
| Separadores | Cambios rectos entre las bandas interiores observadas; cierre fotográfico con borde ondulado. | Ondas con filete dorado en gran parte de las transiciones interiores. | Configurar cada transición de la referencia por separado. No propagar `seamsFor(..., { shape: 'wave' })` a todas sus secciones. |
| Fotografías | Pareja en un bosque, con recursos de la muestra y composiciones/carruseles propios. | Dos fotos Unsplash; en portada y cierre se repite el detalle de un ramo. | Inventariar todas las imágenes exactas de esta URL, recortes, orden y visibilidad. Conservar los medios actuales y asignar los nuevos solo al perfil independiente. |
| Introducción y padres | Ritmo, interlineado, tamaños y márgenes específicos; acentos Nathalia y cuerpo Poiret One. | Interlineado más abierto y otras familias/tamaños; distinta altura entre bandas. | Medir cada bloque y conservar su composición en los dos viewports. Un mismo texto no garantiza el mismo alto de sección. |
| Iconos y movimiento | Se ven los iconos originales animados de iglesia, anillos, vestimenta, regalos y otros. | Hay iconos propios/estáticos y dibujos SVG distintos; el versículo usa `BookCross`. | Resolver cada JSON por URL completa y reproducir su original con configuración de instancia. No usar un icono parecido para declarar fidelidad. |
| Cronograma móvil | Eje central con actividades alternadas a ambos lados; seis actividades en el documento. | Eje a la izquierda, cinco tarjetas apiladas, otros horarios y símbolos. | Implementar disposición alternada móvil, líneas, separación y seis posiciones del perfil. Validar la consistencia de horarios propios; no copiar errores editoriales ajenos. |
| Cronograma escritorio | Columna alternada más estrecha, iconos originales y guías discontinuas hacia el eje. | Columna con otras distancias, iconos, alineación y dimensiones. | Fijar ancho del eje, ancho de grupos, altura de filas y guías por viewport. Las dos versiones alternadas siguen siendo visualmente distintas. |
| Regalos | Marca y controles con bordes, tamaños y radios propios; QR de una muestra. | Marca en texto, tarjetas con otro espaciado y QR generado de demostración. | Conservar el contrato seguro de regalos de Enkarta; usar QR inequívocamente ficticio en QA. No convertir el QR bancario ajeno en una cuenta o integración de Enkarta. |
| Hospedaje | Carrusel con Hotel Four Points y Madisson Inn, fotos originales, flechas e indicadores. Se comprobó el cambio de diapositiva. | Una sola tarjeta Madisson con fotografía Unsplash de un alojamiento diferente; sin carrusel de dos hoteles. | Añadir una lista editable y su carrusel al nuevo perfil; enlazar cada nombre con su medio correcto. La información ficticia no debe parecer una recomendación verificada. |
| Solo adultos y compartir fotos | Iconos, tamaños y bordes de la referencia. | `BabyNo` y cámara propios, con otra composición y botón. | Reutilizar iconos originales disponibles y aplicar medidas del perfil. Mantener acciones reales y accesibles de Enkarta. |
| Confirmación y pie | Botón a Google Forms y carrusel de fotos final, con marca Invitali. | La muestra enlaza al WhatsApp comercial de Enkarta y usa una foto final fija más su marca. | Reproducir la composición del nuevo perfil conservando marca Enkarta y el RSVP seguro del producto. No copiar formularios externos, identidad comercial ni atribuir confirmación al clic. |

## Medidas que permiten empezar sin aproximaciones

Son valores de estilo computado de esta sesión, no una escala global para todas las invitaciones. Las coordenadas y cajas completas se conservan en `mobile-dom.json` y `desktop-dom.json`.

| Rol | Referencia móvil | Enkarta móvil | Referencia escritorio | Enkarta escritorio |
| --- | --- | --- | --- | --- |
| LAURA | Cinzel, 33 px, línea 42,9 px | Cinzel, 44 px, línea 40,48 px | Cinzel, 55 px, línea 71,5 px | Cinzel, 86 px, línea 79,12 px |
| ELVIS | Cinzel, 35 px, línea 45,5 px | Cinzel, 44 px, línea 40,48 px | Cinzel, 55 px, línea 71,5 px | Cinzel, 86 px, línea 79,12 px |
| Apellidos | Nathalia, 30 px | Great Vibes en el código | Nathalia, 45 px | Great Vibes en el código |
| Fecha vertical | Cinzel Decorative, 29 px; visible | Oculta a este ancho | Cinzel Decorative, 30 px | Cuerpo de 13 px en el código |
| Inicio de nombres | LAURA alrededor de y=105 px | LAURA alrededor de y=533 px | LAURA alrededor de y=341 px | LAURA alrededor de y=274 px |
| Color de nombres | `rgb(237, 228, 210)` | `rgb(238, 240, 224)` | `rgb(237, 228, 210)` | `rgb(238, 240, 224)` |

En escritorio, los párrafos de la referencia observados declaran Poiret One a 20 px con línea de 24 px; sus títulos script declaran Nathalia a 40 px con línea de 48 px. No se dedujeron estos roles por frecuencia de CSS: se inspeccionó el elemento concreto.

## Incoherencias funcionales independientes de la fidelidad

1. **Fecha de la muestra Enkarta:** muestra `29 / 03 / 26`, pero el enlace «Agendar el Evento» observado contiene `20280311T160000Z` y la cuenta atrás muestra cientos de días. `sampleData.ts` combina una etiqueta fija con `F_PARADISE.isoDate` dinámico. Una muestra debe derivar etiqueta, cuenta atrás, calendario y fecha límite del mismo dato. Este hallazgo no afecta por sí mismo a todas las invitaciones reales ni justifica editar sus fechas.
2. **Destino de confirmación en la muestra:** «Confirmar Asistencia» abre un texto comercial para contratar una invitación. No se accionó. Conviene distinguir explícitamente una demostración de confirmación de una consulta de venta; no medir ese clic como RSVP.
3. **Datos ajenos inconsistentes:** la referencia muestra ceremonia a las 18:00 en ubicación y a las 16:00 en el cronograma. La futura variante debe permitir introducir horarios coherentes; fidelidad de composición no exige trasladar esa contradicción.

No se corrigieron estos puntos durante una tarea de comparación. Quedan identificados para implementación y pruebas de regresión específicas.

## Recursos: reutilización antes de descargar

El inventario del HTML previamente archivado identifica 14 JSON propios de la invitación, excluyendo el JSON por defecto de Elementor. Trece ya resuelven a originales de Enkarta por URL completa. No se hizo ninguna descarga multimedia nueva en esta revisión.

| Recurso | Evidencia local | Acción pendiente |
| --- | --- | --- |
| Dos sobres | `Iconos INVITALI/mariana-jesus-recursos.json`; originales en `public/invitations/mariana-y-jesus/` | Reutilizar. SHA-256: `c35f6beb5df9fa5dd225e40d66bd9920760aa1fcd37e086e5e2800540ff14302` y `342fa0b0ec8a97eba90d53a6936f4e8395e5b6c2cb0c2955c8e3e5521ecae003`. |
| Trece JSON originales conocidos | `invitali-local-assets.json` y `invitation-assets.ts` | Reutilizar resolución por URL; verificar color, tamaño, velocidad y rol de cada instancia. |
| Biblia | `https://invitali.com/wp-content/uploads/2025/05/biblia.json` | No encontrada registrada. Mantener pendiente; no sustituirla por un SVG aproximado. |
| Nathalia, Poiret One y sello verde | Hay archivos de nombres compatibles en `public/invitations/laura-andres/` | Falta certificar procedencia e identidad por URL/hash; el nombre no es prueba de igualdad. |
| Mármol, fotos actuales, hoteles y música | URLs del HTML archivado y fondos computados de esta sesión | Buscar primero en toda la carpeta maestra y registros particulares; después, si falta alguno, archivar fuente completa y hash con el protocolo del proyecto. |

Fondos observados actuales incluyen `2025/03/Fondo-verde-marmol-copia.webp`, `2025/12/pasport.webp`, `2025/12/paradise-muestras3.webp`, `paradise-muestras6.webp`, `paradise-muestras5.webp`, `muestras-PARADISE2.webp`, `muestras-PARADISE1.webp` y los dos hoteles de `2025/09/`. Son URLs identificadas, no medios importados ni equivalencia ya verificada.

## Hoja de implementación resultante

1. **Contrato de referencia cerrado:** inventario por rol de todos los medios/fuentes; reutilización o archivo pendiente explícito. Conservar Verdealma como variante original. Definir una clave de perfil nueva antes de implementar.
2. **Entrada y cabecera:** sobre original y composición móvil/escritorio, tipografía por rol, fotografía/recorte y fondos. Volver a comparar con contenido equivalente y sin cambios de portal.
3. **Secciones interiores:** alturas y separaciones por sección; originales Lottie; cronograma alternado; carruseles de fotos/hospedaje; controles accesibles y movimiento reducido.
4. **Integración editable:** cada nombre, fecha, lugar, lista e imagen mantiene bindings y guardado del constructor. El nuevo perfil no debe ser una imagen plana ni HTML externo incrustado.
5. **Regresión y aceptación:** aislamiento de variantes; fecha/calendario consistentes; orden y edición de listas; límites de RSVP/QR en servidor; teclado, visor, música y cancelaciones. Nueva pareja de capturas por región y viewport, con temporización medida si se quiere certificar movimiento.

Una réplica fiel de Paradise no certifica Azure, Passport, Primicia ni el resto del catálogo. Cada modelo requiere su contrato independiente; las métricas, precios y testimonios de la landing ajena no forman parte de ese contrato.

## Evidencia y conservación

Carpeta: `docs/evidence/invitali-paradise-2026-10-22/`. El manifiesto identifica las capturas, formato real, tamaño, SHA-256 y límites de comparación. Las parejas principales son entrada y cabecera en móvil y escritorio; las demás capturas documentan regiones del mismo recorrido, con posiciones de scroll diferentes cuando la altura de las secciones difiere.

El código fuente explica los desvíos en `Paradise.tsx` (paleta, roles de fuente, `MarbleBg`, `BotanicalFrame`, `BookCross`, ondas, cronograma y hospedaje), `entry/config.ts` (escena `arch`), `sampleData.ts` (medios y fecha) y `muestra/[template]/page.tsx` (preset de movimiento y música de demo). No se tocaron esos archivos. La modificación local previa de `migrations/021_partner_draft_creation.sql` se conservó.

Comprobación final: **26 capturas JPEG** con cabecera, dimensiones y hashes verificados; los dos pares de viewports coinciden en sus registros DOM. Los **129 originales públicos** del registro `original-distribution-lock.json` conservan tamaño y SHA-256. El diff de `src/`, `public/` e `Iconos INVITALI/` está vacío. `bcp.ts` mantiene el bloqueo `BCP_CONTRACT_REQUIRED`. No se ejecutó un build ni se desplegó porque el resultado de esta tarea es documental, sin cambios de aplicación.

La galería comparativa está en [CAPTURAS.md](evidence/invitali-paradise-2026-10-22/CAPTURAS.md); el registro verificable, en [manifest.json](evidence/invitali-paradise-2026-10-22/manifest.json). Una revisión independiente contrastó medidas, capturas y afirmaciones del informe. Los contornos de foco transitorios de la cabecera y la escritura de apellidos aún en curso se excluyeron de las capturas finales de cabecera; el foco accesible del botón de entrada puede seguir visible.
