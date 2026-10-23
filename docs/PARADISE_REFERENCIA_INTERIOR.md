# Paradise de referencia: interior y música

Trabajo del 22 de octubre de 2026. Variante independiente: `config.designKey = 'paradise-referencia'`, sobre la plantilla SQL `paradise`. La variante anterior `paradise` / Verdealma conserva su componente, datos iniciales y recursos. Este incremento continúa la [entrada y cabecera](PARADISE_REFERENCIA_ENTRADA_CABECERA.md); no convierte las demás variantes al aspecto de Invitali.

**Estado: desplegado y verificado en producción, con prueba ficticia y limpieza confirmadas.** Código principal `ab0f06daedc5f9e0fe75919a052e2d608f0f3a8e`; corrección final del control de galería `0b6346d2ac5b58ad4517e4f95947de0b56b0e539`. El dominio `enkarta.vercel.app` se comprobó por separado contra el despliegue Ready `dpl_7aGorfPM4TyeH85dfcfoWyWidhRd`.

**Actualización visual posterior:** `38c8e1fc1bbcbe8a73f9ff95aab6883fdeee6229`, Ready `dpl_5D8uRqjKD9RKoNifth1cvSsSv1AE`. Se corrigieron medida de introducción, galería móvil, cajas de iconos cargados y textos de tarjetas. Aprobó 35 regresiones relacionadas y dos comprobaciones de diseño reales, conservando los 148 originales. [Resultados y capturas de este lote](evidence/paradise-reference-polish-2026-10-22/README.md). El cierre completo de lógica y limpieza descrito debajo sigue siendo histórico; no se repitió para este ajuste visual.

## Alcance implementado

La muestra independiente incorpora introducción y pases, versículo con la Biblia original, cuenta regresiva y calendario, galería fotográfica en arco, padres y padrinos, lugares, vestimenta, cronograma alternado, regalos, hospedaje, solo adultos, fotos compartidas, confirmación, carrusel de cierre y pie de Enkarta. La música original se inicia mediante una acción de entrada y dispone de control propio de reproducción y pausa.

Cada contenido utiliza los campos editables de la invitación y `builder_config`: no se incrusta la página de WordPress ni se convierte la referencia en una imagen plana. Las fotos de galería conservan títulos, pies y descripciones accesibles; hospedaje conserva la relación entre nombre e imagen. Los valores vacíos del usuario no deben recuperar automáticamente los textos de la muestra.

Archivos principales:

- `src/components/invitations/ParadiseReference.tsx`: composición, cabecera y entrada.
- `src/components/invitations/ParadiseReferenceSections.tsx` y `.module.css`: secciones interiores, carruseles, cronograma y recursos por instancia.
- `src/components/invitations/ParadiseReferenceMusic.tsx`: ciclo de reproducción, pausa, errores y respuestas obsoletas.
- `src/components/invitations/ParadiseReferenceIcon.tsx`: reproducción de JSON originales sin alterar sus bytes.
- `src/components/invitations/ParadiseReferenceRsvp.tsx`: frontera visual para el formulario autorizado en servidor.
- `src/lib/paradise-reference.ts`: datos iniciales, fecha, horarios, calendario y enlaces de ubicación.
- `src/lib/paradise-reference-assets.ts`: mapa de recursos por rol y configuración declarada de la referencia.
- `src/app/muestra/paradise-referencia/page.tsx`: muestra independiente, sin indexación.

## Recursos originales y conservación

Se revisaron los manifiestos y archivos existentes antes de descargar. Se reutilizaron los originales ya archivados y se añadieron solamente diez faltantes: siete fotografías, el logo de Falabella, la música `2025/05/Ed-Sheran-Perfect-Violin.mp3` y `2025/05/biblia.json`. No se descargó el QR bancario ajeno.

La Biblia original ya responde y se conserva localmente. Está disponible como «Biblia · Original» en la biblioteca reutilizable del constructor. Se verificó que `originalInvitationAsset()` resuelve su URL completa a `/lottie/invitali-originales/2025-05-biblia.json`. No se reemplaza por un dibujo parecido.

El registro de distribución contiene **148 archivos protegidos**. Las **137 entradas anteriores permanecen idénticas**: los diez originales nuevos se añadieron al registro y se incorporó a la protección el original existente de Solo adultos sin cambiarlo. Se comprobaron tamaño y SHA-256 contra disco de los 148 archivos.

La música conserva su MP3 original de 1.287.764 bytes, estéreo de 44.100 Hz y 214,529161 segundos. La Biblia es un Lottie de 500 × 500, 60 cuadros por segundo y 120 cuadros. No se recomprimieron los medios ni se reescribieron los JSON para modificar su apariencia. Colores, tamaño, velocidad y dirección pertenecen a la instancia.

