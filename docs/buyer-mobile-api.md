# API móvil del comprador (`/api/mobile/buyer/*`)

Contrato para la app Android del comprador final — navegar eventos, comprar boletos (efectivo cuando el total es $0, o pago real con tarjeta/SPEI/efectivo vía OrkestaPay) y ver los boletos ya comprados. Mismo dominio que el resto del sitio (`https://<tu-dominio>/api/mobile/buyer/...`), funciones serverless de Vercel — no confundir con `docs/mobile-api.md` (validador) ni `docs/taquilla-mobile-api.md` (venta en mostrador): esta es una API **separada**, con su propio login, pensada para el público en general, no para staff.

Todas las respuestas son JSON. Los cuerpos de request son JSON (`Content-Type: application/json`).

## 1. Diferencia clave con las otras dos APIs

El comprador **nunca pasa por TOTP** (a diferencia de validador/taquilla) — puede tener contraseña o iniciar sesión sin ella (código por correo), y puede registrarse él mismo. El login de esta API vive en `/api/mobile/buyer/auth/*`, separado de `/api/mobile/auth/*` (ese es solo para staff y siempre exige TOTP).

**Regla de negocio importante**: los boletos de cortesía (`price: 0`) **no aparecen ni se pueden comprar** desde esta API — esos los asigna la organización a mano desde el panel web. Si intentas comprar uno de todos modos (mandando su `ticketTypeId` directo), la API lo rechaza con `403 COURTESY_NOT_PURCHASABLE`.

## 2. Autenticación (`/api/mobile/buyer/auth/*`)

### `POST /api/mobile/buyer/auth/register`
**Request**: `{ "name": "Juan Pérez", "email": "juan@correo.com", "password": "..." }`
**Response 200**: `{ "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": ... }, "user": { "id": "...", "name": "...", "email": "...", "role": "user" } }`
**Errores**: `400` faltan campos · `409 { errorCode: "ALREADY_REGISTERED" }` ya existe una cuenta con ese correo → manda al usuario a `/login`, no reintentes el registro · `500`.

### `POST /api/mobile/buyer/auth/login`
**Request**: `{ "email": "...", "password": "..." }` → **Response 200**: igual forma que `register`.
**Errores**: `401 { errorCode: "INVALID_CREDENTIALS" }`.

### Login sin contraseña — dos variantes, mismo canje

**Invitado nuevo** (nunca tuvo cuenta): `POST /api/mobile/buyer/auth/guest-otp-request` con `{ "email": "...", "name": "Juan Pérez" }` → `{ "ok": true }`. Crea la cuenta en el primer request si no existía.

**Cuenta ya existente**: `POST /api/mobile/buyer/auth/login-otp-request` con `{ "email": "..." }` → `{ "ok": true }`. Si el correo no está registrado, da error — nunca crea una cuenta desde aquí.

**Canjear el código** (mismo endpoint para ambos casos): `POST /api/mobile/buyer/auth/otp-verify` con `{ "email": "...", "code": "123456" }` → misma forma que `register`/`login`. **Errores**: `401 { errorCode: "INVALID_OTP" }`.

### `POST /api/mobile/buyer/auth/refresh`
**Request**: `{ "refreshToken": "..." }` → **Response 200**: `{ "session": {...} }`. **Errores**: `401 { errorCode: "SESSION_EXPIRED" }` → volver a login.

### Recuperar contraseña — por código, no por link
```
POST /api/mobile/buyer/auth/password-reset-request   { "email": "..." }        → { "ok": true } (siempre, exista o no la cuenta)
POST /api/mobile/buyer/auth/password-reset-verify     { "email", "code", "newPassword" } → { "session": {...}, "user": {...} }
```
**Requisito de configuración, fuera de este código**: la plantilla de correo "Recovery" en el dashboard de Supabase (Authentication → Email Templates) debe incluir `{{ .Token }}` (el código de 6 dígitos), no solo el link — por defecto solo trae el link, que usa un fragmento de URL (`#access_token=...`) que **una app nativa no puede leer** (solo un navegador con el SDK de Supabase corriendo ahí lo procesa). Sin ese cambio en la plantilla, `password-reset-verify` no tendrá ningún código válido que canjear. Este es un ajuste manual de configuración, no algo que se resuelva con más código.

## 3. Catálogo — sin necesidad de sesión

### `GET /api/mobile/buyer/events`
Lista de eventos próximos (todas las organizaciones), sin paginar en esta versión.
```json
{ "events": [
  { "id": "evt-uuid", "name": "Concierto X", "eventDate": "2026-11-20", "category": "Música",
    "imageUrl": "https://...", "organizationName": "Grupo X", "venueName": "Arena CDMX", "priceFrom": 350.00 }
] }
```
`priceFrom` es el precio más bajo entre los tipos de boleto **con costo** (cortesías nunca cuentan aquí) — `null` si el evento no tiene ningún tipo con precio &gt; 0 todavía.

