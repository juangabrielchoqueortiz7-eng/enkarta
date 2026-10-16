# Carga segura de archivos de invitados

En **Lista de invitados → Añadir / importar → O elegir una lista desde Excel**,
selecciona un CSV, TSV o TXT de hasta 1 MB. Para Excel, usa **CSV UTF-8** o
**Texto Unicode**. Los libros XLS/XLSX requieren exportación; renombrarlos a CSV
no los convierte en una lista compatible.

La mejora se comparte entre el panel del anfitrión y el padrón del constructor.
Conserva la asignación de columnas, validación de cada registro, comprobación de
duplicados en todo el padrón, límite de 200 por lote y alta recuperable existente.
Las preferencias de ceremonia/recepción siguen siendo informativas, sin alterar QR.

## Comportamiento

- Reconoce UTF-8 con/sin BOM y UTF-16 LE/BE con BOM, incluido el TXT tabulado de Excel.
  La decodificación es estricta: no sustituye caracteres ilegibles en los nombres.
  Un archivo de codificación heredada debe volver a exportarse con los formatos indicados.
- Rechaza archivos vacíos, sin registros, incompletos, excesivos, con comillas sin
  cerrar, contenido binario o caracteres inválidos. Los avisos indican cómo corregirlos.
- Conserva la lista manual o vista previa anterior hasta validar la nueva lectura.
  Ante un error, bloquea «Añadir» y permite elegir otro archivo, editar la lista o
  pulsar explícitamente «Continuar con la edición anterior».
- Una lectura anterior que llega tarde, incluso con error, no reemplaza el archivo
  más reciente. Cancelar, editar manualmente, cambiar columnas, cerrar el formulario,
  cambiar de evento o desmontarlo invalida el resultado pendiente.
- Se muestra nombre y codificación del archivo que produjo la vista previa. El input
  se reinicia después de cada selección para permitir elegir el mismo archivo otra vez.
- Mientras se lee, la alta está bloqueada también mediante una comprobación síncrona.
  Cancelar descarta el resultado de esa lectura; no borra invitados del servidor.

## Privacidad y alcance

El archivo se procesa en el navegador. La comprobación de duplicados usa la API
privada existente y envía solo los candidatos necesarios (nombre y teléfono), sin
descargar el padrón completo. Solo «Añadir» crea el lote por la API autorizada.

No se persiste el archivo ni la vista previa sin confirmar en el navegador. Cerrar y
abrir el formulario conserva el borrador dentro de la misma página; recargar requiere
seleccionar de nuevo un archivo no importado. Una alta ya iniciada conserva el mecanismo
de recuperación de la migración 017, sin cambiar UUID ni duplicar invitados.

No se modifican permisos, rutas públicas, estilos globales, invitaciones o recursos
originales. Sin nuevas dependencias, cambios de CSP o migraciones SQL. BCP desactivado.

## Pruebas

Nueve regresiones nuevas ejecutan los decodificadores reales y el control de lecturas,
con archivos UTF-8/UTF-16, binarios, codificación ilegible, límites y errores de lectura.
Las promesas controladas comprueban carreras, cancelación y reelección. Una prueba con
PostgreSQL WASM importa un TXT Unicode, comprueba nombres, teléfonos y pases y recupera
el mismo lote una sola vez; puerta continúa sin permiso de alta ni movimientos QR.

Verificación completa: `npm run verify` (300 regresiones locales, tipos, lint y build).
Los avisos previos de imágenes originales permanecen; no se reemplazan recursos para
silenciarlos. Las pruebas visuales móviles son emulación, sin certificar iOS físico.

La comprobación HTTP existente incorpora estos flags opcionales:

```powershell
node scripts/check-integrity-http.cjs --exercise --production --app-url https://enkarta.vercel.app --expect-project eodedockxqvynedwhpsp --roster-pagination --checkin-history --csv-file-import --csv-browser-window --report tmp/csv-file-import/production-http.json
```

La ventana de navegador crea credenciales y un TXT exclusivamente ficticios; verifica
que se añadan dos grupos y seis pases, sin registros de recepción ni mensajes. Expira
en ocho minutos y ejecuta limpieza de su ámbito incluso si falla. Los archivos temporales
de acceso y de ese lote se retiran al terminar. No deben publicarse ni guardarse en Git.
