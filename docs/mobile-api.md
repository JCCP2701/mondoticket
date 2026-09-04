# API móvil de validación de boletos (`/api/mobile/*`)

Contrato para la app Android de validador (staff de puerta). Son funciones serverless de Vercel bajo `/api/mobile/**` — mismo dominio que el resto del sitio (`https://<tu-dominio>/api/mobile/...`), sin servidor propio: cada endpoint es un thin proxy hacia funciones SQL de Supabase que ya usa el validador web (`check_in_ticket`, `get_event_gate_manifest`, `sync_ticket_scans`). No es necesario conocer Supabase para integrarse — solo este documento.

Todas las respuestas son JSON. Los cuerpos de request son JSON (`Content-Type: application/json`).

## 1. Flujo de autenticación

```
POST /api/mobile/auth/login          (email + password)
        │
        ├── mfaRequired: false ──────────────────────────► sesión lista
        │
        └── mfaRequired: true
                │
                POST /api/mobile/auth/verify-mfa (pendingToken + código TOTP)
                        │
                        └──────────────────────────────────► sesión lista

POST /api/mobile/auth/refresh        (refreshToken) — cuando expira el accessToken
```

Todas las cuentas de staff (rol `validador`, y también `organization`/`taquilla` si llegan a usar la misma app) requieren un segundo factor TOTP, igual que en la web — **esto se exige a nivel de base de datos** (migración `0042_mobile_gate_hardening.sql`), no solo aquí: aunque alguien se saltara esta API y llamara los RPCs de Supabase directo, un JWT sin `aal2` sigue siendo rechazado con `MFA_REQUIRED`.

### `POST /api/mobile/auth/login`

**Request**
```json
{ "email": "validador@evento.com", "password": "...", "deviceId": "android-<uuid>", "deviceLabel": "Tablet puerta 2" }
```
`deviceId`/`deviceLabel` son opcionales y solo sirven de etiqueta legible — la sesión queda registrada para poder revocarse (ver sección 4) tanto si se mandan como si no.

**Response 200 — cuenta exenta de MFA** (`profiles.mfa_exempt`, hoy solo demos)
```json
{
  "mfaRequired": false,
  "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": 1735900000 },
  "user": { "id": "...", "name": "Juan", "email": "...", "role": "validador",
            "organizations": [{ "id": "org-uuid", "name": "Grupo X" }] }
}
```

**Response 200 — requiere MFA, factor ya verificado (caso normal)**
```json
{
  "mfaRequired": true,
  "isFirstMfaSetup": false,
  "factorId": "34e770dd-...",
  "pendingToken": "<jwt aal1>",
  "pendingRefreshToken": "<refresh token aal1>"
}
```
Reenvía `pendingToken` y `pendingRefreshToken` (los dos, tal cual) a `/verify-mfa`.

**Response 200 — primer login, sin TOTP enrolado todavía**
```json
{
  "mfaRequired": true,
  "isFirstMfaSetup": true,
  "factorId": "...",
  "pendingToken": "...",
  "pendingRefreshToken": "...",
  "totp": { "secret": "JBSWY3DPEHPK3PXP", "uri": "otpauth://totp/...", "qrCodeSvg": "<svg>...</svg>" }
}
```
La app debe mostrar `uri`/`secret` para que el usuario lo agregue a su app de autenticación (Google Authenticator, Authy, etc.) antes de pedirle el primer código en `/verify-mfa`.

**Errores**
| status | errorCode | cuándo |
|---|---|---|
| 400 | — | falta `email`/`password` |
| 401 | `INVALID_CREDENTIALS` | credenciales incorrectas |
| 403 | `NOT_GATE_STAFF` | el login es válido pero el rol no puede validar boletos (p. ej. un comprador) |
| 429 | `TOO_MANY_ATTEMPTS` | rate limit por intentos fallidos (ver abajo) |
| 500 | — | error de configuración del servidor |

### `POST /api/mobile/auth/verify-mfa`

**Request**
```json
{ "pendingToken": "...", "pendingRefreshToken": "...", "factorId": "34e770dd-...", "code": "123456",
  "deviceId": "android-<uuid>", "deviceLabel": "Tablet puerta 2" }
```
Los 4 primeros campos son obligatorios (`pendingToken` y `pendingRefreshToken` son los que devolvió `/login` — ambos, no solo el access token). `deviceId`/`deviceLabel` son opcionales y solo etiquetan la sesión — esta queda registrada (revocable) al completar el login la mandes o no.

**Response 200**
```json
{
  "session": { "accessToken": "...", "refreshToken": "..." },
  "user": { "id": "...", "name": "Juan", "email": "...", "role": "validador",
            "organizations": [{ "id": "org-uuid", "name": "Grupo X" }] }
}
```

**Errores**: `400` campos faltantes · `401 { errorCode: "INVALID_MFA_CODE" }` código incorrecto/expirado o `pendingToken`/`pendingRefreshToken` inválidos · `403 NOT_GATE_STAFF` · `500`.

