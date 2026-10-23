# Paradise de referencia: entrada y cabecera

Incremento del 22 de octubre de 2026. Referencia pública: [Paradise de Invitali](https://invitali.com/muestra-paradise/?n=2%20pases&m=Daniel%20Martinez). Se aplica la skill del proyecto `.agents/skills/enkarta-invitali-fidelity/SKILL.md` y la comparación previa [COMPARACION_VISUAL_INVITALI_PARADISE.md](COMPARACION_VISUAL_INVITALI_PARADISE.md).

## Alcance y aislamiento

La variante nueva usa `config.designKey = 'paradise-referencia'` y conserva `template = 'paradise'` como familia compatible. El registro del diseño resuelve expresamente esa clave a `ParadiseReference`; una invitación sin esa clave conserva la resolución anterior. **`paradise` / Verdealma permanece como diseño independiente.** No se reemplazan sus nombres comerciales, preset, fotografías, fuentes, sobre ni composición.

Este incremento incluye únicamente:

- Entrada con los dos sobres originales, sello verde y texto «Ver invitación» editable. Tiene apertura controlada, prevención de activación repetida, limpieza del temporizador, respeto a movimiento reducido, bloqueo/restauración del desplazamiento y transferencia de foco al título al abrir.
- Cabecera con mármol original, nombres Cinzel, apellidos Nathalia, ampersand Cormorant Infant, fecha vertical Cinzel Decorative, ciudad y fotografía en arco. La composición tiene reglas propias para móvil y computadora; el CSS del perfil no redefine las otras invitaciones.
- Datos editables: nombres y fecha del evento, ambos apellidos, ciudad, fotografía y texto de entrada. Vaciar un campo conserva el vacío; no restaura silenciosamente el contenido de muestra. La etiqueta de fecha procede de `event_date`.
- Muestra incremental en `/muestra/paradise-referencia`, con metadatos `noindex, nofollow` y descripción explícita de su alcance. `?full=1` o `?preview=1` permite observar la cabecera sin repetir el sobre.

La referencia no se introduce como una invitación completa del catálogo ni como sustitución de Verdealma. Todavía no incluye las secciones interiores de Paradise, cronograma, cuenta regresiva, carruseles, hospedaje, regalos, confirmación visual ni cierre. **No se implementó una pista de música en este incremento ni se certificó sincronización de audio.** Los componentes propios de permisos, publicación, RSVP y pagos conservan sus contratos de Enkarta; este estudio no crea una implementación alternativa de esos procesos.

## Archivos del incremento

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/invitations/ParadiseReference.tsx` | Entrada y cabecera de la variante. |
| `src/components/invitations/ParadiseReference.module.css` | Fuentes locales, composición y reglas de entrada exclusivas del perfil. |
| `src/lib/paradise-reference.ts` | Clave independiente, datos de muestra y resolución de campos de cabecera. |
| `src/app/muestra/paradise-referencia/page.tsx` | Muestra pública incremental y sus metadatos. |
| `src/lib/template-registry.tsx` y `src/lib/types.ts` | Resolución y tipado de la nueva clave. |
| `src/app/i/[slug]/page.tsx` | Integración con la entrada nativa dentro del recorrido público existente. |
| `src/components/admin/builder/panels/TemplateContentFields.tsx` | Campos específicos de apellidos y ciudad, con explicación del alcance. |
| `src/lib/enkarta-collections.ts` | Etiqueta de la nueva clave, sin renombrar Verdealma. |
| `Iconos INVITALI/paradise-referencia-recursos.json` | Procedencia verificable de los diez recursos usados en este incremento. |
| `scripts/import-invitali-originals.cjs` | Opción explícita para importar el manifiesto de imágenes/fuentes. |
| `scripts/test-invitali-resource-import.cjs` | Regresiones del importador y conservación de originales. |
| `scripts/test-paradise-reference.cjs` | Regresiones específicas de la nueva variante; su resultado se registra en la verificación del incremento. |

La lista documenta responsabilidades de este incremento; no sustituye el diff final ni afirma que el despliegue ya haya concluido.

La flecha de entrada conserva el vector `angle-double-down` de Font Awesome Free incrustado en la referencia pública, con atribución en el código a su [licencia oficial](https://fontawesome.com/license/free). El DOM observado muestra un SVG estático de 16 × 16 px, color `#a5a5a5`, sin animación en él ni sus tres contenedores inmediatos; no se presenta como Lottie ni como recurso animado original.

## Recursos originales: dos nuevos y ocho reutilizados

Antes de descargar se consultaron `docs/INVITALI_RECURSOS.md`, `src/lib/invitation-assets.ts`, `Iconos INVITALI/manifest.json`, `public/invitali-originales.json`, los registros particulares y las copias existentes. Las diez URLs se leyeron por HTTPS; las ocho copias ya presentes se compararon con los bytes remotos en memoria. Coinciden en tamaño y SHA-256. No se guardaron descargas duplicadas de esos ocho recursos.

Solo faltaban el mármol y la portada. Se archivaron con año y mes en `Iconos INVITALI/` y el importador generó las dos copias de distribución sin conversión, recorte, compresión ni cambio de nombre de los originales anteriores. Los registros incorporan `verifiedAt` entre `2026-10-22T23:52:22.681Z` y `2026-10-22T23:52:25.839Z`.

| Recurso / estado | URL completa de origen | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Sobre izquierdo · reutilizado | `https://invitali.com/wp-content/uploads/2025/03/Recurso-1Sobres-copia-scaled.webp` | 42994 | `c35f6beb5df9fa5dd225e40d66bd9920760aa1fcd37e086e5e2800540ff14302` |
| Sobre derecho · reutilizado | `https://invitali.com/wp-content/uploads/2025/03/Recurso-2Sobres-copia-scaled.webp` | 31730 | `342fa0b0ec8a97eba90d53a6936f4e8395e5b6c2cb0c2955c8e3e5521ecae003` |
| Sello verde · reutilizado | `https://invitali.com/wp-content/uploads/2025/11/SELLO-VERDE-copia_2.webp` | 17814 | `9a192bff5eb9ec437398adaadb9bcb56be54393a2bc30b85091068f7781c7e31` |
| Nathalia · reutilizada | `https://invitali.com/wp-content/uploads/2024/08/Nathalia.ttf` | 67236 | `7235404d6b8fba4b2d0c22238fcd7aa577716f4c6ffa2088e6626ebf6d495064` |
| Cinzel · reutilizada | `https://invitali.com/wp-content/uploads/elementor/google-fonts/fonts/cinzel-8vij7ww63mvu7gt79mt7.woff2` | 25960 | `a88b9e2784b1440392fdb02a09c194ca985b19b64be781c801f0fa4f3ca634a2` |
| Poiret One · reutilizada | `https://invitali.com/wp-content/uploads/elementor/google-fonts/fonts/poiretone-uqyvk80njxn4zfrgbdfbo55cvw.woff2` | 7824 | `a6361b9b4bd84cd02407a4674e0158642a51d5f968f0366adf8a19302bec6c0c` |
| Cormorant Infant · reutilizada | `https://invitali.com/wp-content/uploads/elementor/google-fonts/fonts/cormorantinfant-hhypu44g9vkim1sorysiweasln997_cv2q.woff2` | 35720 | `8f9f468a10e78619156182f2585f3f119f06d166bf0896a8a581e25f89ad5809` |
| Cinzel Decorative · reutilizada | `https://invitali.com/wp-content/uploads/elementor/google-fonts/fonts/cinzeldecorative-daacsscvjgqlyhg8nnt8kppswuapni7ttmw.woff2` | 14416 | `97d28bf5a628c4f0305a6f837e85d5ae7dbf44485f04d2a4cada8d7810c9bb03` |
| Mármol verde · nuevo | `https://invitali.com/wp-content/uploads/2025/03/Fondo-verde-marmol-copia.webp` | 20354 | `37f55ef323508d88236bc039e694e291aee9587ee18795daa547205698b21079` |
| Fotografía de cabecera · nueva | `https://invitali.com/wp-content/uploads/2025/12/pasport.webp` | 309402 | `2618d55d5a0635b3e8e0c2086847ef5f5cc57d5879c063c0d392176edefefc97` |

Rutas reutilizadas:

- Sobres: `/invitations/mariana-y-jesus/Recurso-1Sobres-copia-scaled.webp` y `/invitations/mariana-y-jesus/Recurso-2Sobres-copia-scaled.webp`. Conservan sus archivos maestros `Iconos INVITALI/2025-03-Recurso-1Sobres-copia-scaled.webp` y `Iconos INVITALI/2025-03-Recurso-2Sobres-copia-scaled.webp`.
- Sello: `/invitations/laura-andres/SELLO-VERDE-copia_2.webp`.
- Nathalia: `/invitations/laura-andres/Nathalia.ttf`.
- Poiret One: `/invitations/laura-andres/poiretone-uqyvk80njxn4zfrgbdfbo55cvw.woff2`.
- Cormorant Infant: `/invitations/laura-andres/cormorantinfant-hhypu44g9vkim1sorysiweasln997_cv2q.woff2`.
- Cinzel: `/invitations/manuel-y-maya/cinzel-8vij7ww63mvu7gt79mt7.woff2`.
- Cinzel Decorative: `/invitations/manuel-y-maya/cinzeldecorative-daacsscvjgqlyhg8nnt8kppswuapni7ttmw.woff2`.

Para el sello y las cinco fuentes heredadas se registra `reused: true` y su ruta pública, sin inventar un `archiveFile` inexistente. La verificación remota cierra la incertidumbre de identidad registrada en la comparación inicial.

Rutas nuevas:

| Archivo maestro | Copia de distribución |
| --- | --- |
| `Iconos INVITALI/2025-03-Fondo-verde-marmol-copia.webp` | `/invitations/paradise-referencia/2025-03-Fondo-verde-marmol-copia.webp` |
| `Iconos INVITALI/2025-12-pasport.webp` | `/invitations/paradise-referencia/2025-12-pasport.webp` |

En ambos casos el SHA-256 de la distribución coincide con el archivo maestro y con la lectura de la URL remota.

## Importación y pruebas del archivo de recursos

Comando reproducible:

```powershell
node scripts/import-invitali-originals.cjs --resources "Iconos INVITALI/paradise-referencia-recursos.json"
node scripts/test-invitali-resource-import.cjs
```

La opción `--resources` exige un manifiesto dentro de `Iconos INVITALI/`, comprueba tamaño, SHA-256 y firma del formato y valida todo el lote antes de copiar. Admite reutilización explícita de una copia pública existente, rechaza destinos con otros bytes y no sobrescribe archivos. Rechaza escapes mediante rutas, nombres especiales de Windows, URLs con credenciales, destinos duplicados y enlaces de directorio que salgan de la carpeta permitida. La firma del formato no equivale a una decodificación completa ni certifica fidelidad visual.

Este modo no lee ni reescribe los registros Lottie `Iconos INVITALI/manifest.json`, `public/invitali-originales.json` o `src/lib/invitali-local-assets.json`. Ejecutar el importador sin argumentos conserva su recorrido anterior de JSON/MP3.

Resultados comprobados:

- Primera importación: **2 recursos importados, 8 intactos, 10 verificados**.
- Segunda importación: **0 recursos importados, 10 intactos, 10 verificados**.
- **27 regresiones del importador aprobadas**, incluidas copia exacta de bytes, idempotencia, rechazo de contenido HTML disfrazado, conservación de los tres registros Lottie, prevalidación del lote y escapes de rutas/enlaces.
- Las pruebas usan archivos ficticios en una carpeta temporal del proyecto y los eliminan al terminar. En este sandbox Windows se necesitó ejecutar la suite con permiso ampliado para crear los dos enlaces de directorio de prueba; la ejecución ampliada aprobó las 27 comprobaciones.

## Conservación y límites de fidelidad

Los originales se consumen por ruta y configuración de instancia. No se reescriben fuentes ni imágenes, no se crean aproximaciones de animaciones y no se modifica la política CSP para este incremento. La variante anterior `Paradise.tsx` / Verdealma sigue siendo un diseño válido separado; el perfil nuevo no corrige ni homogeneiza sus decisiones visuales.

BCP permanece desactivado, con el bloqueo `BCP_CONTRACT_REQUIRED`. Este incremento no incorpora claves, cambia proveedores, realiza operaciones bancarias ni atribuye estados de pago.

La igualdad de las diez identidades de recursos está probada por bytes. **Esto no certifica todavía una invitación completa idéntica, equivalencia temporal de la apertura ni el resto del catálogo.** La comparación renderizada posterior debe conservar pares del mismo viewport y estado de entrada, registrar diferencias por región y distinguir emulación de escritorio de un teléfono físico. Los resultados de LCP, INP y CLS no se deducen del build ni de estos hashes.

## Producción y aceptación: pendientes de cierre

Al redactar este registro no se declara completado el despliegue del incremento. Faltan adjuntar la revisión exacta, el resultado de las pruebas de la variante y el build, la identificación del despliegue Vercel y su comprobación por el dominio público.

La verificación en producción debe registrar la entrada y cabecera nueva en móvil y computadora, el aislamiento de Verdealma y los hashes de los recursos distribuidos. Si se crean datos ficticios, debe quedar evidencia de su limpieza; la lectura de una muestra estática por sí sola no crea fixtures de Supabase. No hay en este documento una afirmación de limpieza de una prueba de producción que todavía no se haya ejecutado.
