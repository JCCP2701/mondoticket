alter table organizations
  add column payment_terms int not null default 15,
  add column contract_notes text;
