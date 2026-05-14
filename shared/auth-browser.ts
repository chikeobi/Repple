import type { SupabaseClient, User } from '@supabase/supabase-js';

import type {
  BootstrapOrganizationInput,
  JoinOrganizationInput,
  OrganizationMembership,
  WorkspaceOrganizationSettings,
  WorkspaceProfile,
} from './auth-contract';
import type { OrganizationRow } from './supabase-schema';

type BrowserSupabaseClient = SupabaseClient;

type MembershipQueryRow = {
  id: string;
  role: OrganizationMembership['role'];
  organization: OrganizationRow | OrganizationRow[] | null;
};

function getUserFullName(user: User) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : '';

  return fullName.trim() || null;
}

function getUserAvatarUrl(user: User) {
  const metadata = user.user_metadata ?? {};
  const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : '';

  return avatarUrl.trim() || null;
}

function normalizeOrganization(row: MembershipQueryRow['organization']) {
  if (!row) {
    return null;
  }

  return Array.isArray(row) ? row[0] ?? null : row;
}

export async function getOrganizationSettings(
  client: BrowserSupabaseClient,
  organizationId: string,
): Promise<WorkspaceOrganizationSettings | null> {
  const { data, error } = await client
    .from('organization_settings')
    .select(
      'id, organization_id, default_sms_template, card_theme, compliance_footer, rep_join_code_hash, rep_join_code_updated_at',
    )
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceOrganizationSettings | null) ?? null;
}

export function slugifyOrganizationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function upsertProfileFromUser(
  client: BrowserSupabaseClient,
  user: User,
): Promise<WorkspaceProfile> {
  const payload = {
    id: user.id,
    email: user.email?.trim() ?? '',
    full_name: getUserFullName(user),
    avatar_url: getUserAvatarUrl(user),
  };

  const { data, error } = await client
    .from('profiles')
    .upsert(payload)
    .select('id, email, full_name, avatar_url, title')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to sync your Repple profile.');
  }

  return data as WorkspaceProfile;
}

export async function listMembershipsForProfile(
  client: BrowserSupabaseClient,
  profileId: string,
): Promise<OrganizationMembership[]> {
  const { data, error } = await client
    .from('memberships')
    .select(
      'id, role, organization:organizations(id, name, slug, website_url, logo_url, address, phone, brand_color, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_ends_at, created_at)',
    )
    .eq('profile_id', profileId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MembershipQueryRow[])
    .map((row) => {
      const organization = normalizeOrganization(row.organization);

      if (!organization) {
        return null;
      }

      return {
        id: row.id,
        role: row.role,
        organization,
      } satisfies OrganizationMembership;
    })
    .filter((membership): membership is OrganizationMembership => Boolean(membership));
}

export function resolveActiveMembership(
  memberships: OrganizationMembership[],
  activeOrganizationId: string | null,
) {
  if (memberships.length === 0) {
    return null;
  }

  const explicitMatch = memberships.find(
    (membership) => membership.organization.id === activeOrganizationId,
  );

  if (explicitMatch) {
    return explicitMatch;
  }

  return memberships[0];
}

export async function bootstrapOrganization(
  client: BrowserSupabaseClient,
  input: BootstrapOrganizationInput,
) {
  const { error } = await client.rpc('bootstrap_organization', {
    input_name: input.name.trim(),
    input_slug: slugifyOrganizationName(input.slug || input.name),
    input_website_url: input.websiteUrl?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function generateOrganizationRepJoinCode(
  client: BrowserSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await client.rpc('generate_organization_rep_join_code', {
    input_organization_id: organizationId,
  });

  if (error || typeof data !== 'string' || !data.trim()) {
    throw new Error(error?.message ?? 'Unable to generate a rep join code.');
  }

  return data.trim();
}

export async function joinOrganizationWithCode(
  client: BrowserSupabaseClient,
  input: JoinOrganizationInput,
) {
  const { error } = await client.rpc('join_organization_with_code', {
    input_slug: input.slug.trim().toLowerCase(),
    input_code: input.code.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }
}
