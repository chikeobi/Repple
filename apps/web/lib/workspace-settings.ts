'use client';

import type { WorkspaceContext, WorkspaceSettingsInput } from '../../../shared/auth-contract';
import { normalizeHeygenSceneTemplateKey } from '../../../shared/heygen';
import { supabaseBrowser } from './supabase-browser';

function normalizeRequiredText(value: string, field: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeBrandColor(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(normalized)) {
    throw new Error('Brand color must be a valid hex color.');
  }

  return normalized;
}

export function buildWorkspaceSettingsInput(
  workspace: WorkspaceContext,
): WorkspaceSettingsInput {
  return {
    organizationName: workspace.activeMembership.organization.name,
    organizationAddress: workspace.activeMembership.organization.address ?? '',
    organizationPhone: workspace.activeMembership.organization.phone ?? '',
    organizationWebsiteUrl: workspace.activeMembership.organization.website_url ?? '',
    organizationLogoUrl: workspace.activeMembership.organization.logo_url ?? '',
    organizationBrandColor: workspace.activeMembership.organization.brand_color ?? '',
    defaultSmsTemplate: workspace.organizationSettings?.default_sms_template ?? '',
    heygenAvatarId: workspace.organizationSettings?.heygen_avatar_id ?? '',
    heygenVoiceId: workspace.organizationSettings?.heygen_voice_id ?? '',
    heygenSceneTemplateKey: normalizeHeygenSceneTemplateKey(
      workspace.organizationSettings?.heygen_scene_template_key,
    ),
    profileFullName: workspace.profile.full_name ?? '',
    profileTitle: workspace.profile.title ?? '',
    profileAvatarUrl: workspace.profile.avatar_url ?? '',
  };
}

export async function updateWorkspaceSettings(
  workspace: WorkspaceContext,
  input: WorkspaceSettingsInput,
) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  const organizationId = workspace.activeMembership.organization.id;
  const canManageOrganization = workspace.activeMembership.role !== 'rep';

  const { error: profileError } = await supabaseBrowser
    .from('profiles')
    .update({
      full_name: normalizeOptionalText(input.profileFullName),
      title: normalizeOptionalText(input.profileTitle),
      avatar_url: normalizeOptionalText(input.profileAvatarUrl),
    })
    .eq('id', workspace.profile.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!canManageOrganization) {
    return;
  }

  const { error: organizationError } = await supabaseBrowser
    .from('organizations')
    .update({
      name: normalizeRequiredText(input.organizationName, 'Dealership name'),
      address: normalizeOptionalText(input.organizationAddress),
      phone: normalizeOptionalText(input.organizationPhone),
      website_url: normalizeOptionalText(input.organizationWebsiteUrl),
      logo_url: normalizeOptionalText(input.organizationLogoUrl),
      brand_color: normalizeBrandColor(input.organizationBrandColor),
    })
    .eq('id', organizationId);

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  const { error: settingsError } = await supabaseBrowser
    .from('organization_settings')
    .upsert(
      {
        organization_id: organizationId,
        default_sms_template: normalizeOptionalText(input.defaultSmsTemplate),
        heygen_avatar_id: normalizeOptionalText(input.heygenAvatarId),
        heygen_voice_id: normalizeOptionalText(input.heygenVoiceId),
        heygen_scene_template_key: normalizeHeygenSceneTemplateKey(
          input.heygenSceneTemplateKey,
        ),
      },
      { onConflict: 'organization_id' },
    );

  if (settingsError) {
    throw new Error(settingsError.message);
  }
}
