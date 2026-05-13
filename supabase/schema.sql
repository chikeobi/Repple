create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'membership_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.membership_role as enum ('owner', 'admin', 'rep');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'appointment_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.appointment_status as enum (
      'generated',
      'opened',
      'confirmed',
      'reschedule_requested'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'appointment_event_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.appointment_event_type as enum (
      'appointment_created',
      'card_opened',
      'message_copied',
      'card_viewed',
      'confirmed',
      'reschedule_requested'
    );
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  logo_url text,
  address text,
  phone text,
  brand_color text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text not null default 'inactive',
  subscription_current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organizations_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_brand_color_format
    check (
      brand_color is null
      or brand_color ~ '^#[0-9A-Fa-f]{6}$'
    ),
  constraint organizations_subscription_status_check
    check (
      subscription_status in (
        'inactive',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired'
      )
    )
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  constraint memberships_org_profile_unique unique (organization_id, profile_id)
);

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  default_sms_template text,
  card_theme text,
  compliance_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_settings_org_unique unique (organization_id)
);

drop trigger if exists set_organization_settings_updated_at on public.organization_settings;
create trigger set_organization_settings_updated_at
before update on public.organization_settings
for each row
execute function public.set_updated_at();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and profile_id = auth.uid()
  )
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
  )
$$;

create or replace function public.is_organization_subscription_active(input_status text)
returns boolean
language sql
stable
as $$
  select input_status in ('active', 'trialing')
$$;

create or replace function public.organization_can_generate_appointments(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organizations
    where id = target_organization_id
      and public.is_organization_subscription_active(subscription_status)
  )
$$;

create or replace function public.prevent_client_billing_field_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
    and (
      new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.subscription_status is distinct from old.subscription_status
      or new.subscription_current_period_ends_at is distinct from old.subscription_current_period_ends_at
    ) then
    raise exception 'Billing fields can only be updated server-side.';
  end if;

  return new;
end;
$$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  short_id text not null unique,
  customer_name text not null,
  customer_phone_optional text,
  vehicle text not null,
  vin_optional text,
  vehicle_image_url text,
  appointment_time text not null,
  salesperson_name text not null,
  salesperson_title text,
  salesperson_avatar_url text,
  dealership_name text not null,
  dealership_address text not null,
  public_url text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  confirmed_at timestamptz,
  reschedule_requested_at timestamptz,
  reschedule_note text,
  status public.appointment_status not null default 'generated',
  constraint appointments_short_id_format
    check (short_id ~ '^[A-Z0-9]{6}$'),
  constraint appointments_vin_format
    check (
      vin_optional is null
      or upper(vin_optional) ~ '^[A-HJ-NPR-Z0-9]{17}$'
    )
);

drop trigger if exists protect_organization_billing_fields on public.organizations;
create trigger protect_organization_billing_fields
before update on public.organizations
for each row
execute function public.prevent_client_billing_field_updates();

create unique index if not exists appointments_id_organization_id_key
on public.appointments (id, organization_id);

create index if not exists appointments_organization_id_idx
on public.appointments (organization_id);

create index if not exists appointments_created_by_profile_id_idx
on public.appointments (created_by_profile_id);

create index if not exists appointments_created_at_idx
on public.appointments (created_at desc);

create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  organization_id uuid not null,
  event_type public.appointment_event_type not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint appointment_events_appointment_org_fk
    foreign key (appointment_id, organization_id)
    references public.appointments (id, organization_id)
    on delete cascade
);

create index if not exists appointment_events_appointment_id_idx
on public.appointment_events (appointment_id, created_at desc);

create index if not exists appointment_events_organization_id_idx
on public.appointment_events (organization_id, created_at desc);

create table if not exists public.appointment_public_action_attempts (
  id uuid primary key default gen_random_uuid(),
  appointment_short_id text not null,
  action text not null,
  fingerprint_hash text not null,
  created_at timestamptz not null default now(),
  constraint appointment_public_action_attempts_short_id_format
    check (appointment_short_id ~ '^[A-Z0-9]{6}$'),
  constraint appointment_public_action_attempts_action_check
    check (action in ('viewed', 'confirmed', 'reschedule_requested'))
);

