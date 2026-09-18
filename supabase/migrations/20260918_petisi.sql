-- Petisi: campaigns + email-verified signatures
create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  demand text not null,
  target_label text not null default '',
  isu_id integer,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  show_public_names boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  display_name text not null,
  email_normalized text not null,
  kecamatan text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, email_normalized)
);

create index if not exists signatures_campaign_verified_idx
  on public.signatures (campaign_id)
  where verified_at is not null;

alter table public.campaigns enable row level security;
alter table public.signatures enable row level security;

drop policy if exists "campaigns_select_public" on public.campaigns;
create policy "campaigns_select_public"
  on public.campaigns for select
  to anon, authenticated
  using (true);

drop policy if exists "signatures_select_verified" on public.signatures;
create policy "signatures_select_verified"
  on public.signatures for select
  to anon, authenticated
  using (verified_at is not null);

drop policy if exists "signatures_insert_anon" on public.signatures;
create policy "signatures_insert_anon"
  on public.signatures for insert
  to anon, authenticated
  with check (verified_at is null);

create or replace function public.verify_my_signature(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(auth.jwt() ->> 'email');
  if v_email is null or v_email = '' then
    raise exception 'not authenticated';
  end if;
  update public.signatures
    set verified_at = coalesce(verified_at, now())
    where campaign_id = p_campaign_id
      and email_normalized = v_email;
end;
$$;

revoke all on function public.verify_my_signature(uuid) from public;
grant execute on function public.verify_my_signature(uuid) to authenticated;
