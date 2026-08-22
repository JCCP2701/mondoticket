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

---

# TicketBleissing → Roadmap de blindaje para producción (seguridad, pagos, wallets, testing) [ARCHIVADO — mayoría ya implementado]

## Contexto

El usuario pidió evaluar la plataforma contra 12 preocupaciones reales de una ticketera en producción (cola virtual/doble reserva, QR clonables, anti-bot/reventa de boletos, validación en puerta, modo offline, pagos robustos, panel simple, mapa de asientos, reventa/lavado de dinero, chat por evento + RSS, lealtad, cortesías/VIP), más 3 pedidos explícitos: **pruebas unitarias que garanticen que la app está lista**, **Apple Wallet + Google Wallet reales**, y **pasarela de pago real**.

Se hizo una auditoría exhaustiva (3 agentes de exploración) del estado exacto del código antes de proponer nada. Hallazgos base, todos confirmados leyendo el código real (no inferidos):

- **Testing**: cero infraestructura. Sin test runner, sin CI, sin forma de probar las ~12 funciones RPC (donde vive toda la lógica de dinero/inventario) aisladas del proyecto real — todo se ha verificado manualmente vía `curl` durante esta sesión.
- **QR**: `tickets.qr_code` es criptográficamente fuerte (`gen_random_bytes(16)`) pero **estático para siempre** — sin rotación, sin firma, sin expiración. Una captura de pantalla es una credencial válida permanente.
- **Validación en puerta: cero implementación.** `tickets.status='used'` y `checked_in_at` existen en el esquema pero **ningún código los escribe jamás**. No hay política RLS que permita siquiera un update a `tickets` desde el cliente. El rol taquilla es 100% punto de venta, sin escaneo. No hay ninguna librería de lectura de QR instalada.
- **Pagos: 100% simulado.** `StripeContext.tsx` existe pero es código muerto (nadie lo llama); el checkout real solo hace un `setTimeout` y genera un ID falso (`sim_...`). El RPC `create_order_and_tickets` marca la orden como `'paid'` incondicionalmente — **el navegador es la única autoridad sobre si se pagó o no**. No existe ningún webhook ni endpoint de pago real.
- **Apple Wallet**: el botón es literalmente un `alert()`. **"Google Wallet" no existe** — el botón que parece serlo en realidad abre Google Calendar (con un bug: genera un evento de duración cero). Ambos tienen columnas en la base (`apple_wallet_pass_url`, `google_wallet_link`) que nunca se usan, y variables de entorno ya nombradas en `.env.example` pero vacías.
- **Anti-bot/reventa**: no existe ningún límite de compra por cuenta, CAPTCHA, ni límite de tasa. La reventa P2P no existe (bien — hay que decidir la política antes de construir algo, no después).

Durante el diseño del plan se confirmaron además **3 bugs reales adicionales**, verificados leyendo el código (no solo sugeridos por los agentes):

1. **Contraseña de invitado compartida y hardcodeada** (`UserCheckout.tsx:85`, literal `"Blessing2026!"`) — cualquiera que sepa el correo de un comprador puede iniciar sesión como él y clonar su wallet/QR.
2. **Doble conteo en reembolsos** (`refund_tickets`, `0019_org_membership_rpcs.sql`): el `join order_items ... on oi.ticket_type_id = t.ticket_type_id` puede duplicar filas si una orden llega a tener dos renglones de `order_items` para el mismo tipo de boleto (nada en el RPC lo previene hoy) — cada duplicado descuenta `sold` y suma `refunded_amount` dos veces por un solo boleto.
3. **Hueco de permisos en `event_ticket_types.sold`**: el comentario en `0002_rls.sql:99` dice que ningún update permite tocar `sold` desde el cliente, pero es solo un comentario — no hay ningún `revoke` de esa columna. Un manager de organización puede en teoría hacer `UPDATE event_ticket_types SET sold = 0` directo, sin pasar por el RPC atómico, y ocultar un evento sobrevendido o falsear reportes.

