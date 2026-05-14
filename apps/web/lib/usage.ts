'use client';

import type { OrganizationUsageSummary } from '../../../shared/usage';
import { supabaseBrowser } from './supabase-browser';

type UsageSummaryRpcRow = {
  organization_id: string;
  usage_period_start: string;
  generated_experiences_count: number;
  media_usage_count: number;
  image_generation_usage_count: number;
  video_generation_usage_count: number;
  soft_generated_experiences_limit: number;
  soft_media_usage_limit: number;
  soft_image_generation_usage_limit: number;
  soft_video_generation_usage_limit: number;
  generated_experiences_over_soft_limit: boolean;
  media_usage_over_soft_limit: boolean;
  image_generation_usage_over_soft_limit: boolean;
  video_generation_usage_over_soft_limit: boolean;
};

function normalizeUsageSummary(row: UsageSummaryRpcRow): OrganizationUsageSummary {
  return {
    organizationId: row.organization_id,
    usagePeriodStart: row.usage_period_start,
    generatedExperiencesCount: row.generated_experiences_count ?? 0,
    mediaUsageCount: row.media_usage_count ?? 0,
    imageGenerationUsageCount: row.image_generation_usage_count ?? 0,
    videoGenerationUsageCount: row.video_generation_usage_count ?? 0,
    softGeneratedExperiencesLimit: row.soft_generated_experiences_limit ?? 0,
    softMediaUsageLimit: row.soft_media_usage_limit ?? 0,
    softImageGenerationUsageLimit: row.soft_image_generation_usage_limit ?? 0,
    softVideoGenerationUsageLimit: row.soft_video_generation_usage_limit ?? 0,
    generatedExperiencesOverSoftLimit: Boolean(row.generated_experiences_over_soft_limit),
    mediaUsageOverSoftLimit: Boolean(row.media_usage_over_soft_limit),
    imageGenerationUsageOverSoftLimit: Boolean(row.image_generation_usage_over_soft_limit),
    videoGenerationUsageOverSoftLimit: Boolean(row.video_generation_usage_over_soft_limit),
  };
}

export async function getOrganizationUsageSummary(organizationId: string) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  const { data, error } = await supabaseBrowser
    .rpc('get_organization_usage_summary', {
      input_organization_id: organizationId,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to load organization usage.');
  }

  return normalizeUsageSummary(data as UsageSummaryRpcRow);
}
