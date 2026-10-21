# Fecha del evento en Socios

## Problema y resultado

`event_date` se almacena como `DATE` en `migrations/001_create_invitations.sql`. La tarjeta de «Mis invitaciones» utilizaba el mismo formateador que las marcas de tiempo: `new Date(value).toLocaleDateString(...)`. Un evento del **20 de octubre de 2026** se mostraba como **19 de octubre** en equipos configurados en Bolivia o Los Ángeles.

La tarjeta reutiliza ahora `formatValidityDate`, el formateador de fechas de calendario existente. Valida `YYYY-MM-DD` con una comprobación de ida y vuelta y fija su zona de presentación, conservando el día del evento independientemente de la zona del equipo. No modifica el valor almacenado ni transforma la fecha en una hora del evento. Los valores ausentes, imposibles o que no cumplen el contrato `DATE` muestran «Sin fecha».

Las fechas de vencimiento de la suscripción, registro de pagos y alta del Socio mantienen su formato local de marcas de tiempo. No se reutiliza indiscriminadamente el formateador de calendario para esos campos.

## Alcance y conservación

- Solo cambia el import y la expresión que presenta `event_date` en `PartnerDashboard.tsx`. El formateador compartido y sus validaciones permanecen intactos.
- Se conservan las otras once funciones del archivo, los tres usos de marcas de tiempo, los estados, IDs, enlaces y acciones de las invitaciones. La estructura JSX, textos ajenos a la fecha y atributos visuales permanecen iguales.
- No cambia el SQL, la API, los permisos, los pagos, la publicación ni los datos de las invitaciones. No se modifican renderizadores públicos, presets, fotografías, música, animaciones o estilos globales.
- BCP continúa bloqueado. No se introducen dependencias, consultas adicionales, efectos ni imports de servidor en el cliente.

Skill aplicada: `vercel-react-best-practices`, conservando el cálculo puro a partir de los datos del componente y reutilizando una utilidad existente sin añadir estado o consultas.

## Verificación

`scripts/test-partner-event-date-ui.cjs` renderiza los componentes reales de Socios mediante SSR en procesos Node separados con zonas `UTC`, `America/La_Paz`, `America/Los_Angeles` y `Pacific/Kiritimati`. Los escenarios usan únicamente datos ficticios y el transporte está prohibido. El modo de referencia opcional sustituye únicamente `PartnerDashboard` por su fuente anterior; la ejecución habitual de CI no usa Git.

Se comprueban fechas de calendario, límites de mes y año, bisiestos, días próximos a cambios de horario, valores inválidos y ausentes, datos de entrada intactos y acciones conservadas. Las fechas locales de suscripción, pagos y alta se verifican por separado para evitar una conversión global a fechas de calendario.

- **16/16 pruebas nuevas correctas**: cuatro grupos en cada una de las cuatro zonas. Incluyen **200 casos de valores DATE** agrupados y 216 renderizados SSR, sin simular hooks ni enviar peticiones.
- **Referencia `1050ea524d906e934356e438121f24bacb7e317f`: 9 aciertos y 7 fallos**, reproduciendo el error previo y manteniendo los comportamientos ya correctos.
- Los datos ficticios se congelan recursivamente y se comparan antes y después; el arnés registra y rechaza cada intento de red, aunque el componente capturase el error.

La revisión independiente confirma el cambio exacto de dos líneas y que el grafo de imports de la utilidad no introduce red, servidor ni efectos adicionales. La aceptación manual en dispositivos queda aplazada. Las comprobaciones de producción contrastan las fuentes del despliegue `Ready`, permisos HTTP y hashes de originales; no equivalen a una aceptación de la tarjeta dentro de un navegador móvil autenticado.

Evidencia privada: `tmp/partner-event-date/`.

## Verificación local previa al despliegue

- `npm run verify`: **1.505 pruebas correctas en 50 ejecuciones de suites**, lint, TypeScript y build con **65 páginas generadas**, código de salida 0 y sin reintento separado del build.
- **34/34 comprobaciones sin red** del verificador privado de producción.
- **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 recursos originales**.
- Revisión independiente de fuente y pruebas sin bloqueantes; componentes reales, fixtures inmutables, expectativas literales y cero intentos de red. El alcance SSR no acredita hidratación ni aceptación móvil.

## Despliegue y comprobaciones de producción

Código de aplicación `7ccd0d52ad415aee2645f42b27f68bf069945768`, integrado en `main`. Vercel confirma **Ready** para `dpl_3apwF43fWLXind7bg7qeKaUsvbB6`, asociado a [Enkarta](https://enkarta.vercel.app).

[CI del SHA exacto](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39536642494) completado con éxito: `npm run verify` y `npm audit --omit=dev --audit-level=high`. El cierre automático de evidencia contrastó CI, despliegue, fuentes, contadores de pruebas y conservación de originales.

- Correspondencia exacta de tres fuentes desplegadas: `PartnerDashboard.tsx`, `invitation-validity.ts` y `payments/bcp.ts`.
- **13 grupos HTTP correctos** y **75 peticiones denegadas**, incluidas **63 solicitudes de escritura**. Los paneles privados mantienen el acceso protegido y los retornos seguros. Una sesión de administrador no suplanta a un Socio.
- El historial privado se consulta con un identificador ficticio inexistente; la auditoría de recursos recibe una lista vacía y la subida autenticada carece de archivo y propietario y se rechaza antes del almacenamiento. No se leen filas de clientes ni se realiza un guardado o subida positivos como Socio.
- **129/129 originales publicados idénticos por bytes y SHA-256**, **6/6 rutas públicas y de acceso correctas** y **597/597 archivos protegidos locales intactos**.
- **Cero datos de negocio escritos, usuarios creados, archivos almacenados, pagos, llamadas bancarias o mensajes enviados**. El identificador ficticio continúa ausente y la sesión temporal de administrador fue cerrada. No quedan fixtures persistentes que limpiar.

BCP conserva su bloqueo en las fuentes desplegadas y su configuración local desactivada. No se consultó el valor remoto del proveedor ni se ejecutaron operaciones bancarias. Las fechas se validaron con SSR real local; la tarjeta en un navegador móvil autenticado y la aceptación manual permanecen aplazadas. `RESULTADO.json` conserva estos límites.

## Pendientes identificados para siguientes entregas

Esta revisión también localizó problemas independientes, reproducidos con componentes reales y datos ficticios en memoria, que no se modifican en esta corrección:

1. **Accesos privados (`ServiceAccessPanel`)**: doble POST antes del siguiente render y un ACK que borra una contraseña nueva escrita durante la espera. Requiere bloqueo inmediato, conservación de ediciones y tratamiento explícito de resultados inciertos.
2. **Exportación (`ExportPanel`)**: una respuesta antigua puede sustituir invitados, mesas y métricas de una consulta posterior antes de descargarlos.
3. **Servicios adicionales (`AdditionalServicesPanel`)**: al terminar una foto puede restaurar configuración anterior y perder cambios recientes de título, titular o música.
4. **Movimiento, estilo y decoración**: varios controles reconstruyen configuración desde el render anterior; en `MotionPanel` se reprodujo la pérdida de un ajuste al cambiar otro y la sustitución de campos ajenos.
5. **Salir de Socios**: la interfaz navega incluso si el endpoint devuelve HTTP 500; requiere comprobar el resultado y comunicar fallos sin afirmar que la sesión está cerrada.

Estos hallazgos no acreditan una vulneración de permisos ni una resolución de esos flujos. Deben revisarse contra el código vigente y disponer de regresiones propias antes de su entrega.
