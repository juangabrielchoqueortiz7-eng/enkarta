# Mapa de referencia observado · 22 de octubre de 2026

Se leyeron las 30 páginas públicas enlazadas desde el inicio y sus categorías, y 31 hojas CSS enlazadas: inicio, tres categorías, login público, términos y 24 muestras (12 bodas, ocho XV, una graduación y tres bautizos). Todas devolvieron HTTP 200. No se enviaron formularios ni se intentó autenticar. No se inspeccionó un constructor privado. El navegador está deshabilitado; no hay capturas ni prueba visual ejecutada.

## Arquitectura y composición

El HTML declara WordPress, Astra y Elementor, con contenedores anidados, estilos por ID de elemento, variantes de visibilidad y valores específicos de escritorio/tablet/móvil. Las muestras combinan entrada, portada tipográfica, fecha/calendario, cuenta atrás, ubicaciones, protocolo/vestimenta, itinerario, fotos, regalos y confirmación; el orden y la presencia cambian por modelo. El contenido visible no se puede deducir de la lista de encabezados: hay textos dibujados como imágenes y bloques ocultos.

En los CSS aparecen umbrales 767/768 y 1024/1025, además de reglas del tema a 544 y 921. También hay reglas generadas con -1: no convertirlas en breakpoints válidos de Enkarta. Se observan animaciones por elemento, velocidades, rangos de scroll, carruseles y fondos; conservar parámetros de la muestra, no un preset genérico. El archivo de evidencia contiene ejemplos por ID y hashes de cada documento/CSS.

La portada comercial usa familias y acentos propios; no es un tema universal para las invitaciones. Los precios, testimonios, marcas y reglas de operación ajenos no se importan como hechos de Enkarta. El formulario de Enkarta sigue validando cupos en el servidor.

## Muestras y señales CSS

Las familias y colores de esta tabla son las primeras señales por frecuencia en el CSS de la página, incluidos estilos heredados del tema. No constituyen una asignación de roles ni una paleta certificada. Cada réplica requiere inspeccionar los selectores y el estado visible.

| Muestra pública | Familias declaradas frecuentes | Colores declarados frecuentes |
| --- | --- | --- |
| [azure](https://invitali.com/azure/) | Cinzel · Cormorant Infant · Playfair Display | #002D63 · #4C5B75 · #897a59 |
| [muestra-pasport](https://invitali.com/muestra-pasport/) | Baskervville · Nathalia · Playfair Display | #000000 · #6C7563 · #DDCBB4 |
| [muestra-primicia](https://invitali.com/muestra-primicia/) | Old Standard TT · Times New Roman · Playfair Display | #000000 · #1B1A1C · #FFFFFF |
| [muestra-paradise](https://invitali.com/muestra-paradise/) | Poiret One · Nathalia · Playfair Display | #EDE4D2 · #324D2F · #897a59 |
| [dolcevita](https://invitali.com/dolcevita/) | Cormorant Infant · Meow Script · Cinzel | #51765D · #000000 · #FFFFFF |
| [grazia](https://invitali.com/grazia/) | Poiret One · Tangerine · Playfair Display | #000000 · #FFFFFF · #967F60 |
| [obsidiana](https://invitali.com/obsidiana/) | Raleway · Poiret One · Romantic Lovely | #F7E0A5 · #897a59 · #5eead4 |
| [euforia](https://invitali.com/euforia/) | Cormorant Infant · Romantic Lovely · Playfair Display | #967F60 · #E4CFC1 · #FFFFFF |
| [napoli](https://invitali.com/napoli/) | Cinzel · Cormorant Garamond · Playfair Display | #7A695D · #FFFFFF · #AE9C8F |
| [carmesi](https://invitali.com/carmesi/) | Cormorant Infant · Playfair Display · inherit | #7F0021 · #967F60 · #F7E0A5 |
| [allegria](https://invitali.com/allegria/) | Raleway · Playfair Display · Bodoni Moda | #000000 · #FFFFFF · #897a59 |
| [rosegold](https://invitali.com/rosegold/) | Cormorant Garamond · Cormorant Infant · Great Vibes | #B1748B · #A86690 · #967F60 |
| [muestra-fashion](https://invitali.com/muestra-fashion/) | Poiret One · Rische · Rische | #FFFFFF · #897a59 · #AF148B |
| [rosabella](https://invitali.com/rosabella/) | Cormorant Infant · Rische · Cinzel | #A56B6A · #E49E9D · #897a59 |
| [splendida](https://invitali.com/splendida/) | Cormorant Infant · Rische · Nathalia | #E7C878 · #897a59 · #5eead4 |
| [secret](https://invitali.com/secret/) | Cormorant Infant · Nathalia · Aboreto | #FFFFFF · #897a59 · #E5D2C4 |
| [gemma](https://invitali.com/gemma/) | Cormorant Infant · Playfair Display · Great Vibes | #7A695D · #E5D2C4 · #D6A299 |
| [rossamore](https://invitali.com/rossamore//) | Cinzel · Playfair Display · inherit | #000000 · #E08489 · #897a59 |
| [muestra-rosseto-mis-15](https://invitali.com/muestra-rosseto-mis-15/) | Cormorant Infant · Playfair Display · Great Vibes | #7A695D · #FFFFFF · #E5D2C4 |
| [promo-2024](https://invitali.com/promo-2024/) | Poiret One · Cormorant Infant · Playfair Display | #FFFFFF · #897a59 · #A88144 |
| [muestra-mis-xv-zafiro](https://invitali.com/muestra-mis-xv-zafiro//) | Cinzel · Romantic Lovely · Caudex | #A7E5FF · #57FFEB · #897a59 |
| [fiori-muestra-bautizo](https://invitali.com/fiori-muestra-bautizo/) | Cormorant Infant · Cormorant Garamond · Great Vibes | #51765D · #FFFFFF · #897a59 |
| [azul-muestra-bautizo](https://invitali.com/azul-muestra-bautizo/) | Cormorant Infant · Playfair Display · Great Vibes | #124F88 · #FFFFFF · #897a59 |
| [rosse-muestra-bautizo](https://invitali.com/rosse-muestra-bautizo/) | Cormorant Infant · Cormorant Garamond · Alex Brush | #DFA9A9 · #FFFFFF · #897a59 |

## Reutilización y vigencia

Los originales anteriores de Enkarta están registrados por URL completa en la carpeta maestra y invitation-assets.ts. Este análisis no descargó archivos multimedia ni acredita que las variantes actuales coincidan con las nuevas versiones del sitio de referencia. Consultar esos manifiestos antes de cualquier descarga. Los HTML/CSS crudos usados para el análisis permanecen en tmp/guest-experience/invitali, fuera del despliegue; los hashes y URLs necesarios para volver a observar están en la evidencia de esta skill.
