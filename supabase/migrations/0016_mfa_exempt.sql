-- Demo accounts (and only demo accounts) skip MFA entirely — set per-profile,
-- never inferred from email domain, so a self-registered account can never
-- opt itself out of MFA.
alter table profiles add column mfa_exempt boolean not null default false;