create index if not exists appointment_public_action_attempts_lookup_idx
on public.appointment_public_action_attempts (
  appointment_short_id,
  action,
  fingerprint_hash,
  created_at desc
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.organization_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;
alter table public.appointment_public_action_attempts enable row level security;

drop policy if exists "Organization members can read organizations" on public.organizations;
drop policy if exists "Organization admins can update organizations" on public.organizations;

create policy "Organization members can read organizations"
on public.organizations
for select
using (public.is_organization_member(id));

create policy "Organization admins can update organizations"
on public.organizations
for update
using (public.is_organization_admin(id))
with check (public.is_organization_admin(id));

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
using (id = public.current_profile_id());

create policy "Users can insert own profile"
on public.profiles
for insert
with check (id = public.current_profile_id());

create policy "Users can update own profile"
on public.profiles
for update
using (id = public.current_profile_id())
with check (id = public.current_profile_id());

drop policy if exists "Organization members can read memberships" on public.memberships;
drop policy if exists "Organization admins can manage memberships" on public.memberships;

create policy "Organization members can read memberships"
on public.memberships
for select
using (public.is_organization_member(organization_id));

create policy "Organization admins can manage memberships"
on public.memberships
for all
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization members can read settings" on public.organization_settings;
drop policy if exists "Organization admins can manage settings" on public.organization_settings;

create policy "Organization members can read settings"
on public.organization_settings
for select
using (public.is_organization_member(organization_id));

create policy "Organization admins can manage settings"
on public.organization_settings
for all
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization members can read appointments" on public.appointments;
drop policy if exists "Organization members can insert appointments" on public.appointments;
drop policy if exists "Organization members can update appointments" on public.appointments;
drop policy if exists "Organization admins or creators can update appointments" on public.appointments;

create policy "Organization members can read appointments"
on public.appointments
for select
using (public.is_organization_member(organization_id));

create policy "Organization members can insert appointments"
on public.appointments
for insert
with check (
  public.is_organization_member(organization_id)
  and created_by_profile_id = public.current_profile_id()
  and public.organization_can_generate_appointments(organization_id)
);

drop policy if exists "Organization members can read appointment events" on public.appointment_events;

create policy "Organization members can read appointment events"
on public.appointment_events
for select
using (public.is_organization_member(organization_id));

grant usage on type public.membership_role to authenticated;
grant usage on type public.appointment_event_type to authenticated;
grant usage on type public.appointment_status to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
grant select, insert on public.appointments to authenticated;
grant select on public.appointment_events to authenticated;

create or replace function public.can_update_appointment(
  target_organization_id uuid,
  target_created_by_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
  )
  or target_created_by_profile_id = auth.uid()
$$;

create policy "Organization admins or creators can update appointments"
on public.appointments
for update
using (public.can_update_appointment(organization_id, created_by_profile_id))
with check (public.can_update_appointment(organization_id, created_by_profile_id));

drop function if exists public.record_appointment_event(text, public.appointment_event_type, jsonb);
create function public.record_appointment_event(
  input_short_id text,
  input_event_type public.appointment_event_type,
  input_metadata_json jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_short_id text := upper(trim(coalesce(input_short_id, '')));
  appointment_record public.appointments%rowtype;
begin
  if normalized_short_id = '' then
    return false;
  end if;

  if auth.role() = 'anon'
    and input_event_type not in (
      'card_opened'::public.appointment_event_type,
      'card_viewed'::public.appointment_event_type,
      'confirmed'::public.appointment_event_type,
      'reschedule_requested'::public.appointment_event_type
    ) then
    return false;
  end if;

  select *
  into appointment_record
  from public.appointments
  where short_id = normalized_short_id
  limit 1;

  if not found then
    return false;
  end if;

  if auth.role() <> 'anon'
    and not public.is_organization_member(appointment_record.organization_id) then
    return false;
  end if;

  insert into public.appointment_events (
    appointment_id,
    organization_id,
    event_type,
    metadata_json
  )
  values (
    appointment_record.id,
    appointment_record.organization_id,
    input_event_type,
    coalesce(input_metadata_json, '{}'::jsonb)
      || jsonb_build_object('short_id', appointment_record.short_id)
  );

  return true;
end;
$$;

grant execute on function public.record_appointment_event(text, public.appointment_event_type, jsonb) to authenticated;

drop function if exists public.allow_public_appointment_action(text, text, text);
create function public.allow_public_appointment_action(
  input_short_id text,
  input_action text,
  input_fingerprint_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_short_id text := upper(trim(coalesce(input_short_id, '')));
  normalized_action text := trim(coalesce(input_action, ''));
  normalized_fingerprint_hash text := trim(coalesce(input_fingerprint_hash, ''));
  attempts_for_fingerprint integer := 0;
  attempts_for_appointment integer := 0;
begin
  if normalized_short_id = '' then
    return false;
  end if;

  if normalized_action not in ('viewed', 'confirmed', 'reschedule_requested') then
    return false;
  end if;

  if normalized_fingerprint_hash = '' then
    return false;
  end if;

  select count(*)
  into attempts_for_fingerprint
  from public.appointment_public_action_attempts
  where appointment_short_id = normalized_short_id
    and action = normalized_action
    and fingerprint_hash = normalized_fingerprint_hash
    and created_at >= now() - interval '15 minutes';

  if attempts_for_fingerprint >= 8 then
    return false;
  end if;

  select count(*)
  into attempts_for_appointment
  from public.appointment_public_action_attempts
  where appointment_short_id = normalized_short_id
    and action = normalized_action
    and created_at >= now() - interval '1 minute';

  if attempts_for_appointment >= 30 then
    return false;
  end if;

  insert into public.appointment_public_action_attempts (
    appointment_short_id,
    action,
    fingerprint_hash
  )
  values (
    normalized_short_id,
    normalized_action,
    normalized_fingerprint_hash
  );

  return true;
end;
$$;

grant execute on function public.allow_public_appointment_action(text, text, text) to anon, authenticated;

drop function if exists public.bootstrap_organization(text, text, text);
create function public.bootstrap_organization(
  input_name text,
  input_slug text,
  input_website_url text default null
)
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  membership_id uuid,
  membership_role public.membership_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := trim(coalesce(input_name, ''));
  normalized_slug text := lower(trim(coalesce(input_slug, '')));
  normalized_website_url text := nullif(trim(coalesce(input_website_url, '')), '');
  next_organization_id uuid;
  next_membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if normalized_name = '' then
    raise exception 'Organization name is required.';
  end if;

  if normalized_slug = '' or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Organization slug must be lowercase letters, numbers, and dashes only.';
  end if;

  if exists (
    select 1
    from public.memberships
    where profile_id = current_user_id
  ) then
    raise exception 'Organization bootstrap is only available before the first membership exists.';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    title
  )
  values (
    current_user_id,
    coalesce(auth.jwt()->>'email', ''),
    nullif(
      coalesce(
        auth.jwt()->'user_metadata'->>'full_name',
        auth.jwt()->'user_metadata'->>'name',
        ''
      ),
      ''
    ),
    nullif(auth.jwt()->'user_metadata'->>'avatar_url', ''),
    nullif(auth.jwt()->'user_metadata'->>'title', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    title = coalesce(public.profiles.title, excluded.title);

  insert into public.organizations (
    name,
    slug,
    website_url
  )
  values (
    normalized_name,
    normalized_slug,
    normalized_website_url
  )
  returning id, name, slug
  into next_organization_id, organization_name, organization_slug;

  insert into public.memberships (
    organization_id,
    profile_id,
    role
  )
  values (
    next_organization_id,
    current_user_id,
    'owner'
  )
  returning id, role
  into next_membership_id, membership_role;

  insert into public.organization_settings (
    organization_id
  )
  values (
    next_organization_id
  )
  on conflict (organization_id) do nothing;

  organization_id := next_organization_id;
  membership_id := next_membership_id;
  return next;
end;
$$;

grant execute on function public.bootstrap_organization(text, text, text) to authenticated;

drop function if exists public.get_public_appointment_by_short_id(text);
create function public.get_public_appointment_by_short_id(input_short_id text)
returns table (
  short_id text,
  customer_name text,
  vehicle text,
  vehicle_image_url text,
  appointment_time text,
  salesperson_name text,
  salesperson_title text,
  salesperson_avatar_url text,
  dealership_name text,
  dealership_logo_url text,
  dealership_brand_color text,
  dealership_address text,
  public_url text,
  created_at timestamptz,
  opened_at timestamptz,
  confirmed_at timestamptz,
  reschedule_requested_at timestamptz,
  reschedule_note text,
  status public.appointment_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    appointments.short_id,
    appointments.customer_name,
    appointments.vehicle,
    appointments.vehicle_image_url,
    appointments.appointment_time,
    appointments.salesperson_name,
    appointments.salesperson_title,
    appointments.salesperson_avatar_url,
    appointments.dealership_name,
    organizations.logo_url as dealership_logo_url,
    organizations.brand_color as dealership_brand_color,
    appointments.dealership_address,
    appointments.public_url,
    appointments.created_at,
    appointments.opened_at,
    appointments.confirmed_at,
    appointments.reschedule_requested_at,
    appointments.reschedule_note,
    appointments.status
  from public.appointments
  left join public.organizations
    on organizations.id = appointments.organization_id
  where appointments.short_id = upper(trim(input_short_id))
  limit 1
$$;

grant execute on function public.get_public_appointment_by_short_id(text) to anon, authenticated;

drop function if exists public.update_public_appointment_status(text, text, text);
create function public.update_public_appointment_status(
  input_short_id text,
  input_action text,
  input_reschedule_note text default null
)
returns table (
  short_id text,
  customer_name text,
  vehicle text,
  vehicle_image_url text,
  appointment_time text,
  salesperson_name text,
  salesperson_title text,
  salesperson_avatar_url text,
  dealership_name text,
  dealership_logo_url text,
  dealership_brand_color text,
  dealership_address text,
  public_url text,
  created_at timestamptz,
  opened_at timestamptz,
  confirmed_at timestamptz,
  reschedule_requested_at timestamptz,
  reschedule_note text,
  status public.appointment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_short_id text := upper(trim(coalesce(input_short_id, '')));
  normalized_action text := trim(coalesce(input_action, ''));
  normalized_reschedule_note text := nullif(trim(coalesce(input_reschedule_note, '')), '');
  existing_appointment public.appointments%rowtype;
begin
  if normalized_short_id = '' then
    raise exception 'Appointment short ID is required.';
  end if;

  if normalized_action not in ('viewed', 'confirmed', 'reschedule_requested') then
    raise exception 'Invalid appointment status action.';
  end if;

  select *
  into existing_appointment
  from public.appointments
  where short_id = normalized_short_id
  limit 1;

  if not found then
    return;
  end if;

  return query
  with updated_appointments as (
    update public.appointments
    set
      opened_at = case
        when normalized_action = 'viewed' and opened_at is null then now()
        else opened_at
      end,
      confirmed_at = case
        when normalized_action = 'confirmed' and confirmed_at is null then now()
        else confirmed_at
      end,
      reschedule_requested_at = case
        when normalized_action = 'reschedule_requested' and reschedule_requested_at is null then now()
        else reschedule_requested_at
      end,
      reschedule_note = case
        when normalized_action = 'reschedule_requested' and normalized_reschedule_note is not null
          then normalized_reschedule_note
        else public.appointments.reschedule_note
      end,
      status = case
        when normalized_action = 'confirmed' then 'confirmed'::public.appointment_status
        when normalized_action = 'reschedule_requested' then 'reschedule_requested'::public.appointment_status
        when public.appointments.status = 'generated' then 'opened'::public.appointment_status
        else public.appointments.status
      end
    where public.appointments.short_id = normalized_short_id
    returning public.appointments.*
  )
  select
    updated_appointments.short_id,
    updated_appointments.customer_name,
    updated_appointments.vehicle,
    updated_appointments.vehicle_image_url,
    updated_appointments.appointment_time,
    updated_appointments.salesperson_name,
    updated_appointments.salesperson_title,
    updated_appointments.salesperson_avatar_url,
    updated_appointments.dealership_name,
    organizations.logo_url as dealership_logo_url,
    organizations.brand_color as dealership_brand_color,
    updated_appointments.dealership_address,
    updated_appointments.public_url,
    updated_appointments.created_at,
    updated_appointments.opened_at,
    updated_appointments.confirmed_at,
    updated_appointments.reschedule_requested_at,
    updated_appointments.reschedule_note,
    updated_appointments.status
  from updated_appointments
  left join public.organizations
    on organizations.id = updated_appointments.organization_id;

  if normalized_action = 'viewed' and existing_appointment.opened_at is null then
    perform public.record_appointment_event(
      normalized_short_id,
      'card_opened'::public.appointment_event_type,
      jsonb_build_object('source', 'public_card')
    );
    perform public.record_appointment_event(
      normalized_short_id,
      'card_viewed'::public.appointment_event_type,
      jsonb_build_object('source', 'public_card')
    );
  elsif normalized_action = 'confirmed' and existing_appointment.confirmed_at is null then
    perform public.record_appointment_event(
      normalized_short_id,
      'confirmed'::public.appointment_event_type,
      jsonb_build_object('source', 'public_card')
    );
  elsif normalized_action = 'reschedule_requested'
    and existing_appointment.reschedule_requested_at is null then
    perform public.record_appointment_event(
      normalized_short_id,
      'reschedule_requested'::public.appointment_event_type,
      jsonb_build_object(
        'source',
        'public_card',
        'reschedule_note',
        coalesce(normalized_reschedule_note, '')
      )
    );
  end if;
end;
$$;

grant execute on function public.update_public_appointment_status(text, text, text) to anon, authenticated;

-- Legacy compatibility tables remain in place until the runtime is migrated
-- to the production organization-scoped schema in the next section.

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
  viewed_at timestamptz,
  confirmed_at timestamptz,
  reschedule_requested_at timestamptz,
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
drop policy if exists "Public can update appointment statuses" on public.repple_appointments;
revoke all on public.repple_appointments from anon, authenticated;

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
revoke all on public.repple_vehicle_image_cache from anon, authenticated;
