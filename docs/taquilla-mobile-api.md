# API móvil de venta en taquilla (`/api/mobile/*`)

Contrato para la app Android de taquilla (staff de mostrador que vende boletos en persona). Mismo dominio y mismas funciones serverless de Vercel que la API del validador (`https://<tu-dominio>/api/mobile/...`) — de hecho, **el login es exactamente el mismo endpoint**: si ya integraste `docs/mobile-api.md` para el validador, la autenticación no cambia en nada. Este documento cubre solo lo nuevo: los endpoints de venta.

Todas las respuestas son JSON. Los cuerpos de request son JSON (`Content-Type: application/json`).

## 1. Autenticación — igual que el validador

Usa exactamente el mismo flujo documentado en `docs/mobile-api.md` sección 1: `POST /api/mobile/auth/login` → (si hace falta TOTP) `POST /api/mobile/auth/verify-mfa` → `POST /api/mobile/auth/refresh`. El rol `taquilla` ya está soportado ahí sin ningún cambio — no hay un login separado para la app de venta.

Diferencia a tener en cuenta: los endpoints de venta de este documento exigen específicamente rol `taquilla` u `organization` (no `validador`) — una cuenta validador puede iniciar sesión con éxito pero recibirá `403 NOT_SALES_STAFF` al intentar usar cualquiera de los endpoints de abajo.

## 2. Flujo completo de una venta

```
1. GET  /api/mobile/events                              → elegir evento (ya documentado, sección 2 de mobile-api.md)
2. GET  /api/mobile/events/:eventId/ticket-types         → elegir tipo de boleto y cantidad
3. (solo si hasSeatMap=true para ese tipo)
   GET  /api/mobile/events/:eventId/seats?ticketTypeId=  → mostrar el mapa
   POST /api/mobile/events/:eventId/hold-seats           → reservar el/los asiento(s) elegido(s) (5 min)
4. POST /api/mobile/events/:eventId/sell                 → confirmar la venta, recibe el/los QR
```

Un tipo de boleto puede requerir mapa de asientos o no — la decisión es por tipo, no por evento; un mismo evento puede mezclar ambos (ver `hasSeatMap` en la sección 3).

### `GET /api/mobile/events/:eventId/ticket-types`

Header: `Authorization: Bearer <accessToken>`.

**Response 200**
```json
{
  "ticketTypes": [
    { "id": "tt-uuid", "name": "General", "price": 350.00, "capacity": 200, "sold": 87,
      "available": 113, "hasSeatMap": false },
    { "id": "tt-uuid-2", "name": "VIP", "price": 800.00, "capacity": 40, "sold": 12,
      "available": 28, "hasSeatMap": true }
  ]
}
```
`price: 0` es un tipo de cortesía — no hay ninguna marca especial, es simplemente el precio. `available` puede llegar a 0 (agotado); la app no necesita revalidar esto antes de intentar vender, `sell` (sección 4) lo rechaza igual con `SOLD_OUT`.

**Errores**: `401 AUTH_REQUIRED` · `403 NOT_SALES_STAFF` (cuenta válida pero no es `taquilla`/`organization`) · `500`.

### `GET /api/mobile/events/:eventId/seats?ticketTypeId=<uuid>`

Header: `Authorization: Bearer <accessToken>`. Solo tiene sentido para un tipo con `hasSeatMap: true`.

**Response 200**
```json
{
  "seats": [
    { "id": "seat-uuid", "rowLabel": "A", "seatNumber": "12", "rowIndex": 0, "colIndex": 11,
      "section": "Piso", "status": "available", "heldByMe": false },
    { "id": "seat-uuid-2", "rowLabel": "A", "seatNumber": "13", "rowIndex": 0, "colIndex": 12,
      "section": "Piso", "status": "held", "heldByMe": true }
  ]
}
```
`status` ∈ `available | held | reserved | sold`. `held`/`reserved` sin `heldByMe: true` significa que otro mostrador (u otro comprador en línea) lo tiene tomado en este momento — no es vendible. **No hay push/realtime en esta API**: la app debe volver a pedir este endpoint después de cada `hold-seats` fallido (`SEATS_UNAVAILABLE`) para refrescar qué sigue disponible, en vez de asumir que el mapa sigue vigente indefinidamente.