**Decisiones ya resueltas con el usuario:**
- Las pruebas de integración corren **contra el proyecto real de Supabase** (no Docker/CLI local) usando datos sandbox con prefijo `__test__` creados y borrados por la propia suite — el mismo patrón manual usado toda la sesión, formalizado.
- Este documento es **solo el plan completo** — no se empieza a implementar nada todavía; se decide después de revisarlo qué fase atacar primero.

## Orden de prioridad (por daño real si se deja sin arreglar)

| # | Fase | Por qué este orden |
|---|---|---|
| 0 | Arreglos rápidos de bajo riesgo | Baratos, alto impacto, sin dependencias — hacerlos primero cierra huecos de seguridad reales ya identificados |
| T | Arnés de pruebas | Antes de tocar el RPC de pagos (el más peligroso del sistema, ya con 2 bugs históricos) hay que tener red de seguridad |
| 1 | Escaneo/validación en puerta | **Bloqueador #1**: hoy un mismo boleto se puede reusar sin límite — esto es lo que más destruye credibilidad si se prueba en vivo |
| 2 | Modo offline en puerta | Sin red en el venue, el escaneo se detiene por completo — catástrofe operativa, no solo de fraude |
| 3 | QR dinámico/anti-clonación | Depende de que exista el escaneo (fase 1) para tener sentido, y debe diseñarse pensando en offline (fase 2) |
| 4 | Anti-bot / anti-reventa | Incluye el bug P0 de la contraseña de invitado |
| 5 | Pagos reales (Stripe) | Bloqueador de negocio, pero requiere el arnés de pruebas (fase T) primero por seguridad |
| 6 | Apple Wallet + Google Wallet | Requiere que existan pagos reales primero (no tiene sentido dar wallet de algo no cobrado) |
| 7 | Mapa de asientos + política de reventa | Sin exposición de seguridad/legal — mejora de producto, no bloqueador |
| — | Chat por evento + RSS, lealtad/puntos | Fuera de este roadmap — son features nuevas, no blindaje; se planean por separado si se quieren |

---

## Fase 0 — Arreglos inmediatos (antes que cualquier otra cosa)

- **0.1 Matar la contraseña de invitado compartida.** Reemplazar `UserCheckout.tsx:85` (`register(name, email, "Blessing2026!")`) por `supabase.auth.signInWithOtp()` (código de 6 dígitos por correo). Ya existe `input-otp` como dependencia. Esto también mata gratis el registro masivo de correos descartables (ver fase 4).
- **0.2 Idempotencia en la creación de orden.** `orders.idempotency_key uuid unique` + nuevo parámetro `p_idempotency_key` en `create_order_and_tickets` (nuevo overload, se elimina el anterior como ya se hizo en `0021`). El cliente genera el uuid una sola vez por intento de compra, no por click — sin esto, un doble-click o un retry de red duplica la orden y descuenta inventario dos veces.
- **0.3 Fecha de preventa y evento cancelado, reforzados en el servidor.** `events.presale_date` existe y hoy nadie lo valida — cualquiera con el `event_id` puede comprar antes de la apertura. Agregar el chequeo dentro del RPC (`NOT_ON_SALE`, `EVENT_CANCELLED`).
- **0.4 Cerrar el hueco de `sold`.** `revoke update (sold) on event_ticket_types from authenticated;` (o un trigger guardián) para que el bug #3 de arriba deje de ser posible.
- **0.5 Regla de estilo para todo RPC nuevo o existente**: nunca comparar una columna nullable directo dentro de un `if` de autorización — envolver siempre en `exists(...)` y el `if` completo en `coalesce(..., false)`. Es la causa raíz de los 2 bugs históricos de NULL ya conocidos.

## Fase T — Arnés de pruebas (antes de tocar el RPC de pagos)

