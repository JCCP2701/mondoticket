# OrkestaPay — correcciones (implementadas)

**Estado:** ✅ implementado. Los 3 puntos de este documento fueron encontrados en una auditoría de la integración de pagos (ver `orkestapay-integration.md` para el diseño original) y se corrigieron en `api/payments/orkesta/create-checkout.ts`, `api/payments/orkesta/refund.ts`, `api/payments/orkesta/webhook.ts` y la nueva migración `supabase/migrations/0046_gateway_refund_webhook.sql`. **Pendiente de tu lado:** aplicar esa migración contra Supabase (no hay CLI de Supabase ni conexión a la base de datos disponible desde este entorno) y desplegar a producción de Vercel.

Además, por separado, se corrigió un cuarto hallazgo relacionado (`expires_at` del checkout, confirmado directamente con soporte de OrkestaPay) en `api/payments/orkesta/create-checkout.ts` — ver la sección "Confirmado con soporte de OrkestaPay" más abajo.

## Contexto

Al auditar la integración de pagos con OrkestaPay se encontró un bug real de concurrencia que puede hacer que un comprador pague y nunca reciba su boleto, mensajes de error que exponen detalle interno de la API de OrkestaPay al cliente, y un hueco en el manejo del webhook para reembolsos hechos fuera de la app (directo en el dashboard de OrkestaPay).

---

## 0. `expires_at` del checkout confundía la duración de la sesión de pago con el hold de inventario

**Confirmado con soporte de OrkestaPay (sept 2026).** Mientras se investigaba con ellos por qué algunos pagos con tarjeta quedaban atorados en `PAYMENT_ACTION_REQUIRED`, se detectó que `api/payments/orkesta/create-checkout.ts` mandaba en `order.expires_at` un timestamp absoluto de hasta 72h (`organizations.reservation_hold_minutes`, pensado para cuánto tiempo mantenemos reservado el inventario, no para el checkout en sí) en vez de la duración de la sesión de checkout. Soporte de OrkestaPay confirmó que la ventana correcta es de **5 minutos**, independiente del hold de inventario — la sesión interactiva del checkout (elegir método, capturar tarjeta/3DS) es una cosa distinta de cuánto tiempo sigue siendo pagable una referencia de SPEI/efectivo, que OrkestaPay maneja aparte una vez elegido el método.

**Aplicado:** `api/payments/orkesta/create-checkout.ts` ahora manda `expires_at: Date.now() + 300000` (timestamp absoluto en ms Unix: un `300000` a secas se interpreta como 1970 y OrkestaPay lo rechaza con 400 "La fecha de vencimiento de la orden no es válida"), sin depender de `order.expires_at`/`reservation_hold_minutes`. Afecta por igual al checkout web y al de la app móvil (ambos llaman este mismo endpoint). Commit `5d5bc69`.

---

## 1. [CRÍTICO] Race condition en creación de checkout de OrkestaPay — ✅ aplicado

**Archivo:** `api/payments/orkesta/create-checkout.ts`

**Problema (líneas 85-95 y 141-153):** si el endpoint se invoca dos veces para la misma orden mientras `orkesta_checkout_id` sigue siendo `null` (doble clic pasado el `disabled` del botón, reintento de red tras timeout, dos pestañas), ambas invocaciones crean un checkout distinto en OrkestaPay y ambas pasan el `UPDATE ... WHERE status='pending'` final (líneas 143-148) — gana la última en escribir, pisando en silencio la referencia de la primera. Si el comprador termina pagando en el checkout que no quedó guardado, el webhook (`webhook.ts:91-98`) nunca encuentra la orden por `orkesta_order_id` → responde 404 → Svix reintenta y se agota → **el comprador pagó y nunca recibe boleto**.

**Corrección aplicada:** se reemplazó el bloque de reuso (líneas 85-95) y el `UPDATE` final (líneas 141-153) por un "claim" atómico con valor sentinel. No hizo falta migración nueva — `orkesta_checkout_id` es `text` libre, sin `unique` (`supabase/migrations/0032_reserve_order_and_release.sql:34`):

1. Antes de llamar a OrkestaPay, reclamar la orden:
   ```ts
   const claimToken = `__claiming__:${orderId}:${Date.now()}`;
   const { data: claimed } = await serviceClient
     .from('orders')
     .update({ orkesta_checkout_id: claimToken })
     .eq('id', orderId)
     .eq('status', 'pending')
     .is('orkesta_checkout_id', null)
     .select('id');
   ```
   - Si `claimed` viene vacío: releer la orden.
     - Si ya tiene un `orkesta_checkout_id` real (no-sentinel): reusar ese checkout vía `GET /v1/checkouts/:id` (mismo patrón que el bloque de reuso actual).
     - Si tiene el sentinel de otra invocación en curso: responder `409` ("ya hay un intento de pago en curso, intenta de nuevo en unos segundos").
     - Si `status` ya no es `pending`: responder `409` (igual que hoy).