**Errores**: `400` falta `ticketTypeId` · `401 AUTH_REQUIRED` · `403 NOT_SALES_STAFF` · `500`.

### `POST /api/mobile/events/:eventId/hold-seats`

Header: `Authorization: Bearer <accessToken>`.

**Request**: `{ "seatIds": ["seat-uuid", "seat-uuid-2"] }`
**Response 200**: `{ "seats": [{ "seatId": "seat-uuid", "holdExpiresAt": "2026-09-04T20:35:00Z" }] }`

El hold dura **5 minutos exactos** y no es prorrogable automáticamente por el servidor — si la app tarda más que eso en confirmar la venta, **debe volver a llamar este mismo endpoint con los mismos `seatIds`** antes de que expire (igual que el mapa web hace un "heartbeat" cada 90s); de lo contrario, otro mostrador puede tomar el asiento y `sell` fallará con `HOLD_EXPIRED`.

**Errores**: `400` `seatIds` vacío/inválido · `401 AUTH_REQUIRED` · `401 MFA_REQUIRED` (no debería pasar si el login se siguió completo) · `403 NOT_SALES_STAFF` · `403 DEVICE_REVOKED` · `409 { errorCode: "SEATS_UNAVAILABLE" }` uno o más asientos ya no están libres — vuelve a pedir `GET .../seats` para refrescar y ofrece otros · `500`.

### `POST /api/mobile/events/:eventId/release-seats`

Header: `Authorization: Bearer <accessToken>`. Llamar cuando el cliente cambia de opinión o reduce la cantidad, para no bloquear el asiento los 5 minutos completos.

**Request**: `{ "seatIds": ["seat-uuid"] }`
**Response 200**: `{ "ok": true }`
**Errores**: `400` `seatIds` vacío/inválido · `401 AUTH_REQUIRED` · `401 MFA_REQUIRED` · `403 NOT_SALES_STAFF` · `403 DEVICE_REVOKED` · `500`.

## 3. Confirmar la venta

### `POST /api/mobile/events/:eventId/sell`

Header: `Authorization: Bearer <accessToken>`.

**Request**
```json
{
  "items": [{ "ticketTypeId": "tt-uuid", "quantity": 2 }],
  "seatIds": ["seat-uuid", "seat-uuid-2"],
  "customerName": "Juan Pérez",
  "customerEmail": "juan@correo.com",
  "paymentMethod": "cash",
  "idempotencyKey": "uuid-generado-en-android"
}
```
- `items` y/o `seatIds`: al menos uno de los dos. `items` es para tipos sin mapa de asientos (`hasSeatMap: false`); `seatIds` para los que sí tienen — los asientos deben haberse reservado antes con `hold-seats` (con el mismo token/sesión). Un carrito puede mezclar ambos si incluye tipos de las dos clases.
- `customerName`/`customerEmail`: **opcionales** — si se omiten, el sistema registra la venta como "Venta en taquilla" / `sin-correo@taquilla.local`, igual que hace hoy el mostrador web. No hay campo de teléfono (tampoco lo pide la web).
- `paymentMethod`: `"cash"` o `"card"` — **puramente informativo**, no hay integración con ninguna terminal de pago; el cobro real ocurre fuera del sistema (efectivo físico o una terminal de tarjeta aparte). Solo queda como referencia de auditoría.
- `idempotencyKey`: un UUID generado una vez por intento de venta (no por click) — reutilízalo si reintentas tras un timeout de red; una segunda llamada con la misma clave devuelve la misma venta ya creada, nunca duplica el cobro/boletos. Genera uno **nuevo** para la siguiente venta.

**Response 200**
```json
{
  "orderId": "order-uuid",
  "tickets": [
    { "ticketId": "...", "qrCode": "a1b2c3...", "ticketTypeName": "VIP", "seatLabel": "A-13" },
    { "ticketId": "...", "qrCode": "d4e5f6...", "ticketTypeName": "General", "seatLabel": null }
  ]
}
```
`qrCode` es el mismo código que usa `check_in_ticket` en la puerta — muéstralo/imprímelo de inmediato para el cliente; **este endpoint es la única forma de obtenerlo**, no hay una consulta separada de "dame el boleto de esta orden".