- **Runner: Vitest** (reutiliza `vite.config.ts` tal cual, soporta `import.meta.env`, sin necesidad de Babel — Jest no calza bien con este stack).
- **Contra el proyecto real de Supabase** (decisión ya tomada): helpers de setup/teardown que crean una organización/eventos/usuarios con prefijo `__test__` vía la service-role key antes de cada suite y los borran al final, replicando exactamente el patrón manual de `curl` usado toda la sesión — solo que ahora repetible y automatizado.
- **Tres capas:**
  1. **Unitarias puras** (sin red): extraer funciones de mapeo de `dataService.ts` (`mapOrganization`, `mapEvent`, cálculo de `getFinanceSummaryByOrganization`, `getMonthlyRevenueSeries`) a funciones testeables — ojo con que PostgREST devuelve `numeric` como *string*, no como número.
  2. **Integración/RPC** (la capa que más importa — ahí vive el dinero e inventario real): pruebas de los ~12 RPCs vía `@supabase/supabase-js` autenticado como distintos roles.
  3. **Componentes** (jsdom, ~5 archivos máximo): el flujo de dos pasos de `UserCheckout.tsx`, el cleanup de `SeatMapPicker.tsx` al desmontar, `AuthContext`/`ProtectedRoute` con `mfaExempt`.
- **Pruebas de regresión de máxima prioridad (escribir primero):**
  - Los 2 bugs históricos ya conocidos (NULL en `create_order_and_tickets` y en `refund_tickets`) — un caller sin membresía en ninguna organización debe ser rechazado, no aprobado por accidente.
  - Los 2 bugs nuevos de esta fase (doble conteo en `refund_tickets`, hueco de `sold`).
  - **Concurrencia real**: disparar ~20-50 llamadas paralelas al RPC de compra contra un inventario escaso y afirmar que exactamente el número de asientos/boletos correcto se vendió, nunca más — esto es lo que responde directamente a la preocupación del usuario sobre "reservar el mismo lugar dos veces". Repetir el experimento con `hold_event_seats` (mismo asiento desde dos sesiones a la vez).
- **CI**: GitHub Actions corriendo `build` + pruebas en cada PR (bloqueante), con `typecheck`/`coverage` como advertencia no-bloqueante al inicio (el proyecto no tiene `tsconfig.json` todavía).

## Fase 1 — Escaneo y validación en puerta (bloqueador de producción)

- **Nueva tabla `ticket_scans`** (log de auditoría de cada intento de escaneo, no solo el ganador) + helper `is_event_gate_staff(uid, event_id)` (mismo patrón que `is_org_member`).
- **RPC `check_in_ticket(p_qr_code, p_event_id, p_device_id)`**: transición atómica `valid → used` vía `UPDATE ... WHERE status='valid'` (el mismo truco que ya hace el inventario atómico) — dos escaneos simultáneos del mismo código, exactamente uno gana. Devuelve una fila de resultado en vez de lanzar excepción para los estados normales (`already_used`, `cancelled`, `wrong_event`) para que la UI pueda mostrar quién y cuándo ya lo usó.
- **RPC `undo_check_in`** — indispensable desde el día uno; sin poder revertir un escaneo por error humano, el staff empieza a dejar pasar gente sin escanear.
- **Nuevo rol `validador`**: no reusar `taquilla` (que sí puede emitir cortesías gratis) para el personal de puerta, que es el grupo más numeroso y menos vetado. Requiere: `profiles.role` check, `AuthContext.tsx`, ampliar `ProtectedRoute` para aceptar más de un rol, ruta `/validador`, y que `invite-staff.ts` acepte el nuevo rol.
- **Librería de escaneo: `jsqr`** (ligera, sin WASM, funciona offline) con `BarcodeDetector` nativo como mejora cuando el navegador lo soporte. Nueva UI en `src/app/components/validador/` con cámara, feedback visual/sonoro/háptico, y entrada manual de respaldo.
- Publicar `ticket_scans` (no `tickets`) a Realtime para el contador en vivo de "N/M ingresados" sin exponer `qr_code`.
- Corregir la copia de marketing que ya afirma "código único e infalsificable" / "pierde validez al escanear" — hoy es falso, debe volverse cierto al cerrar esta fase.

## Fase 2 — Modo offline en el punto de escaneo