2. Crear el checkout en OrkestaPay (payload sin cambios).
3. Si la llamada a OrkestaPay falla: rollback del sentinel (`UPDATE orders SET orkesta_checkout_id = null WHERE id = orderId AND orkesta_checkout_id = claimToken`) antes de responder el error (ver punto 2 para el mensaje).
4. Si tiene éxito: persistir los IDs reales con `UPDATE ... WHERE id = orderId AND status = 'pending' AND orkesta_checkout_id = claimToken` — solo confirma si seguimos siendo dueños del claim.

**Compatibilidad con frontend:** `UserCheckout.tsx` (~líneas 268-290) ya maneja cualquier string de error genérico vía `setPurchaseError`, sin lógica especial por código — no requiere cambios de UI. El botón ya tiene `disabled={isProcessing || !canPurchase}` (mitiga doble clic en la misma pestaña; este fix cubre los demás vectores: reintento de red, dos pestañas, llamada directa repetida).

**Caso borde aceptado:** si la función serverless muere a mitad de camino entre el claim y el commit/rollback (timeout duro, OOM), la orden queda con el sentinel hasta que `expires_at` (hasta 72h) la saca de `pending`, autorresolviendo el problema; mientras tanto el comprador vería el 409 en reintentos. Ventana de riesgo corta y de bajo impacto — no se diseña mitigación adicional.

El comentario correspondiente en `orkestapay-integration.md` (~línea 39) también se actualizó para describir el nuevo mecanismo. Commit `5e6788f`.

---

## 2. Sanitizar mensajes de error expuestos al cliente — ✅ aplicado

Dos endpoints reenvían el mensaje crudo de la API de OrkestaPay directo al cliente, exponiendo estructura interna (rutas como `/v1/checkouts`, mensajes de error de la pasarela):

- **`api/payments/orkesta/create-checkout.ts:136-139`** — mismo bloque catch que se toca en el punto 1 (rollback del sentinel + mensaje genérico):
  ```ts
  } catch (err: any) {
    console.error('OrkestaPay checkout creation failed', orderId, err);
    // rollback del sentinel (ver punto 1)
    res.status(502).json({ error: 'No se pudo procesar el pago, intenta de nuevo' });
    return;
  }
  ```
- **`api/payments/orkesta/refund.ts:125-128`** (el `console.error` ya existe en línea 126; solo cambia qué se guarda en la respuesta):
  ```ts
  } catch (err: any) {
    console.error('OrkestaPay refund failed', orderId, entry.paymentId, err);
    orkestaRefunds.push({ orderId, paymentId: entry.paymentId, amount, error: 'No se pudo procesar el reembolso con la pasarela de pago, intenta de nuevo' });
  }
  ```

El frontend (`dataService.ts`, `UserCheckout.tsx`) solo muestra el string de error tal cual — un mensaje genérico fluye sin romper nada. *No se tocan* `refund.ts:56` y `refund.ts:79` (errores de Supabase/RPC con códigos intencionales tipo `ORDER_NOT_FOUND`) — no forman parte de este hallazgo. Commit `5e6788f`.

---

## 3. Manejar el evento `payment.refund` del webhook — ✅ aplicado

**Problema:** hoy `api/payments/orkesta/webhook.ts:119-123` ignora por diseño el evento `payment.refund`, asumiendo que todo reembolso pasa por `api/payments/orkesta/refund.ts`. Si alguien revierte un pago desde el dashboard de OrkestaPay (disputa/chargeback) en vez del botón de la app, el dinero se devuelve pero el boleto sigue `valid`/escaneable.

**Corrección aplicada:**

