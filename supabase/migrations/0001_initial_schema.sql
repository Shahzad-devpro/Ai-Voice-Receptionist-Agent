-- ============================================================
-- AI Voice Receptionist SaaS
-- Migration: 0001_initial_schema
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type public.industry_type as enum (
  'HVAC',
  'CLEANING',
  'DENTAL'
);

create type public.user_role as enum (
  'PLATFORM_ADMIN',
  'CLIENT_USER'
);

create type public.business_status as enum (
  'ACTIVE',
  'INACTIVE'
);

create type public.lead_status as enum (
  'NEW',
  'BOOKED',
  'COMPLETED',
  'CANCELLED'
);

create type public.appointment_status as enum (
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED'
);

-- ============================================================
-- BUSINESSES
-- ============================================================

create table public.businesses (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  industry public.industry_type not null,

  country text not null,
  phone text,
  email text,
  address text,

  timezone text not null,
  currency text not null,
  locale text not null,

  service_area text,

  business_hours jsonb not null default '{}'::jsonb,

  ai_instructions text,

  status public.business_status not null default 'ACTIVE',

  logo_url text,
  primary_color text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  business_id uuid references public.businesses(id) on delete set null,

  email text not null,
  name text,

  role public.user_role not null default 'CLIENT_USER',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  name text not null,

  phone text not null,
  email text,
  address text,

  created_at timestamptz not null default now(),

  unique (business_id, phone)
);

-- ============================================================
-- SERVICES
-- ============================================================

create table public.services (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  name text not null,
  description text,

  duration_minutes integer not null
    check (duration_minutes > 0),

  price numeric(10, 2),

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

-- ============================================================
-- LEADS
-- ============================================================

create table public.leads (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  customer_id uuid not null
    references public.customers(id) on delete cascade,

  service_requested text not null,
  description text,

  status public.lead_status not null default 'NEW',

  created_at timestamptz not null default now()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================

create table public.appointments (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  customer_id uuid not null
    references public.customers(id) on delete cascade,

  service_id uuid not null
    references public.services(id) on delete restrict,

  start_time timestamptz not null,
  end_time timestamptz not null,

  status public.appointment_status not null default 'SCHEDULED',

  created_at timestamptz not null default now(),

  check (end_time > start_time)
);

-- ============================================================
-- CALLS
-- ============================================================

create table public.calls (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  customer_id uuid
    references public.customers(id) on delete set null,

  caller_phone text,

  duration_seconds integer
    check (duration_seconds is null or duration_seconds >= 0),

  transcript text,
  summary text,
  outcome text,

  appointment_id uuid
    references public.appointments(id) on delete set null,

  lead_id uuid
    references public.leads(id) on delete set null,

  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz not null default now()
);

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================

create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  title text not null,
  content text not null,

  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_profiles_business_id
  on public.profiles(business_id);

create index idx_customers_business_id
  on public.customers(business_id);

create index idx_leads_business_id
  on public.leads(business_id);

create index idx_leads_customer_id
  on public.leads(customer_id);

create index idx_services_business_id
  on public.services(business_id);

create index idx_appointments_business_id
  on public.appointments(business_id);

create index idx_appointments_customer_id
  on public.appointments(customer_id);

create index idx_appointments_start_time
  on public.appointments(start_time);

create index idx_calls_business_id
  on public.calls(business_id);

create index idx_calls_customer_id
  on public.calls(customer_id);

create index idx_knowledge_base_business_id
  on public.knowledge_base(business_id);