- **Manifiesto firmado**: `get_event_gate_manifest(event_id)` que descarga al dispositivo, antes de abrir puertas, solo el **hash** de cada `qr_code` (nunca el valor real) — un dispositivo perdido o robado no debe filtrar credenciales usables.
- **Validación local-first** (IndexedDB) con feedback en <50ms sin red, cola local de escaneos pendientes.
- **RPC `sync_ticket_scans`**: reconcilia por lotes cuando vuelve la conexión, ordenado por hora de escaneo (gana el más antiguo), idempotente, con el reloj del dispositivo acotado server-side para que no se pueda "retrasar" un escaneo y ganar un conflicto.
- **Reporte de reconciliación** para el organizador: boletos con doble ingreso detectados, ambos dispositivos, ambas horas — la promesa honesta es "sin doble entrada en línea; doble entrada detectada y reportada si estuvo offline", nunca "imposible".
- PWA con service worker **acotado solo a las rutas `/validador`** (no cachear el resto de la app).

## Fase 3 — QR dinámico anti-clonación

- **Esquema híbrido**: `qr_code` sigue existiendo como identidad interna (nunca se muestra), pero la pantalla del boleto muestra un token rotativo firmado (HMAC, estilo TOTP, ventana de 30s) derivado de una llave por evento (`event_signing_keys`, sin política de lectura para nadie — solo accesible dentro de funciones `SECURITY DEFINER`).
- El navegador del comprador calcula el token localmente (WebCrypto) a partir de una semilla que se pide una sola vez y se guarda solo en memoria — así funciona incluso sin red en el momento de mostrar el QR.
- Tolerancia de reloj (~±60s) y fallback a QR estático solo para boletos marcados explícitamente (venta en taquilla/impresos), siempre auditado en `ticket_scans.used_static`.
- Reduce ~5 puntos en el nivel de corrección del QR (de `H` a `M`) — un código que rota cada 30s no necesita tanta redundancia, y escanea mejor en pantallas dañadas.

## Fase 4 — Anti-bot / anti-reventa automatizada

- **Límites de compra server-side**, dentro del mismo RPC (nunca solo en la UI): `max_per_order` y `max_per_customer` por tipo de boleto, contando por `user_id` **y** por correo normalizado (para que crear 5 cuentas con el mismo correo+tag no sirva de nada). Debe aplicarse en ambos caminos del RPC (cantidad y asientos) — es fácil olvidar uno de los dos, como ya pasó con el tope de cortesías.
- **CAPTCHA: Cloudflare Turnstile en el login/registro de Supabase**, no en el botón de compra — Supabase ya soporta esto nativamente (`captchaToken` en `signUp`/`signInWithOtp`), cero código de servidor, y como la fase 0.1 ya exige cuenta verificada para comprar, proteger el registro protege el checkout indirectamente.
- **Límite de tasa**: usar los límites nativos de auth de Supabase + un tope de "N órdenes por minuto por cuenta" dentro del propio RPC. Nota importante: el tráfico de RPC va directo a Supabase y **no pasa por Vercel**, así que cualquier limitador a nivel Vercel no protegería esto.
- **Cola virtual**: se documenta el diseño (tabla de cola, RPC de ingreso/admisión, el RPC de compra exige una admisión activa) pero se **posterga explícitamente** hasta que haya un lanzamiento de alta demanda real — construirla antes de necesitarla es esfuerzo desperdiciado.

## Fase 5 — Pagos reales (Stripe)

- **Se parte el RPC monolítico en dos**, porque hoy cualquier sesión autenticada puede marcar una orden como pagada sin que se haya cobrado nada real:
  - `reserve_order(...)` (rol `authenticated`) — conserva toda la lógica de auth/inventario/holds actual, pero solo crea la orden en `status='pending'`, sin emitir boletos.
  - `confirm_order_paid(payment_reference, amount, provider)` (**solo `service_role`**, llamado desde el webhook) — verifica que el monto coincida exactamente con `orders.total` antes de emitir los boletos. Así ningún boleto/QR existe antes de que el dinero se haya movido de verdad.
  - `release_order` / reaper de órdenes expiradas.
  - El RPC viejo se revoca para `authenticated` en una migración separada, **después** de que el frontend ya use el nuevo flujo (mismo patrón de transición segura que ya se usó en `0021`).