1. **Nueva migración** `supabase/migrations/0046_gateway_refund_webhook.sql` (creada, aún **no aplicada contra Supabase** — ver "Pendiente de tu lado" arriba) con una RPC de solo-servidor (sin depender de `auth.uid()`, a diferencia de `refund_tickets` en `supabase/migrations/0019_org_membership_rpcs.sql:160`, que exige sesión de usuario y por eso no puede reusarse tal cual desde el webhook):
   ```sql
   create or replace function cancel_order_tickets_for_gateway_refund(p_order_id uuid) returns void
   language plpgsql
   security definer
   as $$
   declare
     v_ticket record;
   begin
     for v_ticket in
       select t.id, t.ticket_type_id, t.seat_id, oi.unit_price
       from tickets t
       join order_items oi on oi.order_id = t.order_id and oi.ticket_type_id = t.ticket_type_id
       where t.order_id = p_order_id and t.status = 'valid'
     loop
       update tickets set status = 'cancelled', refunded_at = now() where id = v_ticket.id;
       update event_ticket_types set sold = sold - 1 where id = v_ticket.ticket_type_id;
       if v_ticket.seat_id is not null then
         update event_seats set status = 'available', held_by = null, hold_expires_at = null where id = v_ticket.seat_id;
       end if;
       update orders set refunded_amount = refunded_amount + v_ticket.unit_price where id = p_order_id;
     end loop;

     update orders set status = 'refunded' where id = p_order_id and refunded_amount >= total;
   end;
   $$;

   revoke execute on function cancel_order_tickets_for_gateway_refund(uuid) from public;
   revoke execute on function cancel_order_tickets_for_gateway_refund(uuid) from authenticated;
   grant execute on function cancel_order_tickets_for_gateway_refund(uuid) to service_role;
   ```
   Nota: esta RPC hereda a propósito la misma comparación `refunded_amount >= total` que ya usa `refund_tickets` — el mismo bug conocido y ya documentado (`orders.status` casi nunca llega a `'refunded'` porque `refunded_amount` no incluye el cargo por servicio; ver "Pendiente explícito" en `orkestapay-integration.md`). Se mantiene así por consistencia con el flujo manual existente — corregirlo es un cambio aparte. Los boletos individuales sí quedan `cancelled` correctamente en ambos casos, que es lo único que afecta si el boleto puede escanearse.
2. En `api/payments/orkesta/webhook.ts`, agregar el manejo del evento (~líneas 113-123):
   ```ts
   } else if (event.event_type === 'payment.cancel') {
     if (order.status === 'pending') {
       const { error } = await serviceClient.rpc('do_release_order', { p_order_id: order.id });
       if (error) throw error;
     }
   } else if (event.event_type === 'payment.refund') {
     if (order.status === 'paid') {
       const { error } = await serviceClient.rpc('cancel_order_tickets_for_gateway_refund', { p_order_id: order.id });
       if (error) throw error;
     }
   }
   // payment.authorize: acknowledged, no action — checkout es auto-capture,
   // así que un authorize sin capture no debe emitir boletos.
   ```
   El guard `order.status === 'paid'` evita reprocesar si la orden ya fue reembolsada por la app (`refund.ts`) o nunca llegó a pagarse. Commit `5e6788f`.

---

## Verificación

Código verificado con `tsc --noEmit` (sin errores) y `npm run build` (sin regresiones). Pendiente de probar en vivo una vez aplicada la migración:

1. **Race condition (punto 1):** con una orden `pending` de prueba, disparar dos `POST /api/payments/orkesta/create-checkout` casi simultáneos con el mismo `orderId` y token (dos `curl` en paralelo, localmente vía `vercel dev` o contra preview). Confirmar que solo queda un `orkesta_checkout_id` no-sentinel en la orden, y que el webhook encuentra la orden sin 404 cuando llega el pago.
2. **Sanitización de errores (punto 2):** forzar un error controlado (p.ej. `ORKESTA_CLIENT_SECRET` inválido temporalmente en local) y confirmar que la respuesta HTTP al cliente trae el mensaje genérico, mientras el detalle completo aparece en los logs del servidor.
3. **Webhook `payment.refund` (punto 3):** en el ambiente sandbox de OrkestaPay, disparar un evento `payment.refund` (firmado con Svix) para una orden `paid` de prueba y confirmar que sus boletos `valid` pasan a `cancelled`. **Requiere que la migración 0046 ya esté aplicada** (la RPC no existe hasta entonces).
4. Ninguno de estos cambios requiere nuevas variables de entorno ni afecta al build de frontend.

## Pendiente de tu lado

1. **Aplicar la migración `supabase/migrations/0046_gateway_refund_webhook.sql`** contra tu proyecto de Supabase — este entorno no tiene el CLI de Supabase instalado ni credenciales de conexión a la base de datos, así que no pude aplicarla yo. Opciones: pegar el contenido del archivo en el SQL Editor del dashboard de Supabase, o `supabase db push` si tienes el CLI enlazado localmente.
2. **Desplegar a producción de Vercel** (`vercel --prod`) — igual que con los cambios anteriores, el modo automático de Claude Code me bloquea esa acción específica.