**Errores** — ninguno de estos son "el boleto es inválido", son fallas reales que impiden completar la venta:
| status | errorCode | cuándo |
|---|---|---|
| 400 | — | falta `items`/`seatIds`, `paymentMethod` inválido, o falta `idempotencyKey` |
| 401 | `AUTH_REQUIRED` | token inválido/expirado → refrescar y reintentar |
| 401 | `MFA_REQUIRED` | la sesión no llegó a `aal2` (no debería pasar si el login se siguió completo) |
| 403 | `NOT_SALES_STAFF` | la cuenta no es `taquilla`/`organization` |
| 403 | `AUTH_MISMATCH` | el operador no pertenece a la organización dueña del evento |
| 403 | `DEVICE_REVOKED` | esta sesión fue revocada (ver `docs/mobile-api.md` sección 4) |
| 404 | — | el evento no existe |
| 409 | `SOLD_OUT` | el tipo de boleto ya no tiene inventario |
| 409 | `HOLD_EXPIRED` | uno o más `seatIds` ya no están reservados por esta sesión (pasaron los 5 min, o nunca se llamó `hold-seats`) — vuelve a intentar el hold |
| 409 | `COURTESY_LIMIT` | el tipo de boleto es cortesía ($0) y el evento ya alcanzó su límite contractual de cortesías — la app debe mostrar este mensaje tal cual, no hay forma de saber cuántas quedan de antemano (tampoco lo sabe la web hoy) |
| 409 | `EVENT_CANCELLED` / `NOT_ON_SALE` | el evento fue cancelado, o (si aplicara) aún no está a la venta |
| 400 | `INVALID_ARGS` / `NO_SEATS` | forma de `items`/`seatIds` inválida a nivel de negocio (ej. cantidad ≤ 0) |
| 500 | — | error inesperado (incluye el caso raro de que la venta se creó pero la relectura de los boletos falló — revisar `orders`/`tickets` por `orderId` manualmente si esto ocurre) |

## 4. Requisitos del cliente Android

- **Mostrar/imprimir el QR de inmediato tras `sell`** — es el único momento en que la API lo entrega; no hay pantalla ni endpoint de "ver boleto ya vendido" en esta versión (fuera de alcance, ver sección 5).
- **Reintentos de `hold-seats`**: si la venta va a tardar (el operador conversando con el cliente, cobro lento), reenvía `hold-seats` con los mismos `seatIds` antes de que se cumplan los 5 minutos — igual que el heartbeat cada 90s que ya hace la web (`SeatMapPicker.tsx`).
- **No hay tiempo real**: a diferencia del mapa de asientos web (que se refresca solo por Realtime), esta API no empuja cambios — si `hold-seats` falla con `SEATS_UNAVAILABLE`, vuelve a pedir `GET .../seats` para ver qué sigue libre antes de dejar que el operador reintente.
- **Un mismo `idempotencyKey` por intento de venta, no por sesión completa** — genera uno nuevo cada vez que el operador empieza a armar un carrito nuevo (mismo criterio que la web: se regenera al cambiar de evento o después de una venta exitosa).

## 5. Fuera de alcance de esta versión

- **Consultar boletos de una venta ya hecha** (reimprimir, reenviar por correo): no existe endpoint — solo se obtienen los QR en la respuesta de `sell`. Si se pierde esa respuesta, hoy no hay forma de recuperarla desde la API (la web tampoco lo resuelve — es un vacío conocido, no exclusivo de esta app).
- **Envío de correo de confirmación al comprador**: el sistema no envía correos en ningún flujo de venta hoy (ni web ni esta API) — si se quiere, es trabajo nuevo, no algo que esta API omite por decisión propia.
- **Rol `promotor`**: `create_order_and_tickets` en la base de datos sí permite vender a nombre de otro a un rol `promotor` además de `organization`/`taquilla`, pero esta API restringe los endpoints de venta a `organization`/`taquilla` únicamente — se puede ampliar después si hace falta una app para promotores.
- **Terminal de pago real**: `paymentMethod` es una etiqueta, no hay integración con ninguna pasarela ni terminal física para ventas en persona — el cobro ocurre fuera del sistema, igual que en la web.
