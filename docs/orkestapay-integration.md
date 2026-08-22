# MondoTicket → Integración de pasarela de pago real (OrkestaPay)

## Contexto

Hoy el checkout de MondoTicket **simula** el cobro: `UserCheckout.tsx` espera 1.5s (`setTimeout`) y llama directo a `create_order_and_tickets`, que marca la orden `'paid'` incondicionalmente sin que ningún dinero real se haya movido — el `stripe_payment_intent_id` guardado es un string inventado por el cliente (`sim_${uid}_${Date.now()}`). El usuario pidió integrar **OrkestaPay** (pasarela real para LatAm, ya tiene cuenta) como medio de pago real para la compra de boletos, y dejar todo listo para probarlo en sandbox.

Investigué la documentación completa de OrkestaPay (auth, checkout, orders, payments, webhooks, refunds, sandbox) y el código actual del checkout/RPC de compra. La pieza central del cambio es **dejar de emitir el boleto (QR) y marcar la orden como pagada en el mismo paso que crea la orden** — hoy eso pasa atómicamente en una sola llamada del navegador, sin ninguna verificación real de pago. Con un gateway real, el boleto solo debe existir después de que el dinero se mueva de verdad, confirmado por un webhook firmado, nunca por el navegador.

**Alcance:** solo la compra **en línea con dinero real** (`UserCheckout.tsx`) cambia. Taquilla (efectivo/terminal físico) y boletos de cortesía ($0) seguiratn usando el RPC actual sin ningún cambio — no hay pasarela que esperar en esos dos casos.

## Cómo funciona OrkestaPay (resumen de su documentación)

- **Auth**: `POST /v1/oauth/tokens` (sandbox `api.sand.orkestapay.com`, prod `api.orkestapay.com`) con `{client_id, client_secret, grant_type:"client_credentials"}` → `{access_token, expires_in:3600}`. Se pide un token nuevo en cada invocación (igual que ya se hace con Google Wallet en este repo) — no hace falta cachear.
- **Flujo recomendado — Checkout hospedado**: `POST /v1/checkouts` con las líneas de producto, monto total, datos del comprador y `completed_redirect_url`/`canceled_redirect_url` → responde `{checkout_id, checkout_redirect_url, order:{order_id,...}}`. Se redirige el navegador completo a `checkout_redirect_url`; OrkestaPay maneja tarjeta/SPEI/efectivo/3DS en su propia página — **cero alcance PCI para nosotros**, no tocamos datos de tarjeta.
- **La verdad de si se pagó es el webhook, nunca el redirect de vuelta.** Firmado con **Svix** (headers `svix-id`/`svix-timestamp`/`svix-signature`, se verifica con el paquete oficial `svix` y el body **crudo sin parsear**). Eventos relevantes: `payment.purchase`/`payment.capture` (pago exitoso), `payment.cancel` (cancelado/fallido). Efectivo y SPEI son asíncronos (`PAYMENT_ACTION_REQUIRED` hasta que el banco/tienda confirma, puede tardar horas/días) — el mismo mecanismo de webhook cubre ambos casos sin código adicional.
- **Reembolsos**: `POST /v1/payments/{payment_id}/refund` con `Idempotency-Key` y `{amount, description}` — **soporta reembolso parcial**, encaja perfecto con el `refund_tickets` ya existente (reembolsa boletos sueltos de una orden).
- **Sandbox**: tarjetas de prueba `4242424242424242` (aprobada), `4000000000002503` (reto 3DS). El portal tiene una pestaña "Testing" en Webhooks para mandar un evento de ejemplo a mano — útil para probar el webhook antes/sin depender de completar un pago real.

## Diseño

### Base de datos — separar "reservar" de "confirmar pago"

Nueva migración `0032_reserve_order_and_release.sql`:

