-- Per-signature opt-in to list display name on the petition
alter table public.signatures
  add column if not exists show_name boolean not null default false;
