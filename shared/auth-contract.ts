import type {
  MembershipRole,
  OrganizationRow,
  OrganizationSettingsRow,
  ProfileRow,
} from './supabase-schema';

export type AuthSessionUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type AuthSession = {
  access_token: string;
  user: AuthSessionUser;
};

export type WorkspaceProfile = Pick<
  ProfileRow,
  'id' | 'email' | 'full_name' | 'avatar_url' | 'title'
>;

export type OrganizationMembership = {
  id: string;
  role: MembershipRole;
  organization: OrganizationRow;
};

export type WorkspaceOrganizationSettings = Pick<
  OrganizationSettingsRow,
  | 'id'
  | 'organization_id'
  | 'default_sms_template'
  | 'card_theme'
  | 'compliance_footer'
  | 'rep_join_code_hash'
  | 'rep_join_code_updated_at'
  | 'heygen_avatar_id'
  | 'heygen_voice_id'
  | 'heygen_scene_template_key'
>;

export type WorkspaceSettingsInput = {
  organizationName: string;
  organizationAddress: string;
  organizationPhone: string;
  organizationWebsiteUrl: string;
  organizationLogoUrl: string;
  organizationBrandColor: string;
  defaultSmsTemplate: string;
  heygenAvatarId: string;
  heygenVoiceId: string;
  heygenSceneTemplateKey: string;
  profileFullName: string;
  profileTitle: string;
  profileAvatarUrl: string;
};

export type WorkspaceContext = {
  session: AuthSession;
  profile: WorkspaceProfile;
  memberships: OrganizationMembership[];
  activeMembership: OrganizationMembership;
  organizationSettings: WorkspaceOrganizationSettings | null;
};

export type WorkspaceBootstrapContext = {
  session: AuthSession;
  profile: WorkspaceProfile;
  memberships: OrganizationMembership[];
  activeMembership: OrganizationMembership | null;
  organizationSettings: WorkspaceOrganizationSettings | null;
};

export type BootstrapOrganizationInput = {
  name: string;
  slug: string;
  websiteUrl?: string;
};

export type JoinOrganizationInput = {
  slug: string;
  code: string;
};
