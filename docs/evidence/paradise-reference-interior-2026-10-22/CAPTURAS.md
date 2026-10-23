# Comparación renderizada de interiores Paradise

Referencia concreta: `https://invitali.com/muestra-paradise/?n=2%20pases&m=Daniel%20Martinez`.
Entrega independiente: `https://enkarta.vercel.app/muestra/paradise-referencia`.

Se usó la skill del proyecto `enkarta-invitali-fidelity`. Las capturas y observaciones iniciales de la referencia permanecen en `docs/evidence/invitali-paradise-2026-10-22/`; no se reemplazan por estas imágenes.

La referencia se inspeccionó a 1.440 × 900 y 390 × 844. Se revisaron regiones de introducción, versículo, cuenta regresiva y galería, padres, lugares, vestimenta, cronograma, regalos, hospedaje, adultos, fotos, asistencia y cierre. Las medidas, fuentes y parámetros declarados sirvieron para implementar la variante; el código HTML por sí solo no acredita fidelidad visual.

## Capturas finales de producción

Ambas imágenes proceden del despliegue Ready `dpl_7aGorfPM4TyeH85dfcfoWyWidhRd`, commit de aplicación `0b6346d2ac5b58ad4517e4f95947de0b56b0e539`. Son capturas nativas del navegador de la región completa de cuenta regresiva y galería, con coordenadas del documento. No son montajes ni imágenes generadas. Los elementos fijos pueden aparecer desplazados dentro de un recorte del documento; su posición se comprobó también en el viewport durante la interacción.

- [Escritorio, 1.440 × 900](production-desktop-countdown.jpg).
- [Móvil, 390 × 844](production-mobile-countdown.jpg).
- [Comprobación de cinco puntos del control de galería](production-gallery-control-probe.json).

El control adicional de pausa se recortaba con el arco en la primera revisión móvil. Se corrigió su posición, se volvió a desplegar y se comprobaron centro y cuatro puntos interiores del botón: todos alcanzables. El mínimo CSS es 44 px; la geometría renderizada fue 43,9913 px por redondeo de pantalla, sin desbordamiento horizontal. La navegación manual cambia de imagen y mantiene el carrusel pausado hasta reanudarlo.

La música original se inició desde «Ver invitación» y confirmó `paused = false`, `readyState = 4`, duración 214,529161 segundos. Después se pausó de forma explícita y quedó `paused = true`. La prueba fue en el navegador integrado; no acredita reproducción física en Android o iOS.

Las vistas de producción conservan la galería de tres originales, los hoteles y el cronograma alternado; las pruebas automáticas verifican también asociación de títulos y pies, cambios simultáneos, URLs seguras, contratos de funciones y respuestas de reproducción obsoletas.

## Diferencias y límites explícitos

RSVP, pie y enlaces comerciales pertenecen a Enkarta. El QR es una demostración que dice «DEMO · no realizar transferencias»; no se reutiliza un QR bancario ajeno. Los controles manuales, pausa y restricciones de movimiento son adiciones de accesibilidad. Los horarios de la muestra de Enkarta son coherentes entre ubicación y cronograma aunque la referencia contiene contradicciones.

El recorrido y la comparación por regiones no certifican identidad global de píxeles, equivalencia temporal medida ni resultados de Core Web Vitals. Los parámetros de 2.000/1.000 ms del carrusel y el avance/retroceso de Lottie se documentan por su procedencia y se prueban en código. Una revisión física de audio sigue siendo una aceptación distinta.

La muestra pública es estática y permanece disponible. Los dos eventos ficticios usados para comprobar persistencia y publicación se eliminaron; no se conserva una invitación QA publicada. Los resultados técnicos y de limpieza están en [acceptance.json](acceptance.json).
