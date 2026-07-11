-- ============================================================
--  BioCake — Notificări push (PWA admin)
--  Rulează în Supabase → SQL Editor
-- ============================================================

-- Tabel pentru abonamentele push ale dispozitivelor admin
create table if not exists public.push_subscriptions (
    id         uuid primary key default gen_random_uuid(),
    endpoint   text        not null unique,
    p256dh     text        not null,
    auth       text        not null,
    created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Doar utilizatorii autentificați (adminul logat) pot gestiona abonamente.
-- Edge Function-ul folosește service_role și ocolește RLS pentru a citi/trimite.
drop policy if exists "auth insert subscriptions" on public.push_subscriptions;
create policy "auth insert subscriptions"
    on public.push_subscriptions for insert
    to authenticated with check (true);

drop policy if exists "auth update subscriptions" on public.push_subscriptions;
create policy "auth update subscriptions"
    on public.push_subscriptions for update
    to authenticated using (true) with check (true);

drop policy if exists "auth select subscriptions" on public.push_subscriptions;
create policy "auth select subscriptions"
    on public.push_subscriptions for select
    to authenticated using (true);