### `POST /api/mobile/auth/refresh`

**Request**: `{ "refreshToken": "..." }`
**Response 200**: `{ "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": ... } }`
**Errores**: `400` falta `refreshToken` · `401 { errorCode: "SESSION_EXPIRED" }` → volver a `/login` · `500`.

El nivel de MFA (`aal2`) se conserva automáticamente al refrescar — no hay que repetir el TOTP en cada refresh, solo en un login nuevo.

### Rate limiting de login

5 intentos fallidos en 15 minutos con el mismo correo, o 20 en 15 minutos desde la misma IP, devuelven `429 TOO_MANY_ATTEMPTS` **antes** de siquiera intentar la contraseña. No hay forma de "desbloquear" desde la app — solo esperar la ventana.

## 2. Eventos

### `GET /api/mobile/events?organizationId=<opcional>`

Header: `Authorization: Bearer <accessToken>`.

**Response 200**
```json
{
  "organizations": [{ "id": "org-uuid", "name": "Grupo X" }],
  "events": [
    { "id": "evt-uuid", "organizationId": "org-uuid", "name": "Concierto X",
      "venueName": "Arena CDMX", "eventDate": "2026-09-20", "status": "upcoming" }
  ]
}
```
`events: []` es una respuesta válida (cuenta sin organización asignada), no un error.

**Errores**: `401` token inválido · `403 NOT_GATE_STAFF`.

## 3. Validar un boleto (en línea)

### `POST /api/mobile/events/:eventId/checkin`

Header: `Authorization: Bearer <accessToken>`.

**Request**
```json
{ "qrCode": "a1b2c3...", "deviceId": "android-<uuid>" }
```

**Response 200 — siempre, para cualquier resultado de negocio** (nunca es un error HTTP)
```json
{
  "result": "already_used",
  "ticketId": "...", "ticketTypeName": "General", "seatLabel": null,
  "holderName": "María Pérez",
  "checkedInAt": "2026-09-04T20:11:00Z", "checkedInByName": "Carlos (puerta 2)"
}
```
`result` ∈ `ok | already_used | cancelled | wrong_event | not_found | invalid_signature` (este último es vestigial — ver nota abajo, en la práctica nunca debería aparecer). Un `qrCode` que no existe da `not_found`: así es como se detecta un QR falso/inventado.

**Errores reales** (no confundir con un `result` de negocio):
| status | errorCode | cuándo |
|---|---|---|
| 400 | — | falta `qrCode` |
| 401 | `AUTH_REQUIRED` | token inválido/expirado → refrescar y reintentar |
| 401 | `MFA_REQUIRED` | la sesión no llegó a `aal2` (no debería pasar si el flujo de login se siguió completo) |
| 403 | `FORBIDDEN` | el validador no es staff de puerta de ese evento |
| 403 | `DEVICE_REVOKED` | la **sesión** actual fue revocada (ver sección 4) — la app debe forzar logout local |
| 500 | — | error inesperado |

## 4. Registro y revocación de dispositivos

El registro ocurre automáticamente al completar `/login` o `/verify-mfa` — no hay un endpoint dedicado, y ocurre siempre, se mande `deviceId` o no (omitirlo solo significa que esa sesión queda sin una etiqueta legible, nunca sin poder revocarse). Sirve para poder cortar el acceso de una tablet perdida/robada **al instante**, sin esperar a que expire su token (cerrar sesión en Supabase Auth no invalida un access token ya emitido).

Importante para quien integre esto: la revocación **no depende del `deviceId` que manda el request de `checkin`/`sync`** — sería trivial de evadir (omitirlo, o mandar cualquier otro valor) si así fuera. La clave real es `session_id`, un claim que Supabase Auth firma dentro del propio `accessToken` y que el cliente no puede omitir, cambiar ni falsificar; `register_mobile_device` la lee del token en el servidor, nunca del body del request. `deviceId`/`deviceLabel` son solo una etiqueta legible (para que soporte pueda revocar "la tablet de la puerta 2" sin memorizar un uuid) — revocar por `deviceId` apaga TODAS las sesiones alguna vez registradas con esa etiqueta.

La revocación en sí (RPC `revoke_mobile_device`, solo manager de organización o superadmin) no tiene endpoint HTTP en esta primera versión — se ejecuta directo en Supabase por el equipo de soporte hasta que se justifique una pantalla de administración. Una sesión revocada recibe `403 DEVICE_REVOKED` en `checkin`, `manifest` y `sync` — la próxima llamada a cualquiera de los tres, sin importar qué `deviceId` mande, falla de inmediato.

## 5. Modo offline

Flujo completo:

```
1. GET  /api/mobile/events/:eventId/manifest     → descargar antes de abrir puertas
2. (sin red) verificar cada escaneo localmente contra el manifiesto
3. POST /api/mobile/events/:eventId/sync         → subir el lote al recuperar señal
```

