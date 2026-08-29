# Servicios · Fase 8 — Calidad, soporte y publicación segura

Implementación local del 29 de agosto de 2026. Esta fase añade un expediente de
aceptación por invitación. No marca pruebas como aprobadas automáticamente: combina
la cobertura técnica con evidencia humana de dispositivos, cámara, proveedores y
operación real.

## Centro de calidad

El constructor incorpora la sección **Calidad** con recorridos separados para los
tres paquetes. Cada comprobación registra resultado, fecha y una evidencia o
incidencia. El paquete contratado es el que controla la liberación; los otros dos
recorridos quedan disponibles para ensayos y futuras ampliaciones.

Comprobaciones comunes:

- lectura completa en 360 y 390 px;
- portada, navegación, galerías y formularios utilizables;
- carga esencial en conexión lenta;
- pérdida y recuperación de red sin éxitos inventados ni datos perdidos;
- aislamiento entre invitado, revisión, anfitrión y puerta;
- respaldo restaurable y versión identificada para rollback;
- aprobación de la versión exacta por el cliente.

Además, Plus comprueba WhatsApp y sus límites; Premium comprueba formulario,
planilla y ausencia de panel/puerta; Exclusive comprueba panel en vivo, QR con dos
dispositivos y revocación del acceso de puerta.

## Gate de liberación

Una invitación solo puede pasar a **Aprobada** cuando:

1. todas las comprobaciones del paquete contratado están aprobadas; “No aplica”
   documenta una excepción, pero no abre el gate;
2. no existe ningún fallo abierto;
3. canal, horario, primera respuesta y responsable de escalamiento están definidos;
4. las instrucciones de anfitrión y puerta fueron entregadas;
5. la retención fue explicada, existe un respaldo y se probó su restauración;
6. existen responsables de eliminación e incidentes;
7. se guardaron la URL de vista previa y la versión para rollback.

Después de la aprobación, **Confirmar producción** registra que la versión pública
fue comprobada. El JSON de aceptación descargable conserva el paquete, la evidencia,
el soporte, la recuperación y la decisión de liberación. Este expediente interno se
elimina del documento que reciben los invitados.

## Procedimiento recomendado

1. Guardar una versión estable y un respaldo antes de la prueba.
2. Publicar en vista previa, nunca directamente en producción.
3. Ejecutar el recorrido del paquete contratado en móvil y escritorio.
4. Repetir los casos de red, permisos y restauración.
5. Entregar las guías de [anfitrión](GUIA_ANFITRION.md) y [puerta](GUIA_PUERTA.md).
6. Resolver fallos; no convertirlos en “No aplica” para abrir el gate.
7. Registrar la aprobación del cliente y descargar el expediente.
8. Promover a producción, comprobar la URL pública y observar las primeras horas.

## Base de datos y verificación

La fase 8 no agrega una migración: el expediente vive en la configuración privada
de la invitación y las APIs públicas lo filtran. Requiere que las migraciones de los
servicios usados por el paquete ya estén aplicadas.

Antes de promover:

```powershell
npm run verify
```

Las pruebas automatizadas no sustituyen la cámara, la concurrencia con dos teléfonos,
la conexión lenta ni la revisión del cliente. Esas pruebas deben quedar registradas
en el Centro de calidad.
