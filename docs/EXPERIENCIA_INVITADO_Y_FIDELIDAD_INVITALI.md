# Experiencia del invitado y fidelidad Invitali

## Alcance del bloque

Revisión conjunta del recorrido público: apertura, música, galería, enlace personalizado, confirmación, pase QR y metadatos al compartir. Se mantiene la composición de las variantes actuales, los recursos originales y BCP bloqueado. No se incorporan precios, testimonios ni reglas de negocio de otra empresa.

## Correcciones demostrables

| Área | Problema | Corrección |
| --- | --- | --- |
| Confirmación | Lecturas/escrituras detenidas, ACK incompleto o de otro destinatario, resultados de una invitación anterior. | Límite completo de cabeceras/JSON, contrato de destinatario/cupos/revisión y guardas por operación e identidad. Ante incertidumbre conserva UUID y cuerpo del mismo intento; no reenvía automáticamente. |
| Pase descargable | Doble clic antes de renderizar o generación tardía podía descargar un pase anterior. | Bloqueo inmediato, plazos de generación/descarga y descarte al cambiar nombre, cupos, mesa o token. |
| Música | Un rechazo tardío o desmontaje dejaba controles ajenos al audio vigente. | Identidad del intento, pausa/cancelación y limpieza de temporizadores/listeners. La reproducción sigue iniciándose por acción del invitado. |
| Pantalla de entrada | La salida borraba un overflow previo y propagaba errores de audio sin identificar la instancia. | Restaura el estado anterior y acota el aviso al reproductor correspondiente. |
| Galería | Un pinch o gesto cancelado se interpretaba como cambio de foto; faltaba apertura por teclado. | Rechaza multitáctil/touchcancel como swipe, añade activación accesible y mantiene índices coherentes al cambiar la colección. FadeImg compone callbacks y reinicia la carga al cambiar URL. |
| Enlace personal | Un g malformado o inexistente caía en el formulario genérico. | Presenta un estado de enlace no disponible; no cambia silenciosamente de grupo. La invitación sin g conserva su recorrido genérico. |
| Compartir | Host recibido influía en metadataBase y el canonical heredado apuntaba al inicio. | Origen configurado de Enkarta, canonical y og:url del evento sin g ni preview. Snapshot publicado para la tarjeta; el borrador privado no filtra sus cambios. |
| Recursos de tarjeta | Se enviaban nombres del evento al proveedor de fuentes y una imagen arbitraria podía mantener la espera. | Consulta de fuentes fija sin nombres, imágenes de orígenes permitidos, sin redirecciones, plazo y límite de bytes. Conserva las familias tipográficas y composición de la tarjeta. |
| Compatibilidad | Una validación nueva de slug podía romper copias largas y enlaces históricos. | Lectura exacta sin recortar/normalizar Unicode, mayúsculas, espacios o underscore, rechazando controles y separadores de ruta. |

## Estudio y skill Invitali

Se analizaron por HTTP **30 páginas públicas y 31 CSS enlazados** el 22 de octubre de 2026. El conjunto incluye las categorías y las 24 muestras públicas enlazadas desde ellas. El inventario versionado conserva URLs completas, estado HTTP y SHA-256. Las observaciones de construcción son WordPress/Astra/Elementor, contenedores por elemento, tipografías por modelo, variantes adaptables, fondos y parámetros de movimiento. No se accedió a un constructor privado.

La skill [enkarta-invitali-fidelity](../skills/enkarta-invitali-fidelity/SKILL.md) está configurada para nuevas réplicas o comparaciones específicas. Resuelve cada muestra, distingue reglas declaradas de apariencia computada, reutiliza recursos por URL/hash y protege las otras variantes. Incluye mapa de modelos y evidencia fechada; no aplica una paleta genérica a todas las invitaciones. Validada con el validador oficial y un ejercicio independiente sobre Paradise.

**Límite visual:** el navegador automatizado está deshabilitado en Work. No hay nuevas capturas, estilos computados ni Core Web Vitals medidos en esta sesión. El estudio de HTML/CSS no demuestra que Enkarta sea idéntica a las muestras. No se reemplazaron todas las invitaciones actuales ni se presenta la skill como una conversión automática de los 24 modelos. La fidelidad sin diferencias requiere réplica y comparación por muestra, en ambos tamaños y estados de apertura. La petición de habilitar el navegador quedó enviada al usuario.

## Validación y conservación