### `GET /api/mobile/events/:eventId/manifest`

Header: `Authorization: Bearer <accessToken>`.

**Response 200**
```json
{
  "serverNow": "2026-09-04T19:00:00Z",
  "tickets": [
    { "ticketId": "...", "status": "valid", "ticketTypeName": "General",
      "seatLabel": null, "holderName": "María Pérez", "qrHash": "9f86d0..." }
  ]
}
```
`qrHash` es SHA-256 del código real — **el manifiesto nunca trae el `qrCode` en claro**, para que un dispositivo perdido no filtre credenciales usables. Verificación local: `sha256(código escaneado) === qrHash` de algún ticket con `status: "valid"`.

**Errores**: `401 AUTH_REQUIRED` · `401 MFA_REQUIRED` · `403 FORBIDDEN` · `403 DEVICE_REVOKED`.

**Requisitos de implementación en el APK** (afectan la corrección, no son solo sugerencias):
- **Caducidad del manifiesto**: no existe TTL en el servidor — la app debe imponerlo. Recomendado: exigir re-descarga si tiene más de 6-12h, bloquear el escaneo si supera 24-48h. Un tablet de puerta instalado permanentemente puede quedarse con un manifiesto obsoleto mucho más tiempo que una pestaña de navegador.
- **Cifrado en reposo**: el manifiesto trae `holderName` (nombre real del comprador) en texto plano — guardarlo cifrado (Room+SQLCipher o equivalente, con la llave en Android Keystore), no en una tabla plana.
- **Un boleto cancelado/reembolsado después de descargar el manifiesto pero antes de sincronizar** puede dar un falso "válido" offline — es un compromiso aceptado, no un bug: la reconciliación post-evento (comparar `checked_in_at` contra cancelaciones posteriores) es la herramienta para detectarlo, no algo que el APK deba prevenir.

### `POST /api/mobile/events/:eventId/sync`

Header: `Authorization: Bearer <accessToken>`.

**Request**
```json
{ "scans": [
  { "clientScanId": "uuid-generado-en-android", "qrCode": "a1b2c3...", "deviceId": "android-<uuid>", "scannedAt": "2026-09-04T18:55:00Z" }
] }
```
Máximo 500 escaneos por request — la app debe partir lotes grandes (recomendado ~200 por request).

**Response 200**
```json
{ "results": [
  { "clientScanId": "uuid-...", "ticketId": "...", "serverResult": "ok", "conflict": false }
] }
```
`serverResult` es la verdad real (el servidor **re-verifica** cada código, nunca confía en lo que la app resolvió localmente) — puede diferir de lo que se mostró en pantalla en el momento del escaneo offline si, por ejemplo, otro dispositivo ya había marcado ese boleto como usado mientras ambos estaban sin señal. `conflict: true` señala esos casos para revisión.

`clientScanId` (generado en el dispositivo, un UUID por escaneo) hace el envío **idempotente**: reintentar el mismo lote entero tras un timeout de red es seguro, nunca duplica un check-in. Una fila mal formada dentro del lote da `serverResult: "invalid_payload"` solo para esa fila — el resto del lote se procesa normal.

**Errores**: `400` `scans` vacío/inválido/excede el máximo · `401 AUTH_REQUIRED` · `401 MFA_REQUIRED` · `403 FORBIDDEN` · `403 DEVICE_REVOKED`.

## 6. Requisitos generales del cliente Android

- **Almacenamiento de tokens**: `accessToken`/`refreshToken` en `EncryptedSharedPreferences` (respaldado por Android Keystore), nunca en texto plano.
- **Refresco proactivo**: renovar el token al volver a primer plano y periódicamente (p. ej. cada ~10 min activo), no solo reactivamente ante un 401 — un refresh reactivo justo en el momento de escanear necesita red exactamente cuando podría no haberla.
- **Un 401 de sesión expirada debe tratarse igual que un fallo de red** para efectos de caer a verificación offline — no usar una heurística que solo mire "¿la respuesta trae código de error?" para decidir si hubo red o no, porque una sesión expirada también da un error estructurado y se confundiría con "código inválido" en vez de activar el fallback offline correcto. La verificación offline en sí no necesita un token fresco — solo la descarga inicial del manifiesto y la sincronización final sí.

## 7. Fuera de alcance de esta versión

- **Revertir un check-in** (`undo_check_in`): restringido en la base de datos a manager de organización o superadmin, nunca a `validador`/`taquilla` — no aplica a esta app salvo que en el futuro también sirva a cuentas `organization`.
- **QR rotativo / `get_event_signing_key`**: esquema descontinuado (migración `0030`) — todo boleto se emite hoy con `allow_static_qr = true` y un único código estático. No hay endpoint para esto ni falta.
- **Pantalla de administración de dispositivos** (listar/revocar desde una UI): la revocación existe a nivel de base de datos (`revoke_mobile_device`) pero sin endpoint HTTP propio todavía.
