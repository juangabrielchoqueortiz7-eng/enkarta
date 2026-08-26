# Constructor Enkarta — Fase 5

## Objetivo

Hacer que la adaptación responsive sea visible y controlable. El diseñador puede comprobar tamaños reales, decidir qué hereda cada dispositivo y crear composiciones distintas sin deformar la invitación principal.

## Entregado

### Breakpoints reales

- Selector permanente para 360, 390, 768, 1024 y 1440 px.
- El preview usa el ancho lógico seleccionado; no es solo un cambio de marco decorativo.
- Etiqueta visible con ancho, dispositivo y número de bloques.
- Comparación simultánea de móvil a 390 px y escritorio a 1024 px.
- En monitores amplios, la comparación se abre automáticamente y cualquier breakpoint vuelve al modo editable.

### Tres estados por dispositivo

- **Heredado:** conserva la geometría base.
- **Automático:** elimina desplazamientos, giros y anchos arriesgados; centra el bloque.
- **Personalizado:** activa posición, tamaño, giro y capa propios.
- Los documentos anteriores sin estado explícito mantienen su comportamiento.

### Composición independiente

- Copiar ajustes de móvil a escritorio y viceversa.
- Mostrar, ocultar o heredar visibilidad en cada dispositivo.
- Reordenar un bloque solamente en móvil o escritorio.
- Crear una variante exclusiva para un dispositivo: el original queda en el otro y la copia se puede editar libremente.
- Los bloques ocultos permanecen visibles con baja opacidad dentro del editor para poder recuperarlos.

### Tipografía responsive

- Escala independiente de 75% a 135% para portada, título, texto, cita y hashtag.
- Límites seguros compartidos entre preview y render público.
- Las portadas y títulos fluidos conservan mínimos y máximos para no explotar en pantallas grandes ni quedar ilegibles en móvil.

### Auditor responsive

- Detección de desborde en 360, 390, 768, 1024 y 1440 px.
- Aviso de bloque oculto en todos los dispositivos.
- Aviso de texto demasiado reducido o con riesgo de corte.
- Detección aproximada de adornos superpuestos por ancla y posición.
- Aviso accionable dentro del inspector con recomendación de usar Automático, reducir ancho o recentrar.

## Modelo

`BlockViewportLayout` incorpora `mode`, `hidden`, `order` y `fontScale`. Son atributos opcionales dentro del JSON del constructor, por lo que no requieren una migración SQL y mantienen compatibilidad con las invitaciones ya guardadas.

## Verificación

- Cambio real entre los cinco anchos verificado en navegador.
- Persistencia independiente de ajustes móvil/escritorio verificada.
- Comparación 390/1024 verificada visualmente.
- Creación de variante exclusiva verificada: el documento pasó de 14 a 15 bloques conservando ambas composiciones.
- TypeScript y ESLint sin errores antes de la compilación final.
- Ruta temporal de control eliminada después de la prueba.

## Siguiente fase

La Fase 6 puede concentrarse en kits visuales completos y normalización: paleta, tipografías, botones, radios, sombras, espaciado, tokens semánticos y una acción para limpiar diseños antiguos sin perder contenido.
