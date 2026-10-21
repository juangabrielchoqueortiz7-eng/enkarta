# Exportación del constructor y respuestas obsoletas

## Problema y corrección

`ExportPanel` consultaba invitados y analítica sin comprobar que la respuesta perteneciera todavía a la invitación y metadatos actuales. Una petición anterior podía terminar después de una nueva y sustituir el padrón, las mesas y las métricas usados en las descargas. Un error tampoco retiraba necesariamente las métricas de la consulta anterior.

La corrección identifica cada consulta y distingue sus resultados de los de una consulta posterior, incluso si se vuelve a la invitación original. Retira los datos anteriores mientras carga el padrón actual y descarta respuestas o errores obsoletos. La cancelación de red es una ayuda; las comprobaciones de vigencia después de las esperas son las que impiden adoptar resultados antiguos.

Las descargas de invitados requieren una lista cargada por la consulta vigente. Un error de analítica deja sus métricas no disponibles y permite exportar invitados si su propia carga fue correcta. Un error del padrón se comunica como error, con reintento explícito, y no se presenta como una lista vacía válida. Los dos GET no constituyen una transacción ni una instantánea atómica de la base de datos.

Las operaciones asíncronas comprueban su contexto antes de emitir archivos, presentar errores o modificar el progreso. El bloqueo inmediato de una exportación asíncrona activa evita que dos procesos sobrescriban el estado compartido del panel. Las descargas síncronas de la consulta vigente siguen disponibles. Los eventos conservados de una vista anterior no deben descargar información de aquella vista.

## Conservación y límites

Se mantienen los formatos y generadores de CSV, PDF, ZIP, QR e imágenes, así como los diseños y recursos originales de las invitaciones. No se modifican contratos de API, permisos del servidor, SQL, dependencias, estilos globales ni configuración de pagos. BCP permanece bloqueado.

Skill aplicada: `vercel-react-best-practices`, con identidad de consulta y guardas de ciclo local sin cachés globales de datos privados ni APIs exclusivas de React 19.

No se añade una suscripción en tiempo real al padrón ni una garantía de actualidad absoluta de la base de datos. Una lista cargada pertenece a su consulta; esta entrega no añade una transacción entre invitados y analítica ni un nuevo plazo máximo para solicitudes pendientes.

## Pruebas y producción

Las regresiones ejecutan el componente y los generadores de PDF/ZIP reales con transporte controlado, invitados ficticios y archivos en memoria. Los gráficos, canvas y QR necesarios para los escenarios son dobles explícitos de prueba; no acreditan fidelidad visual ni aceptación en un dispositivo físico. Se comprueban carreras de respuestas, identidad de consulta, descarga de contenido vigente y descarte de operaciones antiguas.

`scripts/test-builder-export-ui.cjs`: **30/30 pruebas correctas** con la fuente final. La ejecución contra el componente del commit `5822b7bcb774bb6597104981c766270241a03011` produce **5 aciertos y 25 fallos**, reproduciendo los defectos anteriores. La ejecución habitual de CI no invoca Git. Los controles de contenido de CSV, PDF y ZIP inspeccionan archivos generados en memoria; las comprobaciones de PNG usan canvas y QR ficticios.

Los escenarios incluyen dos respuestas en orden inverso, JSON demorado, cambios de metadatos, ida y vuelta entre invitaciones, reintento en la misma invitación, desmontaje, errores de red y respuestas inválidas. También verifican que cambiar solo el nombre del evento invalide un ZIP antiguo y permita una exportación nueva, sin consultar otra vez el padrón ni dejar bloqueado el panel.

La comprobación de producción contrasta las fuentes del despliegue Ready, permisos de las rutas de exportación y el rechazo de un UUID ficticio cuya ausencia se verifica antes y después. **No se llama a analítica con una sesión válida**, porque su GET ejecuta la política de retención de eventos. Las llamadas sin autorización deben detenerse con 403 antes de acceder a los datos. No se solicita una descarga real de invitados de clientes.

Evidencia privada: `tmp/builder-export/`. La aceptación manual queda aplazada; los resultados finales se registran al completar la validación y el despliegue.

## Validación local final

- **1.572 pruebas correctas en 52 ejecuciones de suites**, lint, TypeScript y build con **65 páginas generadas**, salida 0 y sin reintento separado del build. No se introducen advertencias en `ExportPanel`; continúan las advertencias previas de otros componentes.
- **46/46 pruebas sin red** del verificador privado de producción, con revisión independiente de sus solicitudes, respuesta NOT_FOUND y cierre de sesión.
- Revisión independiente de fuente y regresiones sin bloqueantes: **12 helpers originales y 80 atributos de clases conservados**; los estados añadidos solo comunican carga, error y reintento. Los inicializadores de HTML, CSV y páginas PDF y los generadores compartidos permanecen iguales.
- APIs de invitados y analítica, generador de PDF/ZIP, recursos y renderizadores públicos sin modificaciones. **597/597 archivos protegidos idénticos por SHA-256** y distribución completa de **129 originales**.