La procedencia verificable, URLs completas, archivos locales, tamaños y hashes están en [resources.json](evidence/paradise-reference-interior-2026-10-22/resources.json). El protocolo y las identidades de los medios están explicados en [RECURSOS.md](evidence/paradise-reference-interior-2026-10-22/RECURSOS.md). La carpeta maestra sigue siendo `Iconos INVITALI/`; no debe volver a descargarse un recurso ya archivado.

## Comportamiento, permisos y seguridad

El perfil utiliza el RSVP de Enkarta autorizado en `/i/[slug]`, con las restricciones de invitado, pases y fecha límite establecidas por el servidor. `ParadiseReferenceRsvpProvider` recibe el formulario ya autorizado; la capa visual no asigna pases, no crea confirmaciones por un clic y no sustituye la validación de servidor. La muestra solo explica que no se envió ninguna confirmación.

La entrada pública conserva una sola frontera `inert` que incluye el contenido y el RSVP. La vista privada sigue dependiendo de los permisos existentes del producto. Los cambios en el borrador y la instantánea publicada conservan su mecanismo de autorización y persistencia; no se añade una vía pública de edición.

Los enlaces de ubicación se construyen como búsquedas de Google Maps a partir de texto. Los enlaces configurables de galerías, hoteles y regalos admiten HTTPS sin credenciales o rutas locales; no se genera HTML ejecutable a partir del contenido. Los enlaces externos usan `noopener noreferrer`.

La demostración de regalos muestra un QR generado con el contenido inequívoco `ENKARTA_DEMO_NO_ES_UN_PAGO` y el texto «DEMO · no realizar transferencias». En una invitación real solo se usa el QR configurado por sus anfitriones. El logo de Falabella es un recurso gráfico de la muestra; no activa una cuenta, una pasarela ni una operación bancaria. **BCP continúa desactivado.**

El formulario externo, el QR bancario y la marca comercial de Invitali no se copian como servicios de Enkarta. La confirmación y el pie comercial conservan acciones propias y seguras de Enkarta. Esta diferencia deliberada debe constar en cualquier evaluación de fidelidad.

## Fecha, horarios y calendario

El dato editable `event_date` es la fuente para la cabecera, cuenta regresiva y calendario; no se mantiene una etiqueta de fecha separada que pueda contradecirlos. La cuenta regresiva utiliza la hora local de Bolivia. El calendario usa la misma fecha y hora configuradas.

La referencia archivada contiene horarios contradictorios entre ubicación y cronograma. Los datos iniciales de Enkarta mantienen ceremonia a las 18:00 y recepción a las 20:00 en sus dos representaciones, seguidos por vals, cena, baile y cierre. Reproducir la composición no exige copiar esa contradicción editorial. La fecha nominal de la muestra permanece igual a la referencia; una fecha pasada produce cuenta regresiva en cero, sin inventar una fecha futura silenciosamente.

El acceso al calendario debe respetar `resolveFeatures(config).calendar`, además de requerir una fecha válida. Las funciones de música, hospedaje, nombres, pases, galería, fotos compartidas y RSVP conservan las restricciones del contrato del producto.

## Movimiento declarado, código y observación

El HTML archivado declara una galería interior en el orden `paradise-muestras3` → `paradise-muestras6` → `paradise-muestras5`; el cierre usa `muestras-PARADISE2` → `muestras-PARADISE1`. Ambas secuencias declaran cambios cada 2.000 ms y transición de 1.000 ms. La primera declara además acercamiento progresivo. Estos son parámetros de la fuente; no bastan para acreditar equivalencia temporal en un navegador.

La interpretación de `reverse_animation = yes` se contrastó con el código público del reproductor usado por la referencia:

`https://invitali.com/wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js?ver=4.3.0`

SHA-256 del código inspeccionado: `eaa8df312cfc2eeba8b360c9170f79931697e81280d8c42945f064c68b09f393`.

Su estado inicial es `animationDirection: "forward"`; `setReverseAnimationOnLoop()` alterna entre `forward` y `backward` al completar cada reproducción. Por tanto, la opción significa **avance y retroceso alternados**, no repetición permanente hacia atrás. El componente independiente debe reproducir ese comportamiento sin cambiar los JSON originales.

Los carruseles y Lottie disponen de limpieza al desmontar y de política de visibilidad, movimiento reducido y ahorro de datos. Los carruseles ofrecen controles manuales y pausa. La música empieza mediante un gesto del usuario y debe conservar una pausa posterior aunque una promesa de reproducción anterior termine tarde; no se trata un intento de reproducción como éxito confirmado.

## Verificación y cierre

