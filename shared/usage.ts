export const DEFAULT_ORGANIZATION_USAGE_LIMITS = {
  generatedExperiences: 300,
  mediaUsage: 300,
  imageGenerationUsage: 120,
  videoGenerationUsage: 0,
} as const;

export type OrganizationUsageSummary = {
  organizationId: string;
  usagePeriodStart: string;
  generatedExperiencesCount: number;
  mediaUsageCount: number;
  imageGenerationUsageCount: number;
  videoGenerationUsageCount: number;
  softGeneratedExperiencesLimit: number;
  softMediaUsageLimit: number;
  softImageGenerationUsageLimit: number;
  softVideoGenerationUsageLimit: number;
  generatedExperiencesOverSoftLimit: boolean;
  mediaUsageOverSoftLimit: boolean;
  imageGenerationUsageOverSoftLimit: boolean;
  videoGenerationUsageOverSoftLimit: boolean;
};

export function isUsageOverSoftLimit(used: number, limit: number) {
  return limit > 0 && used >= limit;
}

export function formatUsageLimit(limit: number) {
  if (limit <= 0) {
    return 'Not enabled';
  }

  return `${limit}`;
}

export function getUsageRatio(used: number, limit: number) {
  if (limit <= 0) {
    return null;
  }

  return Math.min(used / limit, 1);
}

export function hasOrganizationUsagePressure(summary: OrganizationUsageSummary | null) {
  if (!summary) {
    return false;
  }

  return (
    summary.generatedExperiencesOverSoftLimit ||
    summary.mediaUsageOverSoftLimit ||
    summary.imageGenerationUsageOverSoftLimit ||
    summary.videoGenerationUsageOverSoftLimit
  );
}
