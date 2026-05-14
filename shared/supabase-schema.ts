import type { OrganizationSubscriptionStatus } from './billing';

export const MEMBERSHIP_ROLES = ['owner', 'admin', 'rep'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const APPOINTMENT_STATUSES = [
  'generated',
  'opened',
  'confirmed',
  'reschedule_requested',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_EVENT_TYPES = [
  'appointment_created',
  'card_opened',
  'message_copied',
  'card_viewed',
  'confirmed',
  'reschedule_requested',
] as const;
export type AppointmentEventType = (typeof APPOINTMENT_EVENT_TYPES)[number];

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  brand_color: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: OrganizationSubscriptionStatus | null;
  subscription_current_period_ends_at: string | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  created_at: string;
};

export type MembershipRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  role: MembershipRole;
  created_at: string;
};

export type OrganizationSettingsRow = {
  id: string;
  organization_id: string;
  default_sms_template: string | null;
  card_theme: string | null;
  compliance_footer: string | null;
  rep_join_code_hash: string | null;
  rep_join_code_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentRow = {
  id: string;
  organization_id: string;
  created_by_profile_id: string;
  short_id: string;
  customer_name: string;
  customer_phone_optional: string | null;
  vehicle: string;
  vin_optional: string | null;
  vehicle_image_url: string | null;
  appointment_time: string;
  salesperson_name: string;
  salesperson_title: string | null;
  salesperson_avatar_url: string | null;
  dealership_name: string;
  dealership_address: string;
  public_url: string;
  created_at: string;
  opened_at: string | null;
  confirmed_at: string | null;
  reschedule_requested_at: string | null;
  reschedule_note: string | null;
  status: AppointmentStatus;
};

export type AppointmentEventRow = {
  id: string;
  appointment_id: string;
  organization_id: string;
  event_type: AppointmentEventType;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type PublicAppointmentRow = Pick<
  AppointmentRow,
  | 'short_id'
  | 'customer_name'
  | 'vehicle'
  | 'vehicle_image_url'
  | 'appointment_time'
  | 'salesperson_name'
  | 'salesperson_title'
  | 'salesperson_avatar_url'
  | 'dealership_name'
  | 'dealership_address'
  | 'public_url'
  | 'created_at'
  | 'opened_at'
  | 'confirmed_at'
  | 'reschedule_requested_at'
  | 'reschedule_note'
  | 'status'
> & {
  dealership_logo_url?: string | null;
  dealership_brand_color?: string | null;
};
