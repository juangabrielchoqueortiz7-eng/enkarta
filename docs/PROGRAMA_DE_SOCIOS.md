# Programa de socios · suscripción mensual al sistema

Terceros (revendedores, wedding planners, imprentas, agencias) pagan una
**mensualidad a Enkarta** por usar la plataforma y venden **nuestras
invitaciones a sus propios clientes, al precio que ellos decidan**.

Es un producto **distinto** de `PACKAGE_CATALOG` (Plus/Premium/Exclusive), que
es lo que Enkarta le cobra al novio por su invitación. Aquí se cobra el acceso al
sistema, no el evento. Las dos cosas conviven sin tocarse.

---

## 1. Activarlo (una sola vez)

### a) Base de datos

Ejecuta `migrations/013_partner_subscriptions.sql` en el SQL Editor de Supabase.
Crea `partners`, `partner_subscriptions`, `partner_payments` y añade
`invitations.partner_id`. Es reaplicable y no toca datos existentes.

Mientras no se aplique, la pestaña **Socios** del admin muestra un aviso claro y
el resto del sistema sigue igual (`partner_id` nulo = invitación de Enkarta).

### b) Entrar con Google

1. **Google Cloud Console** → *APIs y servicios* → *Credenciales* → crea un
   **ID de cliente de OAuth 2.0** de tipo *Aplicación web*.
2. En *URIs de redireccionamiento autorizados* pega el callback de Supabase:
   `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
3. **Supabase** → *Authentication* → *Providers* → **Google**: pega el Client ID
   y el Client Secret y actívalo.
4. **Supabase** → *Authentication* → *URL Configuration*:
   - *Site URL*: `https://enkarta.vercel.app` (o el dominio propio).
   - *Redirect URLs*: añade `https://enkarta.vercel.app/auth/callback` y
     `http://localhost:3000/auth/callback` para desarrollo.

### c) Datos de cobro

En Vercel (y en `.env.local`):

```
ENKARTA_PAYMENT_INSTRUCTIONS=Banco Unión · Cta. 10000123456 | Titular: Grupo JABA | Concepto: tu referencia ENK-...
NEXT_PUBLIC_ENKARTA_PAYMENT_QR=https://.../qr-enkarta.png
```

El ` | ` se convierte en salto de línea. Sin estas variables el panel invita a
coordinar por WhatsApp en lugar de fallar.

El bucket **privado** `comprobantes` se crea solo la primera vez que un socio
sube un archivo. Los comprobantes nunca tienen URL pública: se sirven con enlace
firmado de 30 minutos, solo al socio dueño y al equipo.

---

## 2. Precios y planes

Todo vive en **`src/lib/partner-plans.ts`**. Es el único archivo que hay que
tocar para cambiar precios, cupos o beneficios: la landing, el panel, el cobro y
los permisos se derivan de esa matriz.

| Plan | Mensual | Invitaciones publicadas a la vez | Nivel de servicios |
|---|---|---|---|
| Inicio | Bs 249 | 3 | `plus` |
| Estudio | Bs 449 | 10 | `premium` |
| Agencia | Bs 749 | sin límite | `exclusive` |

Pago adelantado: 3 meses −5 %, 6 meses −10 %, 12 meses −20 % (`BILLING_CYCLES`).

> Los precios son una propuesta inicial, no un dato heredado del negocio. Ajústalos
> antes de anunciar el programa.

El plan define el **nivel de servicios** de lo que el socio publica
(`packageForPlan`): con Inicio sus invitaciones salen con las funciones de Plus,
con Agencia con las de Exclusive. Toda la matriz de `packages.ts` se reutiliza sin
cambios.

---

## 3. Recorrido del socio

| Paso | Ruta | Qué pasa |
|---|---|---|
| Conocer el programa | `/socios` | Landing con planes y botón de Google. |
| Entrar | `/auth/callback` | Canjea el código, crea la ficha en `partners`. |
| Panel | `/socios/panel` | Estado, cartera, suscripción y datos. |
| Elegir diseño | `/socios/panel/nueva` | Los 12 diseños del catálogo. |
| Editar | `/socios/constructor/[id]` | El **mismo** constructor del equipo. |
| Publicar | botón *Publicar* | Requiere mensualidad al día y cupo libre. |

