import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { browser } from 'wxt/browser';

import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { SectionCard } from '../../components/SectionCard';
import {
  isOrganizationSubscriptionActive,
} from '../../shared/billing';
import type { WorkspaceContext } from '../../shared/auth-contract';
import { extractAutofillHints } from '../../utils/autofill';
import { recordWorkspaceAppointmentEvent } from '../../utils/analytics';
import { debugLog } from '../../utils/debug';
import {
  createAndSaveAppointmentRecord,
  listRecentAppointmentRecords,
} from '../../utils/appointments';
import {
  extractPageContextFromDocument,
  type PageExtractionPayload,
} from '../../utils/page-context';
import { createAppointmentRecord } from '../../utils/repple';
import { resolveVehicleImageSelection, type VehiclePageMediaContext } from '../../utils/vehicle-images';
import type {
  AppointmentDraft,
  AppointmentRecord,
  AutofillHints,
} from '../../utils/types';
import type { VehicleImageSelection } from '../../shared/repple-contract';
import { ActivityWorkspaceTab, CreateWorkspaceTab } from './workspace/WorkspacePanels';

const initialDraft: AppointmentDraft = {
  firstName: '',
  vehicle: '',
  appointmentTime: '',
  salespersonName: '',
  dealershipName: '',
  dealershipAddress: '',
};

type DraftKey = keyof AppointmentDraft;
type DetectionStatus = 'idle' | 'applied' | 'empty';
type WorkspaceTab = 'create' | 'activity';
type DetectOptions = {
  force?: boolean;
};
const REQUIRED_GENERATION_FIELDS: DraftKey[] = [
  'firstName',
  'vehicle',
  'appointmentTime',
  'salespersonName',
];
const AUTOFILL_KEYS: DraftKey[] = [
  'firstName',
  'vehicle',
  'appointmentTime',
  'salespersonName',
  'dealershipName',
  'dealershipAddress',
];
const REPPLE_DEBUG_PREFIX = '[Repple][detect]';
const PREVIEW_SHORT_ID = 'PREVUE';
const PAGE_READER_SCRIPT_PATH = '/content-scripts/page-reader.js';
const PAGE_CARD_PREVIEW_ROOT_ID = 'repple-card-preview-root';
const MIN_SCAN_REFRESH_INTERVAL_MS = 1200;

