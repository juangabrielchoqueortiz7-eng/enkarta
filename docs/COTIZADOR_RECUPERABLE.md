# Cotizador recuperable del equipo

Admin → Ventas → «Cotiza y responde sin improvisar» conserva los campos editables
en `sessionStorage`, dentro de la misma pestaña y sesión administrativa. Al recargar
o remontar el cotizador se recuperan cliente, evento, fecha, diseño, paquete y
adicionales. Los registros tienen versión y un límite de recuperación de 24 horas
desde la última edición. Otra cookie administrativa utiliza una clave diferente;
el identificador opaco no autentica y no expone el valor de la cookie.

No se guardan instrucciones bancarias, credenciales ni configuración del servidor.
No se crea una cotización en Supabase ni se envían mensajes. La configuración se
consulta con permiso administrativo y `no-store`; un fallo de conexión o respuesta
incompleta no se presenta como medio de pago sin configurar. Existe reintento manual.

Un borrador corrupto, incompatible o inaccesible no se restaura ni se sobrescribe
silenciosamente. Se puede continuar en memoria con un aviso explícito. El descarte
pide confirmación y conserva los datos si falla el borrado. Una edición solo anuncia
guardado si el navegador confirma la escritura. Cerrar la pestaña, cambiar de sesión
o perder el almacenamiento puede impedir recuperar el borrador; no es un respaldo
en el servidor ni un documento comercial enviado.

Los botones de copia esperan al portapapeles y bloquean clics simultáneos. Ante una
denegación permiten seleccionar el texto para copiarlo manualmente. Cambiar el texto
durante la operación no presenta la copia anterior como éxito de la nueva propuesta.
Sin instrucciones configuradas se ofrece «Copiar borrador», con el medio por confirmar.
Los precios, reserva de 200 Bs, saldos y plazos del catálogo no cambian.

Ocho regresiones nuevas cubren contenido mínimo del borrador, aislamiento, versión,
caducidad, corrupción, fallos de almacenamiento, respuesta de configuración, copia,
roles y alcance por cookie. La página `/dev/services/sales-quote` permite comprobar
con fixtures la recuperación y los errores; responde 404 en producción. La suite
suma 341 pruebas. El trabajo no modifica invitaciones, presets, recursos ni BCP.

La inspección visual local utiliza exclusivamente datos ficticios y copia simulada;
no sustituye la aceptación del portapapeles en un Android físico. Se retiraron los
dos borradores de QA al finalizar. El verificador HTTP de producción consulta solo
configuración, autentica por el flujo normal si se solicita y elimina su cookie local
al terminar; no crea cuentas, eventos, intentos comerciales, pagos ni registros SQL.

```powershell
node scripts/check-sales-toolkit-http.cjs --production --expect-project eodedockxqvynedwhpsp --read-admin-config --report tmp/sales-toolkit/production-http.json
```

La vinculación se comprueba al cargar el cotizador. La revocación de una cookie
desde otra pestaña no implica un borrado en vivo del texto que ya estaba en memoria.
BCP continúa bloqueado hasta disponer de documentación e integración oficiales.

El 19 de octubre de 2026 se publicó `6c011cd` en el despliegue
`dpl_FC41wKFY4Q9o81taU8EdjBgTDZwH`, confirmado `Ready` con el alias de producción.
Pasaron las 341 pruebas locales, lint, TypeScript, build y
[CI del cambio](https://github.com/juangabrielchoqueortiz7-eng/enkarta/actions/runs/39269184967).
La inspección local de 390 y 1440 px no mostró desbordamiento horizontal; se comprobó
recuperación, aislamiento de sesiones, copia simulada, datos corruptos y fallos de
conexión, escritura y descarte. La fecha de la fixture completa se recuperó intacta;
la entrada con el selector de fecha nativo no se certificó mediante automatización.
Se limpiaron las dos claves de QA y se verificaron los 129 originales publicados por
tamaño y SHA-256. Las tres comprobaciones HTTP protegieron la configuración, negaron
el acceso a la página de desarrollo y confirmaron estabilidad del identificador de
sesión por el acceso administrativo normal. Se retiró la cookie temporal de esa
verificación, sin crear ni modificar datos SQL.
