# Promesa — tercera propuesta original

Ruta: `/muestra/promesa`. `?full=1` omite la carta inicial; `?m=Familia%20Pérez&n=3` personaliza la muestra.

Dirección: recuerdos impresos en blanco y negro, papel marfil y rosa empolvado. La portada reúne tres fotografías que se separan suavemente con el scroll. La invitación personalizada toma forma de carta. El álbum tiene tres páginas dobles, controles anterior/siguiente y ampliación individual. Textos sobre papel, no sobre fotografías. En móvil el itinerario se convierte en una secuencia vertical.

Implementación independiente en `Promesa.tsx` y `Promesa.module.css`; datos iniciales en `src/lib/promesa.ts`. Conserva la confirmación centralizada, los contratos del paquete, los invitados, los pases y los controles del constructor. El constructor permite reemplazar las fotos y ajustar sus encuadres; el álbum determina también las fotografías laterales de la portada. El movimiento reducido y el preset «Sin animación» desactivan las transiciones.

Recursos: reutiliza fotografías ya archivadas de Manuel/Maya como muestras editables, fuentes locales y JSON originales de la biblioteca. No se descargaron ni alteraron originales. No se crearon fotos nuevas. Jardín de Seda, Votos y las réplicas previas permanecen independientes.

Validación: TypeScript y lint sin errores; 74 pruebas aprobadas, incluida persistencia independiente de Promesa. Revisión en navegador de apertura, portada en escritorio y móvil de 390 px, las tres páginas del álbum, ampliación, nombre personalizado y confirmación de muestra. No se detectaron imágenes rotas ni desbordamiento horizontal en móvil. El formulario demo no envía respuestas reales.


## Armonización y separadores (10 de septiembre de 2026)
Promesa incorpora cintas asimétricas de tres capas en portada, fecha y álbum. Se coordinaron los marcos de lugares, carta de invitado, álbum y confirmación con la misma paleta. La apertura usa el JSON original de pareja (MA_ICONS.couple) y el álbum el de fotografía (MA_ICONS.photo), con color configurado por instancia. Pareja de apertura se puede seleccionar desde el editor de iconos. No se descargaron ni modificaron archivos JSON.

Validación: TypeScript, lint de componentes afectados y 74 pruebas del constructor aprobados. Separadores inspeccionados en navegador; Jardín de Seda y Votos revisados también a 390 px.