### `GET /api/mobile/buyer/ticket-types?eventId=<uuid>`
```json
{ "ticketTypes": [
  { "id": "tt-uuid", "name": "General", "description": null, "price": 350.00, "available": 113, "hasSeatMap": false }
] }
```
Nunca incluye tipos con `price: 0` (cortesías) — quedan completamente invisibles para el comprador.

### `GET /api/mobile/buyer/seats?eventId=<uuid>&ticketTypeId=<uuid>`
Solo para tipos con `hasSeatMap: true`.
```json
{ "seats": [
  { "id": "seat-uuid", "rowLabel": "A", "seatNumber": "12", "rowIndex": 0, "colIndex": 11,
    "section": "Piso", "status": "available", "heldByMe": false }
] }
```
`status` ∈ `available | held | reserved | sold`. Si mandas `Authorization: Bearer` (opcional aquí), `heldByMe` refleja si TÚ tienes ese asiento reservado en este momento; sin sesión, siempre sale `false`. **Sin tiempo real**: refresca este endpoint tras un `hold-seats` fallido para ver qué sigue libre.

## 4. Reservar asientos (requiere sesión)

```
POST /api/mobile/buyer/hold-seats     { "eventId": "...", "seatIds": ["..."] }  → { "seats": [{ "seatId", "holdExpiresAt" }] }
POST /api/mobile/buyer/release-seats  { "seatIds": ["..."] }                    → { "ok": true }
```
El hold dura **5 minutos exactos**, sin prórroga automática — si el flujo de compra tarda más, vuelve a llamar `hold-seats` con los mismos `seatIds` antes de que expire (igual que el mapa web hace un heartbeat cada 90s), o el checkout fallará con `HOLD_EXPIRED`.

**Errores comunes**: `401 AUTH_REQUIRED` · `409 { errorCode: "SEATS_UNAVAILABLE" }` uno o más asientos ya no están libres — vuelve a pedir `GET .../seats`.

## 5. Comprar

Un carrito se arma igual que en la web: `items` (tipos sin asiento, con cantidad) y/o `seatIds` (asientos ya reservados con `hold-seats`) — puede mezclar ambos si el evento tiene tipos de las dos clases. `eventId` es obligatorio; la organización se resuelve del lado servidor, nunca se manda desde la app.

### Carrito con costo → pago real (dos pasos)

**Paso 1 — reservar inventario**: `POST /api/mobile/buyer/checkout`
```json
{ "eventId": "evt-uuid", "items": [{ "ticketTypeId": "tt-uuid", "quantity": 2 }], "seatIds": [],
  "customerName": "Juan Pérez", "customerEmail": "juan@correo.com", "customerPhone": "5512345678",
  "idempotencyKey": "uuid-generado-en-android" }
```
**Response 200**: `{ "orderId": "order-uuid" }` — la orden queda `pending`, sin boletos todavía (el pago aún no se confirma).

**Paso 2 — crear la sesión de pago**: llama directo a **`POST /api/payments/orkesta/create-checkout`** (endpoint ya existente, **no es parte de esta API móvil nueva**, pero acepta el mismo `Authorization: Bearer` de tu sesión) con `{ "orderId": "order-uuid" }` → responde `{ "checkoutRedirectUrl": "https://..." }`. Abre esa URL en un **WebView** dentro de la app (es una página hospedada por OrkestaPay — tarjeta, SPEI o efectivo, la app nunca toca datos de pago). Al terminar, OrkestaPay redirige a `.../ticket/{orderId}?orkesta=completed` (pago enviado, puede seguir `pending` unos segundos/minutos si fue SPEI/efectivo) o a `.../checkout/{eventId}?orkesta=canceled&orderId={orderId}` (cancelado) — intercepta esa navegación en el WebView (por URL) para saber cuándo cerrarlo y volver a la app nativa, en vez de dejar que el WebView navegue de verdad a esas páginas web.

Si el comprador cancela: `POST /api/mobile/buyer/release-order` con `{ "orderId": "order-uuid" }` para liberar el inventario de inmediato en vez de esperar a que expire la reserva.

**Confirmación real del pago**: la hace un webhook servidor-a-servidor entre OrkestaPay y este backend — **la app nunca la dispara ni la puede forzar**, solo puede consultar el estado (sección 6).

### Carrito 100% gratis → instantáneo, sin pasarela

Si por alguna razón el total del carrito da exactamente $0 (esto NO aplica a cortesías, que ya están bloqueadas — ver sección 1): `POST /api/mobile/buyer/buy-free` con el mismo shape que `checkout`. **Response 200**:
```json
{ "orderId": "order-uuid", "tickets": [
  { "ticketId": "...", "qrCode": "a1b2c3...", "ticketTypeName": "General", "seatLabel": null }
] }
```
El QR llega de inmediato, sin pasos adicionales.

