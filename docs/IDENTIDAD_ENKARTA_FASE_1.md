# Identidad Enkarta — Fase 1

## Posicionamiento

Enkarta convierte la información de un evento en una experiencia digital con dirección artística, personalización por invitado y operación inteligente.

La marca no compite por tener “más adornos”. Compite por unir tres cualidades:

1. **Diseño con intención:** cada colección tiene una personalidad reconocible.
2. **Edición segura:** la personalización conserva la armonía visual.
3. **Experiencia completa:** invitación, confirmación y acceso pertenecen al mismo recorrido.

## Voz de marca

- Cercana, serena y segura.
- Emocional sin frases genéricas ni exageraciones.
- Premium sin lenguaje distante.
- Tecnológica sin hablar de complejidad técnica.

### Vocabulario preferido

- Colección, experiencia, historia, recorrido, detalle, celebración, anfitrión.
- “Colección Lunaria” en lugar de “plantilla azul”.
- “Personalizar” en lugar de “configurar”.
- “Publicar” en lugar de “generar la página”.

### Evitar

- Superlativos sin evidencia: “la mejor”, “100% única”, “perfecta”.
- Nombres de competidores o descripciones que imiten su lenguaje.
- “Plantilla” en superficies comerciales; se conserva solo cuando aporta claridad técnica dentro del editor.

## Sistema de colecciones

Las claves técnicas antiguas se conservan exclusivamente como identificadores internos. Cambiarlas rompería filas existentes, URLs, recursos y diseños publicados. Toda interfaz debe resolverlas mediante `src/lib/enkarta-collections.ts`.

| Colección pública | Personalidad | Dirección artística |
| --- | --- | --- |
| Lunaria | Botánico etéreo | Azul orquídea, acuarela fría y aire editorial |
| Áurea | Editorial | Tipografía de gran formato, tinta y oro cálido |
| Atlas | Viajero | Sellos, mapas, papel de viaje y verde oliva |
| Verdealma | Jardín | Vegetación envolvente, arcos orgánicos y bosque |
| Nocturna | Luxe | Negro, marfil, mármol sobrio y metal contenido |
| Oliva | Mediterráneo | Papel marfil, ramas de olivo y luz cálida |
| Seda | Minimal | Champán mate, simetría y silencio visual |
| Granate | Dramático | Vino profundo, rosas y encuadre cinematográfico |
| Nácar | Sereno | Taupe, rosa mineral y capas nacaradas |
| Terracota | Acuarela | Mocha, materia pictórica y energía festiva |
| Aurora Rosa | Romántico | Blush, flores suaves y brillo satinado |
| Salvia | Orgánico | Verde pálido, líneas limpias y ritmo calmado |
| Solar | Atelier mediterráneo | Arquitectura cálida, olivos y fotografía editorial |

## Principios visuales compartidos

1. **Ritmo vertical:** cada sección debe respirar y conducir naturalmente a la siguiente.
2. **Una jerarquía dominante:** el usuario identifica título, dato principal y acción sin competir con la decoración.
3. **Color con función:** primario para identidad, profundo para contraste, acento para acciones y detalles.
4. **Ornamento subordinado:** ningún adorno reduce legibilidad ni invade controles.
5. **Movimiento con propósito:** las animaciones presentan, conectan o confirman; no distraen.
6. **Móvil primero:** la composición debe funcionar a 360 px antes de ampliarse.

## Política de compatibilidad

- No renombrar valores guardados en `Invitation.template`.
- No cambiar las rutas públicas existentes durante la Fase 1.
- No eliminar recursos que utilice una invitación publicada.
- Los nombres internos nunca se muestran directamente al cliente.
- Cada nueva colección recibe un nombre, descripción, dirección artística y recurso propios antes de publicarse.
- Las migraciones visuales se aplican como nuevas versiones; no reescriben silenciosamente diseños aprobados.

## Criterio de salida de la Fase 1

- Catálogo, editor, muestras y panel utilizan el registro central de identidad.
- No existen dependencias de recursos alojados por un competidor.
- La página comercial usa una voz propia.
- Los diseños antiguos siguen abriendo con sus claves y enlaces actuales.
- [Completado en la Fase 2](./IDENTIDAD_ENKARTA_FASE_2.md): rediseño visual de Lunaria, Áurea, Atlas y Verdealma.
