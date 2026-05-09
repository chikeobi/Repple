create table if not exists public.repple_appointments (
  id bigint generated always as identity primary key,
  generated_id text,
  customer_name text,
  vehicle text,
  appointment_time text,
  salesperson_name text,
  dealership_name text,
  address text,
  created_at timestamptz default now()
);

alter table public.repple_appointments
  drop constraint if exists repple_appointments_generated_id_format;

alter table public.repple_appointments
  add constraint repple_appointments_generated_id_format
  check (
    generated_id is null
    or generated_id ~ '^[A-Z0-9]{5,7}$'
  );

create unique index if not exists repple_appointments_generated_id_key
on public.repple_appointments (generated_id)
where generated_id is not null;

alter table public.repple_appointments enable row level security;

drop policy if exists "Allow all operations" on public.repple_appointments;
drop policy if exists "Public can read appointments" on public.repple_appointments;
drop policy if exists "Public can insert appointments" on public.repple_appointments;

create policy "Public can read appointments"
on public.repple_appointments
for select
using (generated_id is not null);

create policy "Public can insert appointments"
on public.repple_appointments
for insert
with check (
  generated_id ~ '^[A-Z0-9]{5,7}$'
  and customer_name is not null
  and vehicle is not null
  and appointment_time is not null
  and salesperson_name is not null
  and dealership_name is not null
  and address is not null
);