Las regresiones usan módulos y componentes reales con hooks/eventos/transportes en memoria, no ReactDOM ni dispositivos físicos. Comprueban errores, plazos, reintentos, identidad del destinatario, gestos y privacidad del servidor. Las pruebas previas de publicación, servicios, padrón y recepción se mantienen.

Las verificaciones HTTP de producción usan un único evento ficticio y un grupo de dos pases, con publicación, confirmación e idempotencia controladas. No envían WhatsApp/correos, no registran ingresos ni suben archivos. La limpieza elimina solo los UUID/slug etiquetados y verifica tablas relacionadas, almacenamiento vacío y URLs retiradas. No se fuerzan errores de red contra producción.

La evidencia final se registra en tmp/guest-experience/RESULTADO.json y en el apartado de release al concluir. Se comparan los recursos originales públicos y maestros por SHA-256, además de los presets y variantes originales fuera de los componentes operativos corregidos. La modificación local previa de la migración 021 continúa excluida.

## Release final · 22 de octubre de 2026

- Aplicación final: `f3b6f9a89967fa77ad354fde6a83083c855f9af1`; despliegue Ready `dpl_AiYZYcNP8RFrSzmMBDJmqrEAfZ5g` en https://enkarta.vercel.app. El dominio fue inspeccionado directamente y resolvió ese mismo ID; sus 13 archivos críticos coinciden por hash con el commit revisado.
- [CI exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39867823330) correcto: verificación completa, TypeScript, lint, build y auditoría de dependencias. La suite alcanza **2.031 pruebas**, incluidas **65 regresiones nuevas** (19 multimedia, 21 metadatos/compartir y 25 confirmación/pase).
- Carga inicial estimada por el build de /i/[slug]: **357 kB** frente a 364 kB del cierre anterior; la primera versión de este bloque marcaba 367 kB. El generador QR se importa al mostrar el pase y la exportación al solicitarla. Son cifras de compilación, no LCP/INP/CLS de un teléfono ni una garantía de tiempo real.
- La prueba publicada confirmó personalización, separación del borrador editado y el snapshot público, g inválido bloqueado, canonical/og:url sin tokens, cuatro denegaciones anónimas y tarjeta PNG de 1.073.488 bytes con no-store. La generación HTTP tardó 3.720 ms en ese ensayo sin condiciones de red controladas; no se presenta como benchmark móvil.
- Para dos pases asignados se rechazó confirmar tres. La confirmación de dos y su reintento con el mismo UUID produjeron dos asientos únicos, misma credencial QR, revisión 1, cero ingresos y cero movimientos. Lectura de recepción autorizada; accesos anónimos denegados.
- Limpieza final: cero filas del evento, grupos, confirmaciones, versiones, notas, importaciones, analítica, vigencias, preconfirmaciones, asientos y movimientos; tres prefijos de almacenamiento vacíos; URLs pública/preview retiradas con 404 y cookie administrativa temporal cerrada.
- Se conservó la evidencia de dos ensayos iniciales detenidos por la tarjeta social y un ensayo sobre la versión estable anterior. Los tres fueron limpiados. Se hizo rollback temporal y posterior promoción explícita; ninguno cuenta como aceptación del release final. La regresión se reprodujo con el generador real: azure.jpg contiene PNG, y etiquetarlo JPEG causaba un 500. La detección por bytes y dos pruebas específicas lo corrigen sin modificar el original.
- Integridad final: **487 archivos de recursos protegidos**, **590 archivos protegidos fuera de los siete componentes operativos intervenidos** y **129 originales públicos** idénticos por SHA-256; seis rutas públicas correctas. BCP sigue bloqueado, sin pagos, bancos, correos, mensajes, subidas ni registros de ingresos durante los ensayos.
- Skill creada, instalada y validada: `enkarta-invitali-fidelity`, con estudio de 30 páginas/31 CSS y prueba independiente sobre Paradise. Su copia del repositorio y la instalada son iguales al normalizar únicamente CRLF/LF de Git; los recursos de invitaciones siempre se compararon por bytes sin normalización.

**Pendiente de fidelidad visual:** el usuario indicó que habilitará el navegador, pero el último intento todavía respondió “Local browser use is disabled in Work settings”. No se han declarado réplicas idénticas ni Core Web Vitals medidos. Una diferencia comprobable del código es Paradise: su variante actual declara otras familias tipográficas que las señales CSS de la muestra pública. Esa observación no asigna roles por frecuencia ni autoriza reemplazar la variante existente; la réplica requiere un perfil independiente y comparación renderizada por muestra. La parte técnica del invitado y la skill están entregadas; esa equivalencia visual sigue abierta.
