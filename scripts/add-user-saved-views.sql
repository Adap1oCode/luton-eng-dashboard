-- scripts/add-user-saved-views.sql
-- Create table for per-user saved views (no sharing)

create table if not exists public.user_saved_views (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  name text not null,
  description text,
  is_default boolean not null default false,
  owner_auth_id uuid not null,
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_saved_views_owner_table
  on public.user_saved_views(owner_auth_id, table_id);

create unique index if not exists uq_user_saved_views_default
  on public.user_saved_views(owner_auth_id, table_id)
  where is_default = true;

alter table public.user_saved_views enable row level security;

do $$ begin
  create policy "owner can read own views"
    on public.user_saved_views
    for select
    using (owner_auth_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owner can write own views"
    on public.user_saved_views
    for insert with check (owner_auth_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owner can update own views"
    on public.user_saved_views
    for update using (owner_auth_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owner can delete own views"
    on public.user_saved_views
    for delete using (owner_auth_id = auth.uid());
exception when duplicate_object then null; end $$;