- **Checkout embebido de Stripe** (`ui_mode: 'embedded'`) para tarjeta + OXXO + SPEI — la UI actual ya anuncia exactamente estos 3 métodos, así que Stripe es el proveedor correcto. Se borra `StripeContext.tsx` (código muerto hoy) en vez de repararlo.
- **Nuevos endpoints serverless**: `api/checkout/create-session.ts`, `api/stripe-webhook.ts` (con verificación de firma + tabla de idempotencia por `event.id` de Stripe, porque Stripe reintenta agresivamente), `api/refunds/create.ts`.
- **Taquilla no pasa por Stripe** (es una venta presencial): nuevo RPC `create_box_office_order` que registra honestamente `payment_provider='cash'|'external_terminal'` y qué miembro del staff hizo la venta — hoy escribe un ID falso en una columna literalmente llamada `stripe_payment_intent_id`.
- **Reembolsos reales**: al reembolso ya existente (`refund_tickets`) se le agrega la llamada real a `stripe.refunds.create`, siempre cancelando el boleto en la base primero — si el gateway falla después, es un ticket de soporte; si fuera al revés, sería fraude (boleto reembolsado pero todavía escaneable).

## Fase 6 — Apple Wallet + Google Wallet

- **Google Wallet primero** (gratis, se puede probar el mismo día en modo demo, y es la plataforma con más usuarios en México) — genera un link JWT de "Guardar en Wallet" que llena la columna `google_wallet_link` que ya existe pero nunca se usa.
- **Apple Wallet después** (requiere cuenta de Apple Developer de pago $99/año + certificados antes de poder probar nada) — genera un `.pkpass` real (librería `passkit-generator`) que llena `apple_wallet_pass_url`.
- Requisito previo para ambos: exponer la hora real del evento (`event_time`/`doors_time` ya existen en la tabla pero `EVENT_SELECT` nunca los trae) y corregir el bug del enlace a Google Calendar (genera un evento de duración cero).

## Fase 7 — Mapa de asientos + política de reventa

- **Mapa**: mantener el modelo de grid (no cambiar a coordenadas libres, rompería `event_seats`/el trigger de capacidad), pero agregar una **imagen de fondo real del recinto** subida a un bucket nuevo (mismo patrón que `event-images`, ya construido este mismo día) y usar el campo `event_seats.section` que existe pero nunca se llena, para mostrar "Platea A · Fila C · Asiento 12" en vez de solo "C12".
- **Reventa — recomendación: NO construir un marketplace P2P.** Razón directamente ligada a la preocupación del usuario: cobrar a un comprador y pagarle a un vendedor convierte a la plataforma en un negocio de transmisión de dinero (obligaciones KYC/AML en México), y crea un ciclo de fraude fácil (comprar → "revender" a una cuenta propia → además pedir reembolso del original). En vez de eso: **"devolver al pool del organizador"** (el boleto se cancela y su dinero se reembolsa solo al método de pago original — nunca a un tercero) + **transferencia gratuita** (sin dinero de por medio, rota el QR del que lo tenía para que su captura de pantalla muera al instante). Los boletos de cortesía ($0) quedan bloqueados de ambas operaciones.

## Explícitamente fuera de este roadmap

- **Chat por evento + publicación automática a RSS** y **programa de lealtad/puntos** — son features nuevas, no blindaje de seguridad/producción. Se pueden planear por separado si se deciden construir.
- **Panel de control simple** — ya se atacó gran parte de esto en esta misma sesión (todos los dashboards ahora usan datos reales); lo que queda es pulido visual/densidad de información, no una brecha técnica.
- **Cortesías y pases VIP** — ya construido y probado en vivo esta sesión (límite por evento configurable en el convenio, enforced en el RPC).

## Verificación

- Cada fase se prueba en vivo contra el proyecto real de Supabase (mismo método usado toda la sesión), con datos `__test__` que se limpian al terminar.
- A partir de la Fase T, cada fase nueva agrega sus propias pruebas automatizadas a la suite (no solo verificación manual) — la suite debe quedar en verde antes de dar por terminada cualquier fase posterior.
- Las pruebas de regresión de los 2 bugs históricos + los 2 bugs nuevos encontrados en esta planeación se escriben **antes** de tocar cualquier RPC relacionado, para que cualquier reintroducción accidental falle la suite inmediatamente.
