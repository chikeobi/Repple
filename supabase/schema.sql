create table if not exists public.repple_appointments (
  id bigint generated always as identity primary key,
  generated_id text,
  legacy_generated_id text,
  customer_name text,
  vehicle text,
  appointment_time text,
  salesperson_name text,
  dealership_name text,
  address text,
  vehicle_image_url text,
  vehicle_image_provider text,
  vehicle_image_source_page_url text,
  vehicle_image_confidence text,
  created_at timestamptz default now()
);

alter table public.repple_appointments
  drop constraint if exists repple_appointments_generated_id_format;

alter table public.repple_appointments
  add constraint repple_appointments_generated_id_format
  check (
    generated_id is null
    or generated_id ~ '^[A-Z0-9]{6}$'
  );

alter table public.repple_appointments
  drop constraint if exists repple_appointments_legacy_generated_id_format;

alter table public.repple_appointments
  add constraint repple_appointments_legacy_generated_id_format
  check (
    legacy_generated_id is null
    or legacy_generated_id ~ '^rep_[a-z0-9]+$'
  );

create unique index if not exists repple_appointments_generated_id_key
on public.repple_appointments (generated_id)
where generated_id is not null;

create unique index if not exists repple_appointments_legacy_generated_id_key
on public.repple_appointments (legacy_generated_id)
where legacy_generated_id is not null;

alter table public.repple_appointments enable row level security;

drop policy if exists "Allow all operations" on public.repple_appointments;
drop policy if exists "Public can read appointments" on public.repple_appointments;
drop policy if exists "Public can insert appointments" on public.repple_appointments;

create policy "Public can read appointments"
on public.repple_appointments
for select
using (generated_id is not null or legacy_generated_id is not null);

create policy "Public can insert appointments"
on public.repple_appointments
for insert
with check (
  generated_id ~ '^[A-Z0-9]{6}$'
  and legacy_generated_id is null
  and customer_name is not null
  and vehicle is not null
  and appointment_time is not null
  and salesperson_name is not null
  and dealership_name is not null
  and address is not null
);

create table if not exists public.repple_vehicle_image_cache (
  id bigint generated always as identity primary key,
  cache_key text not null,
  vehicle_query text not null,
  body_style text,
  provider text not null,
  image_url text not null,
  source_page_url text,
  created_at timestamptz default now()
);

create unique index if not exists repple_vehicle_image_cache_cache_key_key
on public.repple_vehicle_image_cache (cache_key);

alter table public.repple_vehicle_image_cache enable row level security;

drop policy if exists "Public can read vehicle image cache" on public.repple_vehicle_image_cache;
drop policy if exists "Public can insert vehicle image cache" on public.repple_vehicle_image_cache;

create policy "Public can read vehicle image cache"
on public.repple_vehicle_image_cache
for select
using (cache_key is not null);

create policy "Public can insert vehicle image cache"
on public.repple_vehicle_image_cache
for insert
with check (
  cache_key is not null
  and vehicle_query is not null
  and provider is not null
  and image_url is not null
);