**Errores de negocio en ambos endpoints** (`checkout`/`buy-free`):
| status | errorCode | cuándo |
|---|---|---|
| 400 | — | falta `eventId`, `items`/`seatIds`, o `idempotencyKey` |
| 401 | `AUTH_REQUIRED` | token inválido/expirado |
| 403 | `COURTESY_NOT_PURCHASABLE` | algún `ticketTypeId` es de cortesía ($0) — nunca comprable aquí |
| 403 | `AUTH_MISMATCH` | no debería pasar comprando para ti mismo |
| 404 | — | el evento no existe |
| 409 | `SOLD_OUT` / `HOLD_EXPIRED` / `SEATS_UNAVAILABLE` | inventario agotado o reserva de asiento vencida |
| 409 | `EVENT_CANCELLED` / `NOT_ON_SALE` | el evento fue cancelado, o aún no está a la venta |
| 500 | — | error inesperado |

`idempotencyKey`: un UUID por intento de compra (no por click) — reutilízalo si reintentas tras un timeout de red; la misma clave siempre devuelve la misma orden, nunca duplica el cargo.

## 6. Ver el estado de una orden y los boletos

### `GET /api/mobile/buyer/order-status?orderId=<uuid>`
Úsalo para hacer polling mientras la orden está `pending` (pago con tarjeta suele confirmar en segundos; SPEI/efectivo puede tardar horas). Recomendado: cada 2s, hasta ~30 intentos (~60s), y después un botón "Verificar de nuevo" en vez de seguir solo indefinidamente — mismo criterio que usa la web.
```json
{
  "orderId": "order-uuid", "status": "paid", "total": 756.00,
  "eventName": "Concierto X", "eventDate": "2026-11-20", "venueName": "Arena CDMX",
  "tickets": [
    { "ticketId": "...", "qrCode": "a1b2c3...", "status": "valid", "ticketTypeName": "General", "seatLabel": null }
  ]
}
```
`status` ∈ `pending | paid | failed`. `qrCode` viene **null mientras no esté `paid`** — no existe hasta que el webhook confirma el pago. Con `status: "failed"`, `tickets` sale vacío — ofrece reintentar la compra desde cero (nuevo `idempotencyKey`).

### `GET /api/mobile/buyer/tickets`
"Mis boletos" — todo el historial del comprador autenticado, sin paginar, cualquier organización/evento/estado.
```json
{ "tickets": [
  { "ticketId": "...", "orderId": "...", "status": "valid", "qrCode": "a1b2c3...",
    "ticketTypeName": "General", "price": 350.00, "seatLabel": null,
    "event": { "id": "...", "name": "Concierto X", "eventDate": "2026-11-20", "category": "Música", "imageUrl": "...", "venueName": "Arena CDMX" } }
] }
```
`status` ∈ `valid | used | cancelled`. Un boleto `cancelled` (reembolsado) sale con `qrCode: null` — muéstralo atenuado, ya no es válido para entrar.

### Google Wallet (opcional, reutiliza un endpoint que ya existe)
`GET /api/wallet/google/:ticketId` (no es parte de esta API móvil, pero acepta el mismo `Authorization: Bearer` de la sesión del comprador) → `{ "saveUrl": "https://pay.google.com/gp/v/save/..." }`. Ábrelo en el navegador/intent del sistema para que el usuario agregue el boleto a Google Wallet.

## 7. Requisitos del cliente Android

- **Tokens**: `accessToken`/`refreshToken` en almacenamiento cifrado (`EncryptedSharedPreferences`), igual criterio que las otras dos apps.
- **WebView de pago**: intercepta la navegación por URL (`orkesta=completed` / `orkesta=canceled`) en vez de dejar que el WebView renderice esas páginas web — son parte de la SPA, no están pensadas para verse dentro de un WebView embebido.
- **Polling de `order-status`**: no lo hagas indefinido — límite de intentos + botón manual, como se describe en la sección 6.
- **`idempotencyKey` nuevo por cada intento de compra**, nunca reutilizado entre compras distintas del mismo carrito.

## 8. Fuera de alcance de esta versión

- **Boletos de cortesía**: nunca comprables desde esta app — es una decisión de producto, no una limitación técnica (la organización los asigna a mano desde el panel web).
- **Reembolsos**: el comprador no puede autoreembolsarse desde la app — eso lo hace la organización desde el panel web.
- **Notificaciones push de confirmación de pago**: hoy no existe ningún mecanismo de push ni de correo de confirmación en el sistema (ni web ni esta API) — el único mecanismo es el polling de `order-status`.
- **Deep link nativo para el link de recuperación de contraseña**: se optó por el flujo de código (sección 2) en vez de intentar interceptar el magic link con un App Link de Android — más simple y ya soportado por Supabase sin cambios adicionales, más allá de la plantilla de correo.
