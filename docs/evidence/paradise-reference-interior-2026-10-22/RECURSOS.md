# Originales del interior de Paradise

Fecha de trabajo local: 22 de octubre de 2026. Las horas `verifiedAt` del registro usan UTC.

Se consultaron antes de descargar la carpeta `Iconos INVITALI/`, su `manifest.json`, los manifiestos particulares, `public/invitali-originales.json` y `invitation-assets.ts`. Los trece JSON conocidos se reutilizaron por URL completa. No se descargaron de nuevo los originales ya archivados.

Se añadieron diez originales faltantes: siete fotografías, el logo de Falabella, la canción `2025/05/Ed-Sheran-Perfect-Violin.mp3` y `2025/05/biblia.json`. La Biblia está disponible como «Biblia · Original» en el catálogo reutilizable del constructor; ya no requiere un sustituto ni queda pendiente por 403. Los archivos conservan los bytes del servidor y sus nombres de archivo maestro incluyen año y mes.

El registro [resources.json](resources.json) conserva cada URL completa, ruta local, tamaño y SHA-256. Las fotografías y el logo se importaron mediante el modo `--resources` del importador; la Biblia y la canción, mediante el importador de JSON/audio. La segunda importación de imágenes no cambió ningún archivo.

Los **137 registros protegidos anteriores permanecen idénticos**. El registro de distribución contiene ahora **148 archivos**: los diez nuevos y el original ya existente de Solo adultos que se añadió a la protección sin modificar sus bytes. Se verificaron contra disco el tamaño y SHA-256 de los 148.

La canción original dura 214,529161 segundos, es MP3 estéreo de 44.100 Hz y ocupa 1.287.764 bytes. La Biblia es un Lottie de 500 × 500, 60 cuadros por segundo y 120 cuadros. No se recomprimieron imágenes ni audio y no se alteró el JSON para ajustar la apariencia; el color, tamaño y reproducción pertenecen a cada instancia.

La galería de tres imágenes conserva el orden `paradise-muestras3`, `paradise-muestras6`, `paradise-muestras5`. El cierre conserva `muestras-PARADISE2`, `muestras-PARADISE1`. El HTML archivado declara cambios cada 2.000 ms con transición de 1.000 ms; la galería interior declara además zoom de acercamiento. Estos datos son configuración declarada, no una certificación de equivalencia visual o temporal.

No se descargó ni utilizó el QR bancario de la referencia, su formulario externo ni su marca comercial. El logo de Falabella es únicamente el recurso gráfico de la sección de regalos de la muestra; no registra ninguna cuenta ni integración de pago. BCP sigue fuera de esta implementación. Los recursos y el diseño de Verdealma se conservaron.