function isSupportedCrmPageUrl(url?: string) {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function mergeDraftFromHints(
  draft: AppointmentDraft,
  hints: AutofillHints,
  lastAutofill: Partial<AppointmentDraft>,
) {
  const nextDraft = { ...draft };
  const nextAutofill: Partial<AppointmentDraft> = {};
  let changed = false;

  for (const key of AUTOFILL_KEYS) {
    const hint = hints[key]?.trim();

    if (!hint) {
      continue;
    }

    const currentValue = draft[key].trim();
    const previousAutoValue = lastAutofill[key]?.trim() ?? '';

    if (!currentValue || currentValue === previousAutoValue) {
      nextDraft[key] = hint;
      nextAutofill[key] = hint;
      changed = true;
    }
  }

  return { nextDraft, nextAutofill, changed };
}

export function WorkspacePage({
  onSignOut,
  workspace,
}: {
  onSignOut?: () => void | Promise<void>;
  workspace: WorkspaceContext;
}) {
  const organization = workspace.activeMembership.organization;
  const appliedWorkspaceDefaultsRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('create');
  const [draft, setDraft] = useState<AppointmentDraft>(initialDraft);
  const [generated, setGenerated] = useState<AppointmentRecord | null>(null);
  const [activityRecords, setActivityRecords] = useState<AppointmentRecord[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [smsDraft, setSmsDraft] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy Message');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [, setDetectedHints] = useState<AutofillHints | null>(null);
  const [resolvedVehicleImage, setResolvedVehicleImage] = useState<VehicleImageSelection | null>(null);
  const [latestPageContext, setLatestPageContext] = useState<PageExtractionPayload | null>(null);
  const [pageScanVersion, setPageScanVersion] = useState(0);
  const [, setDetectionStatus] = useState<DetectionStatus>('idle');
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const lastAutofillRef = useRef<Partial<AppointmentDraft>>({});
  const lastDetectedTabKeyRef = useRef<string | null>(null);
  const lastDetectionAtRef = useRef(0);
  const detectionInFlightRef = useRef(false);
  const pendingForcedDetectionRef = useRef(false);
  const detectFromActiveTabRef = useRef<(options?: DetectOptions) => Promise<void>>(
    async () => {},
  );
  const loadActivityRecordsRef = useRef<() => Promise<void>>(async () => {});
  const previewRecord = useMemo(() => {
    const previewDraft: AppointmentDraft = {
      firstName: draft.firstName.trim() || 'Customer',
      vehicle: draft.vehicle.trim() || 'Vehicle details',
      appointmentTime: draft.appointmentTime.trim() || 'Appointment time',
      salespersonName:
        draft.salespersonName.trim() || workspace.profile.full_name?.trim() || 'Sales Advisor',
      dealershipName: draft.dealershipName.trim() || organization.name.trim() || 'Dealership',
      dealershipAddress:
        draft.dealershipAddress.trim() || organization.address?.trim() || 'Dealership address',
    };

    const record = createAppointmentRecord(previewDraft, {
      id: PREVIEW_SHORT_ID,
      vehicleImage: resolvedVehicleImage,
      smsTemplate: workspace.organizationSettings?.default_sms_template ?? null,
      dealershipLogoUrl: organization.logo_url ?? null,
      dealershipBrandColor: organization.brand_color ?? null,
    });

    return {
      ...record,
      salespersonTitle: workspace.profile.title ?? null,
      salespersonAvatarUrl: workspace.profile.avatar_url ?? null,
    };
  }, [
    draft.appointmentTime,
    draft.dealershipAddress,
    draft.dealershipName,
    draft.firstName,
    draft.salespersonName,
    draft.vehicle,
    organization.address,
    organization.name,
    resolvedVehicleImage,
    workspace.organizationSettings?.default_sms_template,
    workspace.profile.avatar_url,
    workspace.profile.full_name,
    workspace.profile.title,
  ]);

  const canGenerate = REQUIRED_GENERATION_FIELDS.every((field) => draft[field].trim().length > 0);
  const hasActiveBilling = isOrganizationSubscriptionActive(organization.subscription_status);

  useEffect(() => {
    const workspaceKey = `${workspace.profile.id}:${organization.id}`;

    if (appliedWorkspaceDefaultsRef.current === workspaceKey) {
      return;
    }

    setDraft((current) => ({
      ...current,
      salespersonName: current.salespersonName.trim() || workspace.profile.full_name?.trim() || '',
      dealershipName: current.dealershipName.trim() || organization.name.trim(),
      dealershipAddress: current.dealershipAddress.trim() || organization.address?.trim() || '',
    }));

    appliedWorkspaceDefaultsRef.current = workspaceKey;
  }, [organization.address, organization.id, organization.name, workspace.profile.full_name, workspace.profile.id]);

  useEffect(() => {
    if (!generated) {
      return;
    }

    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [generated]);

  useEffect(() => {
    if (!generated) {
      setSmsDraft('');
      return;
    }

    setSmsDraft(generated.smsText);
  }, [generated?.id]);

  function updateField(key: DraftKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function loadActivityRecords() {
    setIsActivityLoading(true);

    try {
      const records = await listRecentAppointmentRecords(workspace);
      setActivityRecords(records);
    } finally {
      setIsActivityLoading(false);
    }
  }

  loadActivityRecordsRef.current = loadActivityRecords;

  async function ensurePageReader(tabId: number) {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [PAGE_READER_SCRIPT_PATH],
      });

      debugLog(REPPLE_DEBUG_PREFIX, {
        action: 'inject-page-reader',
        tabId,
      });
    } catch (error) {
      debugLog(REPPLE_DEBUG_PREFIX, {
        action: 'inject-page-reader-failed',
        tabId,
        error,
      });
    }
  }

  async function readPageContextWithScript(tabId: number): Promise<PageExtractionPayload | null> {
    try {
      const [result] = await browser.scripting.executeScript({
        target: { tabId },
        func: extractPageContextFromDocument,
      });

      const payload = result?.result as PageExtractionPayload | undefined;

      if (!payload?.visibleText) {
        return null;
      }

      debugLog(REPPLE_DEBUG_PREFIX, {
        action: 'script-scan',
        tabId,
        title: payload.title,
        fieldCount: payload.fieldEntries.length,
        imageCount: payload.images.length,
        inventoryLinkCount: payload.inventoryLinks.length,
        vin: payload.vin,
      });

      return payload;
    } catch (error) {
      debugLog(REPPLE_DEBUG_PREFIX, {
        action: 'script-scan-failed',
        tabId,
        error,
      });
      return null;
    }
  }

  async function readPageContextFromTab(
    tabId: number,
    attempt = 0,
  ): Promise<PageExtractionPayload | null> {
    const scriptedPayload = await readPageContextWithScript(tabId);

    if (scriptedPayload) {
      return scriptedPayload;
    }

    try {
      const payload = (await browser.tabs.sendMessage(tabId, {
        type: 'repple:extract-page-context',
      })) as PageExtractionPayload | undefined;

      if (payload?.visibleText) {
        return payload;
      }
    } catch (error) {
      if (attempt === 0) {
        await ensurePageReader(tabId);
      }

      if (attempt >= 2) {
        debugLog(REPPLE_DEBUG_PREFIX, 'sendMessage failed', error);
      }
    }

    if (attempt >= 2) {
      return null;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return readPageContextFromTab(tabId, attempt + 1);
  }

  async function detectFromActiveTab(options: DetectOptions = {}) {
    if (detectionInFlightRef.current) {
      if (options.force) {
        pendingForcedDetectionRef.current = true;
      }

      return;
    }

    detectionInFlightRef.current = true;

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (!tab?.id || !isSupportedCrmPageUrl(tab.url)) {
        setLatestPageContext(null);
        setDetectionStatus('empty');
        setPageScanVersion((current) => current + 1);
        lastDetectedTabKeyRef.current = tab?.id ? `${tab.id}:${tab.url ?? ''}` : null;
        lastDetectionAtRef.current = Date.now();
        return;
      }

      const tabKey = `${tab.id}:${tab.url ?? ''}`;

      if (
        !options.force &&
        lastDetectedTabKeyRef.current === tabKey &&
        Date.now() - lastDetectionAtRef.current < MIN_SCAN_REFRESH_INTERVAL_MS
      ) {
        return;
      }

      lastDetectedTabKeyRef.current = tabKey;
      lastDetectionAtRef.current = Date.now();

      const payload = await readPageContextFromTab(tab.id);

      if (!payload) {
        setLatestPageContext(null);
        setDetectedHints(null);
        setDetectionStatus('empty');
        setPageScanVersion((current) => current + 1);
        return;
      }

      setLatestPageContext(payload);
      const hints = extractAutofillHints(payload);

      const usefulHints = {
        firstName: hints.firstName?.trim() ?? '',
        vehicle: hints.vehicle?.trim() ?? '',
        appointmentTime: hints.appointmentTime?.trim() ?? '',
        salespersonName: hints.salespersonName?.trim() ?? '',
        dealershipName: hints.dealershipName?.trim() ?? '',
        dealershipAddress: hints.dealershipAddress?.trim() ?? '',
        sourceTitle: hints.sourceTitle?.trim() ?? '',
        meta: hints.meta,
      };

      const hasUsefulData = AUTOFILL_KEYS.some((key) => Boolean(usefulHints[key]));

      debugLog(REPPLE_DEBUG_PREFIX, {
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        fieldCount: payload.fieldEntries.length,
        imageCount: payload.images.length,
        inventoryLinkCount: payload.inventoryLinks.length,
        vin: payload.vin,
        hints: usefulHints,
      });

      if (!hasUsefulData) {
        setDetectedHints(null);
        setDetectionStatus('empty');
        setPageScanVersion((current) => current + 1);
        return;
      }

      setDetectedHints(usefulHints);
      setDraft((current) => {
        const { nextDraft, nextAutofill } = mergeDraftFromHints(
          current,
          usefulHints,
          lastAutofillRef.current,
        );

        debugLog(REPPLE_DEBUG_PREFIX, {
          action: 'merge',
          previousDraft: current,
          nextDraft,
          appliedHints: nextAutofill,
        });

        lastAutofillRef.current = {
          ...lastAutofillRef.current,
          ...nextAutofill,
        };
        return nextDraft;
      });
      setDetectionStatus('applied');
      setPageScanVersion((current) => current + 1);
    } catch {
      setLatestPageContext(null);
      setDetectedHints(null);
      setDetectionStatus('empty');
      setPageScanVersion((current) => current + 1);
    } finally {
      detectionInFlightRef.current = false;

      if (pendingForcedDetectionRef.current) {
        pendingForcedDetectionRef.current = false;
        void detectFromActiveTab({ force: true });
      }
    }
  }

  detectFromActiveTabRef.current = detectFromActiveTab;

  async function resolveVehicleImageForActiveTab(
    vehicle: string,
    pageContext = latestPageContext,
  ) {
    try {
      let mediaContext = pageContext;

      if (!mediaContext) {
        const [tab] = await browser.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });

        if (!tab?.id) {
          return null;
        }

        mediaContext = await readPageContextFromTab(tab.id);
      }

      if (!mediaContext) {
        return null;
      }

      return resolveVehicleImageSelection(mediaContext as VehiclePageMediaContext, vehicle);
    } catch (error) {
      debugLog(REPPLE_DEBUG_PREFIX, {
        action: 'vehicle-image-resolution-failed',
        vehicle,
        error,
      });
      return null;
    }
  }

  useEffect(() => {
    void detectFromActiveTabRef.current({ force: true });
    void loadActivityRecordsRef.current();

    const handleActivated = () => {
      void detectFromActiveTabRef.current({ force: true });
    };

    const handleUpdated = (
      _tabId: number,
      changeInfo: { status?: string },
      tab: { active?: boolean },
    ) => {
      if (tab.active && changeInfo.status === 'complete') {
        void detectFromActiveTabRef.current({ force: true });
      }
    };

    const handleFocus = () => {
      void detectFromActiveTabRef.current();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void detectFromActiveTabRef.current();
      }
    };

    browser.tabs.onActivated.addListener(handleActivated);
    browser.tabs.onUpdated.addListener(handleUpdated);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      browser.tabs.onActivated.removeListener(handleActivated);
      browser.tabs.onUpdated.removeListener(handleUpdated);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'activity') {
      return;
    }

    void loadActivityRecordsRef.current();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadActivityRecordsRef.current();
      }
    }, 15000);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadActivityRecordsRef.current();
      }
    };

    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [activeTab, workspace.activeMembership.organization.id]);

  useEffect(() => {
    const vehicle = draft.vehicle.trim();

    if (vehicle.length < 4) {
      setResolvedVehicleImage(null);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void resolveVehicleImageForActiveTab(vehicle).then((selection) => {
        if (cancelled) {
          return;
        }

        setResolvedVehicleImage(selection);
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [draft.vehicle, generated, pageScanVersion]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canGenerate) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const vehicleImage =
        resolvedVehicleImage ?? (await resolveVehicleImageForActiveTab(draft.vehicle.trim()));
      const record = await createAndSaveAppointmentRecord(draft, {
        vehicleImage,
        vin: latestPageContext?.vin ?? null,
        workspace,
      });

      setGenerated(record);
      setResolvedVehicleImage(vehicleImage);
      setActivityRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setSmsDraft(record.smsText);
      setCopyLabel('Copy Message');
      void loadActivityRecords();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Unable to generate this Repple page right now.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopySms() {
    if (!generated) {
      return;
    }

    await navigator.clipboard.writeText(smsDraft);
    setCopyLabel('Copied');
    void recordWorkspaceAppointmentEvent(generated.id, 'message_copied', {
      source: 'extension',
      vehicle: generated.vehicle,
    });
  }

  function buildEmbeddedLandingPageUrl(url: string) {
    try {
      const previewUrl = new URL(url);
      previewUrl.searchParams.set('embed', '1');
      return previewUrl.toString();
    } catch {
      return `${url}${url.includes('?') ? '&' : '?'}embed=1`;
    }
  }

  async function handleOpenLandingPage(record = generated) {
    if (!record) {
      return;
    }

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (!tab?.id) {
        return;
      }

      const previewUrl = buildEmbeddedLandingPageUrl(record.landingPageUrl);

      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        args: [previewUrl, PAGE_CARD_PREVIEW_ROOT_ID],
        func: (url: string, rootId: string) => {
          const existingRoot = document.getElementById(rootId);

          if (existingRoot) {
            const existingFrame = existingRoot.querySelector('iframe');

            if (existingFrame instanceof HTMLIFrameElement) {
              existingFrame.src = url;
            }

            return;
          }

          const root = document.createElement('div');
          root.id = rootId;
          root.style.position = 'fixed';
          root.style.inset = '0';
          root.style.zIndex = '2147483646';
          root.style.pointerEvents = 'none';
          root.style.display = 'flex';
          root.style.alignItems = 'center';
          root.style.justifyContent = 'center';
          root.style.padding = '24px';
          root.style.boxSizing = 'border-box';
          root.style.background = 'transparent';

          const backdrop = document.createElement('button');
          backdrop.type = 'button';
          backdrop.setAttribute('aria-label', 'Close Repple card preview');
          backdrop.style.position = 'absolute';
          backdrop.style.inset = '0';
          backdrop.style.border = '0';
          backdrop.style.margin = '0';
          backdrop.style.padding = '0';
          backdrop.style.background = 'rgba(12, 18, 31, 0.14)';
          backdrop.style.backdropFilter = 'blur(5px)';
          backdrop.style.pointerEvents = 'auto';
          backdrop.style.cursor = 'pointer';

          const shell = document.createElement('div');
          shell.style.position = 'relative';
          shell.style.width = 'min(430px, calc(100vw - 48px))';
          shell.style.height = 'min(760px, calc(100vh - 48px))';
          shell.style.maxWidth = '430px';
          shell.style.maxHeight = '760px';
          shell.style.borderRadius = '32px';
          shell.style.overflow = 'hidden';
          shell.style.pointerEvents = 'auto';
          shell.style.boxShadow = '0 22px 56px rgba(17, 28, 56, 0.18)';
          shell.style.background = 'transparent';

          const frame = document.createElement('iframe');
          frame.src = url;
          frame.title = 'Repple card preview';
          frame.style.width = '100%';
          frame.style.height = '100%';
          frame.style.border = '0';
          frame.style.display = 'block';
          frame.style.background = 'transparent';

          const removeOverlay = () => {
            window.removeEventListener('message', onMessage);
            window.removeEventListener('keydown', onKeyDown);
            root.remove();
          };

          const onMessage = (event: MessageEvent) => {
            if (event.source !== frame.contentWindow) {
              return;
            }

            if (event.data?.type === 'repple:close-card-preview') {
              removeOverlay();
            }
          };

          const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
              removeOverlay();
            }
          };

          backdrop.addEventListener('click', removeOverlay);
          window.addEventListener('message', onMessage);
          window.addEventListener('keydown', onKeyDown);

          shell.appendChild(frame);
          root.appendChild(backdrop);
          root.appendChild(shell);
          document.body.appendChild(root);
        },
      });
    } catch (previewError) {
      debugLog(REPPLE_DEBUG_PREFIX, {
        action: 'open-page-preview-failed',
        error: previewError,
      });
    }
  }

  return (
    <main
      className="min-h-screen w-full overflow-y-auto px-3 py-3 scroll-smooth sm:px-4 sm:py-4"
      ref={scrollContainerRef}
    >
      <div className="mx-auto w-full max-w-[430px]">
        <SectionCard className="space-y-4 p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <BrandMark />
            <div className="flex items-center gap-2">
              <Button
                className="min-h-9 px-3 py-2 text-xs"
                onClick={() =>
                  void (activeTab === 'activity' ? loadActivityRecords() : detectFromActiveTab())
                }
                type="button"
                variant="ghost"
              >
                Refresh
              </Button>
              {onSignOut ? (
                <Button
                  className="min-h-9 px-3 py-2 text-xs"
                  onClick={() => void onSignOut()}
                  type="button"
                  variant="ghost"
                >
                  Sign Out
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[18px] bg-white/86 px-4 py-3 shadow-[0_12px_26px_rgba(15,23,42,0.05)]">
            <p className="truncate text-[15px] font-semibold text-[var(--repple-ink)]">
              {organization.name}
            </p>
            <p className="mt-1 truncate text-[12px] text-[var(--repple-muted)]">
              {workspace.profile.full_name?.trim() || workspace.profile.email}
            </p>
          </div>

          <div className="rounded-[14px] bg-[rgba(255,255,255,0.58)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <div className="grid grid-cols-2 gap-1">
              <button
                className={`rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'create'
                    ? 'bg-white text-[var(--repple-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                    : 'text-[var(--repple-muted)]'
                }`}
                onClick={() => setActiveTab('create')}
                type="button"
              >
                Create
              </button>
              <button
                className={`rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'activity'
                    ? 'bg-white text-[var(--repple-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                    : 'text-[var(--repple-muted)]'
                }`}
                onClick={() => setActiveTab('activity')}
                type="button"
              >
                Activity
              </button>
            </div>
          </div>

          {activeTab === 'create' ? (
            <CreateWorkspaceTab
              billingStatus={organization.subscription_status}
              canGenerate={canGenerate}
              copyLabel={copyLabel}
              draft={draft}
              error={error}
              generated={generated}
              hasActiveBilling={hasActiveBilling}
              isGenerating={isGenerating}
              onCopySms={() => void handleCopySms()}
              onFieldChange={updateField}
              onGenerate={handleGenerate}
              onOpenLandingPage={(record) => void handleOpenLandingPage(record)}
              onSmsDraftChange={(value) => {
                setSmsDraft(value);
                setCopyLabel('Copy Message');
              }}
              previewRecord={previewRecord}
              resultRef={resultRef}
              smsDraft={smsDraft}
            />
          ) : null}

          {activeTab === 'activity' ? (
            <ActivityWorkspaceTab
              activityRecords={activityRecords}
              isActivityLoading={isActivityLoading}
              onOpenLandingPage={(record) => void handleOpenLandingPage(record)}
            />
          ) : null}
        </SectionCard>
      </div>
    </main>
  );
}