- **`event_seats`**: nueva columna `order_id uuid references orders(id) on delete set null` y nuevo status `'reserved'` (además de `available|held|sold`). Justificación: el hold de asientos actual (`hold_event_seats`, `0010_seat_hold_rpc.sql`) expira solo en 5 minutos con reclamo perezoso ("expiró, cualquiera lo puede tomar") — perfecto para "estás viendo el mapa de asientos", pero insuficiente para "estás esperando que SPEI/efectivo se confirme", que puede tardar horas. Se actualiza el constraint `chk_hold_fields` (confirmado que existe con ese nombre exacto) para permitir `status='reserved' + order_id not null + held_by/hold_expires_at null`.
- **`orders`**: nuevas columnas `payment_provider text default 'none' check in ('orkestapay','none')`, `orkesta_checkout_id text`, `orkesta_order_id text unique` (clave para que el webhook encuentre la orden), `orkesta_payment_id text`, `expires_at timestamptz`.
- **`reserve_order(p_event_id, p_organization_id, p_user_id, p_customer_name, p_customer_email, p_customer_phone, p_items, p_seat_ids, p_idempotency_key)`** — es el `create_order_and_tickets` actual (mismas validaciones: auth, presale/cancelado, `AUTH_MISMATCH`, límite de cortesías, decremento atómico de `sold`, validación de holds) **pero sin insertar `tickets` y sin marcar `status='paid'`** — la orden queda `'pending'`, `expires_at = now() + 72h`, asientos pasan a `status='reserved'` ligados a `order_id`. `grant ... to authenticated`.
- **`confirm_order_paid(p_order_id, p_orkesta_payment_id, p_amount)`** — nueva, **solo `service_role`** (nunca `authenticated` — solo la puede llamar el webhook server-side, jamás el navegador). Verifica que la orden siga `'pending'` (si ya está `'paid'`, no hace nada — idempotente ante reintentos de Svix), verifica que `p_amount` coincida con `orders.total` (protección contra un webhook manipulado), **aquí es donde se insertan las filas `tickets` por primera vez** (con su `qr_code` real) y se marcan los asientos reservados como `'sold'`, y se marca `orders.status='paid'`.
- **`do_release_order` / `release_order(p_order_id)`** — libera una reserva (regresa `sold`, libera asientos, `status='failed'`). `release_order` es la versión con chequeo de autorización (dueño de la orden, miembro de la organización, o superadmin) para uso desde el navegador cuando el comprador cancela en la página de OrkestaPay. `do_release_order` (sin chequeo propio) también se otorga a `service_role` para que el webhook lo use directo en `payment.cancel`.
- **`release_expired_orders()`** — barrido de reservas abandonadas (nadie canceló ni pagó). `service_role` únicamente; **no se conecta a ningún cron en este cambio** — es una función lista para un futuro Vercel Cron, documentada como pendiente explícito. Sin esto, el peor caso es que un carrito abandonado sin pago ni cancelación explícita mantenga inventario "reservado" hasta por 72h — nunca causa doble-venta, solo indisponibilidad pesimista.
- **`payment_webhook_events`** (migración `0033`) — tabla de deduplicación por `svix_id` (el header `svix-id`), para blindar contra reentregas del webhook independientemente del chequeo de idempotencia dentro de `confirm_order_paid`.
- **Verificado, sin cambios necesarios**: `get_broker_transactions` (`0031_broker_role.sql`) filtra solo por `orders.status='paid'` + `tickets.status<>'cancelled'` — no le importa qué RPC produjo ese estado, sigue funcionando igual una vez que `confirm_order_paid` es quien marca `'paid'`.
- **No se toca**: `create_order_and_tickets` (sigue sirviendo taquilla y $0 gratis, sin ningún cambio), `refund_tickets` (se reutiliza tal cual desde el nuevo endpoint de reembolso, ver abajo).

### Backend — 3 endpoints nuevos bajo `api/payments/orkesta/`

Siguiendo exactamente el patrón ya usado en `api/organization/invite-staff.ts` y `api/wallet/google/[ticketId].ts` (chequeo de método → variables de entorno → header `Authorization: Bearer` → cliente Supabase → autorización manual → lógica).

- **`create-checkout.ts`** (POST, autenticado): recibe `{orderId}`, lee la orden y sus `order_items` **del lado servidor** (nunca confía en un monto que mande el navegador), arma el request de Checkout a OrkestaPay (línea de "Cargo por servicio" calculada como `total - subtotal` para que la suma cuadre exacto centavo a centavo), lo crea, guarda `orkesta_checkout_id`/`orkesta_order_id` en la orden (con un `UPDATE ... WHERE status='pending'` para cerrar una posible carrera con el webhook), regresa `{checkoutRedirectUrl}`.
- **`webhook.ts`** (POST, sin auth de sesión — la confianza viene de la firma Svix): lee el **body crudo** con `req.on('data'/'end')` directamente (nunca `req.body`, que ya viene re-serializado y rompería la firma), verifica con `new Webhook(secret).verify(rawBody, headers)`, dedup por `svix-id` en `payment_webhook_events`, busca la orden por `orkesta_order_id`, y despacha: `payment.purchase`/`payment.capture` → `confirm_order_paid`; `payment.cancel` → `do_release_order`. Si no encuentra la orden (carrera con `create-checkout` aún escribiendo), responde `404` para que Svix reintente solo — nunca `200` en ese caso.
- **`refund.ts`** (POST, autenticado): recibe `{ticketIds}`, primero llama `refund_tickets` (RPC existente, sin cambios, con el JWT del que llama para que sus propios chequeos de organización/superadmin sigan aplicando) — **esto pasa primero, antes de tocar OrkestaPay**, seguiendo el principio ya documentado en el código de esta app ("si el gateway falla después de cancelar en la base, es un ticket de soporte; si fuera al revés, sería fraude"). Después, agrupa los boletos por orden y, para las que tengan `orkesta_payment_id`, llama `POST /v1/payments/{payment_id}/refund` con el monto proporcional y una `Idempotency-Key` determinística (hash de los ticket ids) para que reintentar la misma llamada sea seguro.

Nueva dependencia npm: **`svix`** (paquete oficial, sin la cual habría que reinventar la verificación de firma — no aplica el mismo criterio de "sin dependencias" usado en el endpoint de Google Wallet, ahí no había alternativa razonable a mano).

