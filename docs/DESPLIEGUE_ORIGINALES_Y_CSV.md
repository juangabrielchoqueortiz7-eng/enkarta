# Fusión a main, originales y descarga CSV

## Protección del despliegue

Vercel está conectado a GitHub y su rama de producción es `main`. El repositorio
público excluye seis archivos de audio originales presentes en este workspace.
Publicar una copia incompleta desde Git perdería esos recursos.

`vercel.json` invoca `scripts/vercel-originals-guard.cjs` como `ignoreCommand`.
Antes de instalar dependencias o compilar, compara los 129 recursos de
`scripts/original-distribution-lock.json` con su longitud y SHA-256. Si falta o
cambia uno, o el inventario es inválido, devuelve 0: Vercel omite ese despliegue
y conserva el dominio sobre la versión publicada. Con todos los bytes correctos
devuelve 1 y permite compilar. No descarga, cambia ni reconstruye recursos.

El inventario contiene únicamente rutas públicas, longitudes y hashes; no
incluye archivos maestros, credenciales ni rutas privadas. Se obtuvo de los
manifiestos archivados ya verificados. Al incorporar originales autorizados,
actualizarlo comprobando los bytes contra esos manifiestos, sin reserializar ni
alterar los originales. Los despliegues completos siguen saliendo del workspace
verificado mediante Vercel CLI. Una cancelación `ORIGINALS_REQUIRED` en un
checkout incompleto es la protección prevista, no una nueva versión publicada.

La semántica 0/1 está documentada en la
[configuración oficial de Vercel](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand).
Las regresiones se ejecutan con `npm run test:deployment`, también dentro de
`npm run verify`. Cubren bytes válidos, faltantes, alterados, inventarios
inválidos y rutas ambiguas o externas.

## Descarga CSV

El padrón conserva el intento de descarga con un clic y añade el enlace nativo
**Descargar CSV preparado**. Permite guardar el mismo archivo si el navegador
bloquea el clic automático o si el usuario desea repetirlo.

- CSV UTF-8 con BOM, nombre del evento y todos los resultados filtrados.
- El enlace conserva el archivo preparado mientras la pantalla sigue abierta;
  no revoca su URL después de un segundo.
- Cambiar filtros oculta el enlace anterior para evitar confundir su alcance.
- Preparar otro archivo libera la URL anterior. Salir del panel libera el archivo
  y cancela la solicitud pendiente; una respuesta tardía no inicia una descarga
  después de cerrar sesión.
- Un bloqueo o error sigue conservando los filtros. No se anuncia que el archivo
  está guardado en el dispositivo únicamente por haberlo preparado.
- Las comprobaciones de acceso y la protección frente a cambios concurrentes
  permanecen en el servidor; ningún recurso de invitaciones se modifica.

La prueba HTTP admite `--roster-pagination --csv-window`. Crea exclusivamente
datos ficticios, espera el ejercicio de navegador y comprueba que
`browser-export.csv` tenga 1.001 registros, BOM y coincidencia exacta con el CSV
del servidor. El informe registra limpieza final; si el proceso se interrumpe,
`--resume-cleanup` retoma únicamente el alcance registrado. Los archivos con
credenciales de prueba nunca se guardan en Git y se eliminan al terminar.
