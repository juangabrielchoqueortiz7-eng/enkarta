# Azure de referencia

Trabajo del 22 de octubre de 2026. Referencia pública: [Azure de Invitali](https://invitali.com/azure/?n=2%20pases&m=Daniel%20Martinez). Se aplicó `.agents/skills/enkarta-invitali-fidelity/SKILL.md`.

## Alcance y aislamiento

Variante independiente: `config.designKey = 'azure-referencia'` sobre la plantilla SQL `azure`. **La plantilla `azure` existente conserva su componente, su preset y sus recursos.** La clave nueva se resuelve en `premiumFor()` y en `/i/[slug]` antes que la familia `azure`. No se añadió al catálogo ni al selector de diseños, igual que Paradise de referencia.

Muestra: `/muestra/azure-referencia` (`noindex, nofollow`). `?full=1` o `?preview=1` omite la entrada.

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/azure-reference.ts` | Clave, recursos por rol, filtros declarados, parámetros de semillas, datos iniciales y fechas. |
| `src/components/invitations/AzureReference.tsx` | Entrada, portada, secciones, música, fondo con desplazamiento y semillas. |
| `src/components/invitations/AzureReference.module.css` | Fuentes locales y composición medida; solo una regla global (`scrollbar-gutter` de la página del perfil). |
| `src/app/muestra/azure-referencia/page.tsx` | Muestra independiente. |
| `src/app/i/[slug]/page.tsx` | Entrada propia y frontera del RSVP autorizado en servidor (`AzureReferenceRsvpProvider`). |
| `src/components/admin/builder/panels/TemplateContentFields.tsx` | Ciudad, títulos, mensajes, monograma y QR de regalos. |
| `scripts/test-azure-reference.cjs` | 8 regresiones: aislamiento, fechas, textos vacíos, contenido editado, entrada modal, SHA-256 de los originales e integración pública. |

Se reutilizan sin cambios `ParadiseReferenceMusic` (reproducción e inicio dentro del gesto de entrada), `ParadiseReferenceIcon` (Lottie original sin reescribir bytes) y los ayudantes de horario, mapas y enlaces seguros de Paradise.

## Estructura reproducida

Entrada (monograma, nombres, fecha, flecha animada, botón; desvanecido de 2 s) → portada con aro y orquídeas → bienvenida, corazones, fecha en cápsula con día de la semana y mes, cuenta regresiva entre ornamentos, separador y bendición → padres → ceremonia y recepción con botón de ubicación → vestimenta → itinerario (horizontal en escritorio, en zigzag en móvil) → regalos sobre banda azul con divisores «book» → compartir fotografías → confirmación con orquídeas → pie. Música fija abajo a la derecha y semillas de diente de león sobre toda la página.

Movimiento declarado en la referencia y reproducido: `fadeInUp` por elemento al entrar en pantalla (1,25 s), flecha `scrolling` 1 s infinita, fondo de hojas fijo con desplazamiento vertical de velocidad 7,4, semillas de 10–50 px que duran 7–12 s, suben 150–550 px con deriva de ±100 px y vaivén de ±20 px, una nueva cada 1–3 s. Se respetan el movimiento reducido, el ahorro de datos y la página oculta.

Filtros aplicados por instancia, sin modificar los originales: corazones `brightness(40%) contrast(122%) saturate(180%) hue-rotate(252deg)`, botón de música `brightness(51%) contrast(194%) saturate(87%) hue-rotate(227deg)`, monograma `brightness(82%) contrast(133%) saturate(200%)` y ornamentos de la cuenta regresiva `brightness(59%) contrast(157%) saturate(159%) hue-rotate(177deg)`. Un color en `sectionIconColors.hearts.color` sustituye el filtro de los corazones.

## Recursos

Manifiesto: `Iconos INVITALI/azure-referencia-recursos.json` (URL completa, bytes, SHA-256 y `verifiedAt`). **15 originales nuevos** en `/invitations/azure-referencia/`: fondo de hojas, cuatro orquídeas, aro, diente de león, monograma, dos ornamentos, iconos de vestimenta, salón y cámara, Abhaya Libre y Open Sans. **8 reutilizados** con bytes idénticos comprobados contra la URL remota: separador floral e iconos de ceremonia y recepción (Karla y Mauricio), Romantic Lovely, Cinzel, Cinzel Decorative, Cormorant Infant y Raleway.

Lottie: los corazones son el original ya aportado por el usuario (`/lottie/boda/annie-corazones-original.json`, mismo SHA-256 que `2024/05/Animation-1715978306775.json`). El botón de música es `2025/03/Animation-1741383787701.json`, ya archivado. No se descargaron de nuevo.

Música: `2025/07/Kenny-G-Forever-In-Love-Offiical-Video.mp3` (5.947.905 bytes, estéreo 44,1 kHz, 247,76 s), registrada en `public/invitali-originales.json` y servida desde `/audio/invitali-originales/`. Como el resto de los MP3 de referencia, está excluida de Git; se publica con el despliegue desde la carpeta local.

El importador acepta ahora SVG **estáticos**: rechaza `script`, `foreignObject`, `iframe`, `object`, `embed`, atributos de evento, URL `javascript:`, referencias externas, `@import` y entidades. Hay 6 pruebas nuevas (33 en total).

## Diferencias deliberadas con la referencia

- No se fuerza pantalla completa al entrar.
- No se copian los datos bancarios ni el QR bancario de la muestra. La demostración muestra «BANCO DE MUESTRA» y un QR con el contenido `ENKARTA_DEMO_NO_ES_UN_PAGO`, rotulados «DEMO · no realizar transferencias». Por eso la tarjeta de regalos de la muestra es unos 36 px más alta. En una invitación real solo aparecen la cuenta (`bank_account`, una línea por dato, con botón de copiar) y el QR (`giftQrUrl`) de los anfitriones. **BCP sigue desactivado.**
- Confirmación y fotografías usan los flujos de Enkarta. El pie es de Enkarta, sin la marca de Invitali.
- El monograma original son las iniciales «L M». Se puede reemplazar o vaciar (`sectionImages.azureMonogram`).
- Los iconos del itinerario móvil se muestran estirados a 82×62 y 76×60 porque así los renderiza la referencia (`object-fit: fill`).

## Cierre en producción · 23 de octubre de 2026

Muestra activa: [Azure independiente](https://enkarta.vercel.app/muestra/azure-referencia). Código de aplicación `be4ce6ca8d808a336398f81311e4687378ad52dc`; despliegue `dpl_FMBD46gJWKFyBmVYEJMbsjcRaknt`, Ready y asociado al dominio canónico. La compilación de Vercel completó lint y tipos; conserva las advertencias existentes de imágenes.

### Pruebas proporcionadas al cambio

71 regresiones relacionadas aprobadas: Azure (8), compartición y página pública (25), importador de originales (33) y protección del despliegue (5). Se añadieron dos casos ejecutables de integración Azure: entrada nativa con formulario del grupo verificado y entrada cinematográfica con un único formulario autorizado. No se repitió la batería completa del portal por un cambio de una variante.

Se comprobó un único evento ficticio en producción: creación del borrador, guardado CAS de textos e interiores, publicación del snapshot, contenido publicado separado del borrador posterior, vista privada autorizada y denegación anónima del estado del constructor (401). El RSVP aparece una sola vez dentro del cierre; música y monograma corresponden al contenido publicado. El evento quedó eliminado, las nueve tablas relacionadas en cero y sus tres URLs en 404; la sesión de prueba se cerró. Cero pagos, operaciones bancarias, mensajes, invitados o subidas de medios.

Esa comprobación funcional se hizo sobre `97c111d`. La entrega final solo añade `letter-spacing:normal` en los nombres de la entrada móvil: los 476 archivos de código funcional son idénticos. Se comprobó esa equivalencia y se confirmó el render final sin repetir escrituras QA.

### Revisión visual y recursos

Comparación agrupada con navegador integrado a 390×844 y 1440×900: entrada, portada, fecha con el SVG original de corazones cargado e itinerario; además se revisaron regalos, fotografías y cierre en escritorio. Se confirmó apertura, retirada de `inert`, foco en H1, inicio de música mediante gesto, pausa, ausencia de desbordamiento horizontal y mensaje de muestra sin enviar confirmaciones. El ajuste móvil elimina el espaciado excesivo entre los nombres. La música queda pausada en la pestaña entregada.

Se atestaron 34 archivos críticos y 166 originales (56.235.425 bytes) mediante UID SHA-1 de los archivos subidos a Vercel frente a bytes de la entrega y SHA-256 del lock. Los 148 originales anteriores permanecen intactos; también Verdealma, Lunaria y Paradise. No se volvieron a descargar los medios archivados. BCP sigue bloqueado.

**No se certifica identidad píxel a píxel.** Los distintos anchos de la barra nativa producen pequeñas diferencias de centrado horizontal; las semillas aleatorias no están sincronizadas. Los recortes por región del documento no conservan los fondos fijos, por lo que estos se revisaron con capturas nativas de viewport. No se hizo aceptación en un dispositivo físico en este cierre. Los datos bancarios ficticios, los flujos de Enkarta y su pie siguen siendo las diferencias deliberadas indicadas arriba.

Evidencia resumida: [azure-reference-production-2026-10-23.json](evidence/azure-reference-production-2026-10-23.json). Capturas y diarios de este cierre permanecen en `tmp/azure-release-20261023/` del espacio local; no contienen cookies ni contraseñas.

La variante continúa como muestra independiente y se resuelve en el constructor al usar su clave; incorporarla al catálogo comercial y al selector de Socios no forma parte de este cierre.