El importador aprobó sus **27 pruebas de regresión**, incluidos los casos de destinos distintos, formatos engañosos, recorridos de ruta y enlaces que intentan salir de las carpetas autorizadas. La segunda importación de imágenes no modificó ningún recurso ya distribuido. La conservación de los 148 archivos se comprobó por hash y tamaño.

La revisión independiente detectó y permitió corregir selectores CSS que esperaban un `div` donde el icono renderiza `span`, la posibilidad de mostrar un Lottie de sustitución cuando faltara un original y el calendario nativo sin condición del contrato. También se corrigió la semántica real de reproducción alternada de Elementor. Las regresiones correspondientes quedaron incluidas.

`npm run verify` aprobó **2.087 pruebas Node y 27 comprobaciones del importador: 2.114 en total**, además de lint, tipos y compilación. Entre las nuevas regresiones hay 35 casos de interiores, calendario, carruseles, música y edición, y ocho del reproductor de originales. También se comprobaron el formulario autorizado y los comportamientos existentes de entrada y publicación. Tras la corrección exclusivamente CSS del control de galería, se repitieron sus 35 casos relacionados y Vercel volvió a compilar la entrega final sin errores. El script completo corresponde al commit principal; la corrección posterior tiene además comprobación de interacción en navegador.

Se comparó la referencia renderizada y Enkarta a **1.440 × 900** y **390 × 844**. Se revisaron introducción, versículo, galería, lugares, cronograma, regalos, hospedaje, asistencia y cierre. La composición conserva fuentes, fondos y originales de la muestra. Como comprobación geométrica, el cronograma de escritorio mide 1.140,98 px frente a 1.140,97 px observados en la referencia; esta coincidencia aislada no certifica igualdad global de píxeles.

La revisión móvil detectó que el arco recortaba el control adicional «Pausar». La entrega final lo centra dentro de la parte curva y mantiene un mínimo CSS de 44 px de alto. Una comprobación de cinco puntos de interacción confirmó que todo el control es alcanzable, sin desbordamiento horizontal. La música original comenzó desde el gesto «Ver invitación», alcanzó `readyState = 4`, duración 214,529161 segundos, y respondió a la pausa. La navegación manual de hospedaje conservó la asociación entre la segunda imagen y «Madisson Inn hotel & Luxury suites».

Las pruebas HTTP en producción comprobaron:

- Creación de un único borrador ficticio por ejecución, guardado CAS y persistencia de los textos, fotos, títulos, pies, hoteles y música configurados.
- Publicación de la instantánea, entrada y acceso completo; un solo formulario RSVP autorizado situado antes del cierre.
- Cambios posteriores de borrador que permanecen privados; la vista pública conserva fotos, música y textos publicados.
- Vista privada del administrador con los nuevos valores y rechazo 401 de la API del editor sin sesión.
- Limpieza de cada copia ficticia, cero registros asociados en nueve tablas, respuestas 404 de sus tres vistas y cierre de la sesión de prueba.

La primera ejecución falló en una expectativa del script: una pista vacía en `/i` utiliza Pista 1 por una política anterior del producto. Se confirmó contra el SSR real, se conservó la evidencia y se corrigió exclusivamente la expectativa QA. Su copia quedó limpia antes de preparar una segunda con otro identificador. La segunda ejecución aprobó todas las comprobaciones y también terminó limpia. No se crearon cuentas, invitados, archivos, mensajes ni pagos.

La publicación final se contrastó con **23 archivos críticos del commit**. Se volvió a descargar por GET cada uno de los **148 originales protegidos**, comparando tamaño y SHA-256, con resultado correcto. El comprobador histórico cubría 147 registros de los manifiestos; el original heredado de Solo adultos se verificó además contra el registro completo de distribución, sin inferir su estado remoto a partir del archivo local.

Evidencia de cierre: [acceptance.json](evidence/paradise-reference-interior-2026-10-22/acceptance.json), [source-attestation.json](evidence/paradise-reference-interior-2026-10-22/source-attestation.json), [originals-production.json](evidence/paradise-reference-interior-2026-10-22/originals-production.json) y [CAPTURAS.md](evidence/paradise-reference-interior-2026-10-22/CAPTURAS.md).

**Límite de aceptación:** la revisión por regiones y los parámetros de la fuente no certifican identidad visual global ni equivalencia temporal medida. La emulación de un viewport no sustituye una aceptación física de audio en Android o iOS. Los controles accesibles, RSVP, enlaces, datos de regalo ficticios y pie comercial propios de Enkarta son diferencias deliberadas. Esta entrega no incorpora la variante a las opciones comerciales de Socios como un producto terminado. Verdealma permanece intacta y BCP desactivado.
