# Búsqueda de referencias comerciales

## Alcance

Admin → Ventas permite consultar una referencia comercial completa `EK-XXXXXXXX`. La búsqueda exacta usa el índice único existente de `commercial_leads.reference`: encuentra contactos anteriores a los 180 días y fuera del límite del listado del embudo. Su lanzamiento original no requirió una migración nueva. La incorporación posterior del guardado seguro requiere la 019 para leer y validar la revisión; ver `docs/SEGUIMIENTO_COMERCIAL_SEGURO.md`.

El resumen es de **consulta** y muestra referencia, estado consultado, diseño público, paquete, fecha y nota. Se puede volver a consultar con el mismo botón. **Abrir seguimiento** lleva al editor habitual, sin montar otro editor del mismo contacto; **Preparar cotización** ofrece revisar los datos antes de reemplazar el borrador local. Estas ampliaciones se documentan en [seguimiento por referencia](VENTAS_SEGUIMIENTO_POR_REFERENCIA.md) y [cotización desde el contacto](VENTAS_COTIZACION_DESDE_CONTACTO.md). Una consulta no confirma mensajes enviados, reservas ni pagos, y no crea eventos de seguimiento.

La búsqueda no cambia el período ni los cálculos del embudo. En su despliegue inicial, las cifras estaban acotadas a 180 días / 1000 contactos y eventos limitados. La agregación completa del período y las páginas de 25 contactos se implementan en el bloque 020, cuyo estado figura en [VENTAS_PAGINACION_Y_METRICAS.md](VENTAS_PAGINACION_Y_METRICAS.md). Encontrar una referencia histórica no la incorpora a las métricas del período.

## Interacción y privacidad

- Solicitud explícita por botón o Enter; no consulta en cada tecla. Acepta espacios exteriores y minúsculas; exige los ocho caracteres hexadecimales completos.
- No acepta comodines, prefijos, referencias de pago `ENK-...`, parámetros duplicados ni mensajes completos como búsqueda.
- Distingue entrada inválida, ausencia comprobada, pérdida de conexión, sesión terminada, respuesta incompleta y error de base de datos.
- Al cambiar o limpiar la entrada cancela la solicitud anterior y descarta respuestas tardías, incluso si el transporte ignora la cancelación. Tiempo de espera: 20 segundos.
- El resultado no se persiste en almacenamiento del navegador ni se incorpora a la URL. Limpiar lo retira del estado del componente.
- El servidor autentica al administrador antes de validar o consultar. Respuestas `Cache-Control: no-store`, sin `session_hash`, credenciales ni información bancaria.
- Los controles nuevos usan texto de 16 px, foco visible y objetivos táctiles de aproximadamente 44 px. No cambia estilos globales ni invitaciones.
- Si falla una actualización del embudo, avisa que las cifras visibles corresponden a la carga anterior. Si el embudo no carga inicialmente, el buscador sigue disponible.

## Verificación

- 7 regresiones de contrato/render de cliente: normalización, rechazo de entradas, GET privado, whitelist, errores, datos de otra referencia, ficha sin controles de edición y fixture exclusivo de desarrollo.
- 6 regresiones PostgreSQL: permisos con sesiones reales de distintos roles, referencia antigua excluida del embudo pero localizable, normalización, parámetros inválidos, ausencia y errores sin exposición interna ni escrituras.
- Fixture `/dev/services/commercial-lookup`: datos ficticios en memoria, transporte simulado, sin red de aplicación real. La ruta responde 404 en producción.
- Revisión local en navegador a 390×844 y 1440×1000, errores y carreras entre búsquedas. Evidencia privada en `tmp/commercial-lookup/visual.json` y capturas móvil/escritorio.
- Aceptación HTTP de producción con `scripts/check-commercial-lookup-http.cjs`: un contacto ficticio antiguo con alcance persistido antes del INSERT, lecturas y borrado por ID + hash + placement + campaña. Admite `--resume-cleanup` con el mismo informe ante interrupción. No consulta fichas de clientes reales, no envía mensajes y no llama al banco.

## Pendientes independientes

La operación transaccional, el control de conflictos y la recuperación de guardados se documentan en `docs/SEGUIMIENTO_COMERCIAL_SEGURO.md`, con migración y aceptación propias. El buscador por sí solo no acredita esos comportamientos. La separación de métricas agregadas y páginas del listado se documenta en `docs/VENTAS_PAGINACION_Y_METRICAS.md` y requiere 020.

BCP sigue bloqueado. No se modificaron diseños, presets ni recursos originales.

## Resultado del despliegue, 19 de octubre de 2026

- Código `74ea81d`, fusionado y publicado en `main`.
- Vercel `dpl_J28Jz6Qpwgki3SVqPxLQfSsmJNXt`: Ready y alias `https://enkarta.vercel.app`. Despliegue inmutable: `https://enkarta-ell3evhul-juangabrielchoqueortiz7-engs-projects.vercel.app`.
- `npm run verify`: 354 pruebas correctas (194 constructor/contratos, 124 servicios PostgreSQL, 31 integridad, 5 distribución), lint, TypeScript y build correctos. Continúan las advertencias existentes de `<img>` en invitaciones originales; no se alteraron esos componentes.
- Navegador local: 9 comprobaciones funcionales correctas, sin desbordamiento a 390 y 1440 px, input de 16 px y controles táctiles de aproximadamente 44 px. No sustituye aceptación física en Android.
- Producción: 6 comprobaciones HTTP correctas con un único contacto ficticio de hace dos años. Limpieza verificada: sin contacto, historial ni eventos ficticios; cookie temporal retirada del cliente. Cero usuarios creados, mensajes enviados y operaciones bancarias.
- Conservación: 597 archivos protegidos idénticos por SHA-256; 129/129 originales de distribución publicados conservan tamaño y hash. Seis rutas públicas/de acceso también responden como se esperaba.
- CI remoto del código: `https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39278156832`. Al cerrar la verificación estaba **en cola, sin ejecutor asignado**; no se presenta como aprobado. Los resultados locales y del despliegue anteriores sí finalizaron.
- Evidencia privada: `tmp/commercial-lookup/verify.log`, `visual.json`, `production-http.json`, `protected-local.json`, `production-public.json`, `deployment-inspect.log` y `ci.json`. Sin credenciales ni cookies en informes.