**Diseñar es gratis, publicar se cobra.** Un socio sin suscripción puede armar
invitaciones completas y enseñárselas a su cliente con `?preview=1`; el enlace
público solo se activa con la mensualidad al día.

Tope anti-abuso: `draftCap()` limita las invitaciones creadas (borradores
incluidos) a 3× el cupo del plan, mínimo 12.

---

## 4. Cobro (manual, con comprobante)

1. El socio elige plan y periodo → `POST /api/partner/payments` crea un pago
   `pending` y le da una **referencia `ENK-XXXXXX`**. Si cambia de plan antes de
   pagar, se reescribe el mismo pago y la referencia no cambia.
2. Paga por QR o transferencia escribiendo la referencia en el detalle.
3. Sube la captura → `POST /api/partner/payments/receipt`. La suscripción pasa a
   `pending` (anuncia la revisión, **no concede permisos**).
4. El equipo entra a **Admin → Socios → Pagos por revisar**, abre el comprobante
   y aprueba. Recién ahí se extiende `current_period_end`.

`extendPeriod()` suma los meses **al final del periodo vigente**, así renovar
antes de tiempo nunca regala ni recorta días.

Rechazar un pago deja el motivo visible para el socio y devuelve la suscripción
a `none` si nunca tuvo periodo.

### Vencimiento

- Vencida → no puede publicar ni crear nada nuevo que salga al aire.
- Lo ya publicado sigue en línea **5 días de gracia** (`PARTNER_GRACE_DAYS`),
  para que el evento de su cliente no se caiga de un día para el otro.
- Pasada la gracia, `/i/[slug]` de ese socio muestra la pantalla de *pausada*.
  **Las invitaciones de Enkarta (`partner_id` nulo) nunca se ven afectadas.**
- Suspender a un socio desde el admin corta el acceso y baja sus invitaciones de
  inmediato.

---

## 5. Permisos

Hay ahora **tres** accesos independientes (`src/lib/host-session.ts` y
`src/lib/partner-session.ts`):

| Acceso | Credencial | Alcance |
|---|---|---|
| Admin | cookie `enkarta-admin` | Todo el sistema. |
| Anfitrión / puerta / revisión | cookies firmadas | Un solo evento. |
| **Socio** | sesión de Supabase Auth (Google) | **Sus** invitaciones. |

`src/lib/builder-access.ts` es la puerta única del constructor. Las rutas de
`/api/admin/*` que el editor necesita (`invitations`, `upload`, `icons`,
`sections`, `templates`, `builder-state`, `publication-audit`,
`host-credentials`) aceptan admin **o** socio dueño, en vez de duplicar diez
endpoints. Las rutas de negocio de Enkarta (`commercial`, `sales-config`,
`health`, `analytics` global, `partners`) siguen siendo solo de admin.

Detalles que ya están cubiertos:

- El socio no ve ni edita invitaciones de Enkarta ni de otro socio.
- Secciones y plantillas guardadas viven en un `owner_key` propio por socio.
- Borrar un archivo del bucket exige que la invitación dueña sea suya.
- El socio hereda los límites de paquete de su plan para gestionar invitados,
  panel del anfitrión y QR (`canManageInvitation` respeta `allowsService`).
- Publicar se verifica en el servidor en los dos caminos: `PUT
  /api/admin/invitations` y `POST /api/admin/builder-state` con `action:
  'publish'`.

---

## 6. Lo que este programa **no** hace todavía

- **No cobra con tarjeta** ni renueva solo: cada mes el socio vuelve a registrar
  su pago y el equipo lo aprueba. Fue una decisión explícita (Bolivia).
- **No avisa por correo** cuando falta poco para vencer: el aviso vive en el
  panel (`renewalDue`, 7 días antes). Un recordatorio por WhatsApp o correo es
  el siguiente paso natural.
- **No tiene marca blanca**: el enlace público sigue siendo `enkarta.vercel.app`
  y las invitaciones conservan la identidad de Enkarta.
