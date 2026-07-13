-- Only logged-in users may create orders (the checkout flow always
-- registers/logs in the buyer before calling this), not anonymous callers.
revoke execute on function create_order_and_tickets(uuid, uuid, uuid, text, text, text, text, jsonb) from public;
grant execute on function create_order_and_tickets(uuid, uuid, uuid, text, text, text, text, jsonb) to authenticated;
