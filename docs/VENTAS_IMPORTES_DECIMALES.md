# Importes decimales en el seguimiento de Ventas

## Problema y resultado

El teclado decimal móvil puede ofrecer una coma. El campo «Ingreso (Bs)» la conservaba como texto, pero al guardar solo admitía punto. La mejora acepta ambos separadores en el borrador del editor y prepara un importe numérico canónico antes del PATCH. El servidor conserva su formato canónico; no interpreta comas recibidas directamente de un cliente externo.

| Texto del editor | Valor enviado | Significado |
| --- | --- | --- |
| `930,50` o `930.50` | `930.5` | Ingreso registrado manualmente |
| `0`, `0,00` o `0.00` | `0` | Cero registrado |
| Campo vacío | `null` | Retirar el ingreso registrado |
| `930,`, `930.`, `1.000,50`, `1,000.50` o más de dos decimales | No se prepara una operación | Corregir el texto conservado |

## Contrato y experiencia

- `commercialDraftRevenue` acepta solo texto del editor: hasta 16 caracteres, importe entre 0 y 1.000.000 Bs y hasta dos decimales. No admite separadores de miles, exponentes, signos, espacios, saltos de línea ni coerción de otros tipos. Un dato inválido no se sustituye por cero ni se redondea.
- `prepareCommercialDraftUpdate` conserva identidad y revisión del contacto, valida el UUID y el resto del borrador y entrega `revenueBs` numérico o nulo. Si el importe es inválido, no prepara la solicitud.
- `commercialRevenue` y el parser del PATCH continúan rechazando comas crudas. Se corrige además el borde heredado del regex `$`: un salto de línea final ya no puede convertirse silenciosamente en un importe canónico válido. No se aplica `trim` para aceptar el valor; si recortarlo lo cambiaría, se rechaza.
- El input sigue siendo de texto con teclado decimal y conserva exactamente lo escrito durante edición, conflicto o guardado incierto. El ejemplo y la pista describen coma/punto, precisión, ausencia de miles y el significado del campo vacío. La pista se enlaza con `aria-describedby` y queda fuera de la cuadrícula para conservar la alineación de controles.
- Cambiar solamente `200.00` por `200,00` no produce una edición semántica ni otro historial. Al resolver un conflicto, un importe equivalente sigue considerándose sin editar; un cambio real o texto incompleto se conserva para revisión.
- «Comprobar guardado» reutiliza el UUID, revisión y cuerpo canónico originales. No vuelve a interpretar el borrador ni cambia el importe mientras la operación siga incierta.
- El registro continúa siendo manual. No se procesa un cobro, se confirma una transferencia ni se habilita BCP. No cambia el SQL, el RPC, el modelo de permisos, las métricas, los precios ni las dependencias.

## Regresiones

- **16 casos nuevos del editor**: coma/punto y límites, tipos rechazados, espacios/saltos de línea, precisión y miles, API canónica, equivalencia semántica, cero frente a vacío, versiones posteriores, conflictos, preservación del texto, preparación del cuerpo, recuperación sin duplicados y tres contratos SSR del editor real.
- **1 caso nuevo HTTP/PostgreSQL local**: rechaza comas y saltos de línea antes de consultar el RPC; prepara `930,50`, lo guarda como `930.5`, comprueba el valor real de SQL y repite la solicitud con una sola fila de historial y un solo recibo.
- La muestra `/dev/services/commercial-update` documenta los importes ficticios que permiten revisar este recorrido más adelante. Sigue usando solo memoria y permanece inaccesible fuera de desarrollo. No se ha ejecutado una aceptación visual ni una prueba de teclado físico.
- La aceptación manual continúa aplazada. Las pruebas automáticas no acreditan el comportamiento del teclado ni las medidas visuales de un Android físico.

Evidencia privada: `tmp/sales-revenue-decimals/`. Las invitaciones, los presets y los recursos originales están fuera del cambio; BCP permanece bloqueado hasta contar con su contrato oficial validado.

## Verificación local

- `npm run verify` terminó correctamente después de cerrar el caso de los saltos de línea: **540 pruebas** (200 constructor/contratos, 154 servicios, 19 PostgreSQL de guardado, 40 editor/contrato/render, 14 PostgreSQL del dashboard, 16 cliente del dashboard, 17 historial, 11 navegación, 8 recuperación/render, 15 dominio del cotizador, 10 render del cotizador, 31 integridad y 5 distribución), lint, TypeScript y build. Persisten los avisos existentes de imágenes originales.
- Una primera verificación de 539 pruebas precedió al hallazgo del salto de línea; no se usa como evidencia de la versión final. La suite completa se repitió por esa corrección y nueva regresión.
- Revisión cruzada sin bloqueos pendientes. **597/597 archivos protegidos** idénticos por SHA-256 y **129 recursos originales** completos para distribución. No hay migración ni dependencia nueva.
