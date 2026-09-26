create type public.voice_session_status as enum (
  'ACTIVE',
  'COMPLETED',
  'FAILED'
);

create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id)
    on delete cascade,

  customer_id uuid null,

  lead_id uuid null,

  session_status public.voice_session_status
    not null default 'ACTIVE',

  state jsonb
    not null default '{}'::jsonb,

  started_at timestamptz
    not null default now(),

  ended_at timestamptz null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint voice_sessions_business_customer_fkey
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete set null,

  constraint voice_sessions_business_lead_fkey
    foreign key (business_id, lead_id)
    references public.leads (business_id, id)
    on delete set null
);

create index voice_sessions_business_id_idx
  on public.voice_sessions (business_id);

create index voice_sessions_customer_id_idx
  on public.voice_sessions (customer_id);

create index voice_sessions_lead_id_idx
  on public.voice_sessions (lead_id);

create index voice_sessions_status_idx
  on public.voice_sessions (session_status);

create index voice_sessions_started_at_idx
  on public.voice_sessions (started_at);

alter table public.voice_sessions enable row level security;

grant select, insert, update, delete
on public.voice_sessions
to authenticated;

create policy "voice_sessions_select"
on public.voice_sessions
for select
to authenticated
using (
  public.get_my_role() = 'PLATFORM_ADMIN'
  or business_id = public.get_my_business_id()
);

create policy "voice_sessions_insert"
on public.voice_sessions
for insert
to authenticated
with check (
  public.get_my_role() = 'PLATFORM_ADMIN'
  or business_id = public.get_my_business_id()
);

create policy "voice_sessions_update"
on public.voice_sessions
for update
to authenticated
using (
  public.get_my_role() = 'PLATFORM_ADMIN'
  or business_id = public.get_my_business_id()
)
with check (
  public.get_my_role() = 'PLATFORM_ADMIN'
  or business_id = public.get_my_business_id()
);

create policy "voice_sessions_delete"
on public.voice_sessions
for delete
to authenticated
using (
  public.get_my_role() = 'PLATFORM_ADMIN'
  or business_id = public.get_my_business_id()
);