# Paradise: ajuste visual focalizado

Muestra: https://enkarta.vercel.app/muestra/paradise-referencia . Referencia: https://invitali.com/muestra-paradise/?n=2%20pases&m=Daniel%20Martinez . Skills: fidelidad Invitali del proyecto e Impeccable, conservando la composición elegida.

Código desplegado: `38c8e1fc1bbcbe8a73f9ff95aab6883fdeee6229`. Vercel Ready: `dpl_5D8uRqjKD9RKoNifth1cvSsSv1AE`; el dominio público se inspeccionó por separado y coincide. Los 24 archivos críticos coinciden por bytes con el commit.

## Cambios terminados

- Introducción: medida de texto de 500 px en escritorio y 300 px en móvil, recuperando sus saltos de línea en lugar de una línea de 1.140 px.
- Galería móvil: 350 × 510 px, frente a los 268,6 × 506,5 px anteriores. El espaciado coloca la imagen en y=1.901,72 px frente a y=1.901,46 px de la referencia observada, sin fijar una altura artificial a toda la sección.
- Cámara: caja de flujo de 103 × 70,5 px y dibujo original de 103 × 62,42 px. Se midió después de cargar el SVG: los 27,19 px iniciales pertenecían al estado provisional de carga y no eran la altura final del original.
- Solo adultos: caja de 100 × 108 px en escritorio y 65 × 73 px en móvil; dibujo original de 116 y 81 px respectivamente, con el desplazamiento de instancia observado. Ningún JSON fue modificado.
- Párrafos de las tarjetas móviles con la medida observada, manteniendo Poiret One a 16/18 px y sus cuatro líneas.

## Verificación proporcional

Se ejecutaron **35 regresiones de interiores aprobadas** y la compilación de producción. Se añadió `scripts/paradise-visual-check.cjs`, que valida medidas de DOM reales y cinco puntos de interacción del control de galería. Aprobó a **390 × 844** y **1.440 × 900**: iconos originales cargados, controles visibles y alcanzables, sin desbordamiento horizontal y con la misma música original sin autoplay de montaje.

Reproducir la validación de los informes guardados:

```text
node scripts/paradise-visual-check.cjs docs/evidence/paradise-reference-polish-2026-10-22/mobile.json docs/evidence/paradise-reference-polish-2026-10-22/desktop.json
```

Los JSON provienen del inspector de solo lectura ejecutado mediante el navegador autorizado. El comando valida esas observaciones; para comprobar otro despliegue hay que volver a capturarlas. Las capturas son regiones nativas del documento, sin montajes. No acreditan identidad global de píxeles ni reproducción física de audio.

- [Móvil](mobile-gallery.jpg), [escritorio](desktop-intro.jpg).
- [Medidas móviles](mobile.json), [medidas de escritorio](desktop.json).
- [Archivos desplegados](source-attestation.json), [conservación](preservation.json).

Los 148 recursos protegidos coinciden por tamaño/SHA-256 con los originales de la entrega y por identidad SHA-1 con los archivos subidos a Vercel. Es una comprobación de la entrega subida, no una nueva descarga HTTP de cada recurso. Verdealma, el adaptador BCP bloqueado y los datos iniciales de Paradise conservan sus bytes respecto al cierre anterior.

Se utilizó la muestra ficticia estática existente. No se crearon eventos, invitados, pagos, mensajes ni archivos en producción; no hay fixtures nuevos que limpiar. Los flujos de negocio no cambiaron, por lo que no se repitió la batería global ni la prueba de escritura/publicación ya cerrada. El trabajo concurrente de Azure y el SQL local del usuario quedaron fuera de la entrega.