Nuevas variables de entorno (mismo patrón ya usado para Google Wallet — `.env.local` + `vercel env add ... preview/production --sensitive`):
`ORKESTA_CLIENT_ID`, `ORKESTA_CLIENT_SECRET`, `ORKESTA_WEBHOOK_SECRET`, `ORKESTA_API_BASE_URL` (sandbox vs prod, una variable explícita por ambiente de Vercel — no un branching en código), `PUBLIC_SITE_URL`.

### Frontend

- **`dataService.ts`**: nuevos métodos `reserveOrder(...)` (llama al RPC `reserve_order`), `createOrkestaCheckout(orderId)` (llama al endpoint, mismo patrón `fetch` que `getGoogleWalletSaveUrl`), `releaseOrder(orderId)` (llama al RPC `release_order`). `refundTickets(ticketIds)` cambia de llamar el RPC directo a llamar `/api/payments/orkesta/refund` — mismo nombre/firma, así que `EventDetail.tsx` no cambia.
- **`UserCheckout.tsx`** — `handlePurchase`: la rama `isFree` sigue exactamente igual (RPC actual, instantáneo). La rama de dinero real cambia de "simular 1.5s y marcar pagado" a `reserveOrder(...)` → `createOrkestaCheckout(orderId)` → `window.location.href = checkoutRedirectUrl` (navegación completa, sale de la SPA). Los 3 botones de método de pago (tarjeta/SPEI/efectivo) pasan de ser una selección que hoy no hace nada real a una vista informativa de qué ofrece la página de OrkestaPay (ya no gatean el botón de comprar). Al aterrizar de vuelta con `?orkesta=canceled&orderId=...`, se llama `releaseOrder` una vez y se muestra un aviso de "pago cancelado, puedes intentarlo de nuevo".
- **`UserTicket.tsx`** — hoy asume que los boletos ya existen. Se agrega sondeo (poll cada 2s, hasta ~60s) mientras `orders.status==='pending'`, mostrando "Confirmando tu pago..."; si se agota el tiempo (normal en efectivo/SPEI), muestra un mensaje tranquilo ("puede tardar unos minutos, revisa tu correo o vuelve más tarde") con botón "Verificar de nuevo" en vez de un error. Si `status==='failed'`, mensaje distinto invitando a reintentar la compra. La política de RLS de `orders` ya permite al dueño leer su propia orden sin importar el status, así que el sondeo funciona con el cliente normal, sin cambios de permisos.

## Pendiente explícito (fuera de este cambio, documentado a propósito)

- **Reaper programado**: `release_expired_orders()` queda lista pero sin cron que la dispare — el peor caso sin esto es inventario reservado hasta 72h en un carrito abandonado, nunca doble-venta. Se puede agregar después con Vercel Cron si hace falta antes de un lanzamiento de alta demanda.
- **Renombrar `stripe_payment_intent_id`** a algo neutral (ya no aplica a Stripe) — cosmético, se deja para después para no ensanchar este cambio.
- Un bug preexistente y no relacionado en `refund_tickets` (el conteo de `refunded_amount` nunca alcanza `total` porque no incluye el cargo por servicio) — no se toca aquí, es independiente de esta integración.

## Qué necesito de ti para poder probarlo

1. En el portal de OrkestaPay, en modo **Sandbox**: copiar `client_id`/`client_secret` (Developers/API keys).
2. En el mismo portal, **Developers → Webhooks → Add endpoint**, URL `https://ticketblessing.vercel.app/api/payments/orkesta/webhook`, suscribir a `payment.purchase`, `payment.capture`, `payment.cancel` — copiar el `whsec_...` generado.

Con esos dos datos yo configuro las variables de entorno (igual que hicimos con Google Wallet) y hago todas las pruebas end-to-end (compra con tarjeta de prueba, cancelación, reembolso) antes de dejarlo listo para que tú también pruebes.

## Verificación

- Migraciones aplicadas y probadas en vivo contra Supabase real con datos `__test__`, limpiados después (mismo método usado toda la sesión).
- Compra completa con tarjeta de prueba `4242424242424242`: orden pasa `pending→paid`, boleto real con QR aparece, Google Wallet y check-in siguen funcionando sobre ese boleto.
- Reto 3DS con `4000000000002503`.
- Cancelar en la página de OrkestaPay → inventario se libera de inmediato.
- Webhook con secreto incorrecto → `UserTicket.tsx` cae en el mensaje de "seguimos confirmando" en vez de un error feo; "Verificar de nuevo" funciona tras corregir el secreto.
- Reembolso de un boleto pagado por OrkestaPay → se ve el `refund` reflejado del lado de OrkestaPay (panel sandbox) y el boleto queda cancelado.
- Una venta de taquilla y un boleto de cortesía $0 corridos de principio a fin sin tocar ningún endpoint de `/api/payments/orkesta/*` (confirmando que esos caminos quedaron intactos).

