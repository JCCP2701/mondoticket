-- Hoy "un tipo de boleto tiene asientos o no" es una heurística 100%
-- derivada en el cliente (cuenta si existen filas en event_seats para ese
-- tipo). Persistirlo como columna real permite que la organización lo
-- decida explícitamente al crear el tipo, y que el Diseñador de Asientos
-- sepa si debe ofrecer un grid pintable o solo un campo de capacidad.
alter table event_ticket_types add column has_seat_map boolean not null default false;

-- Backfill: preserva el comportamiento actual de los eventos ya existentes
-- ("tiene asientos" = ya tiene >=1 fila en event_seats).
update event_ticket_types ett
set has_seat_map = true
where exists (select 1 from event_seats es where es.ticket_type_id = ett.id);
