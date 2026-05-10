import { useEffect, useRef, useState, type FormEvent } from 'react';
import { browser } from 'wxt/browser';

import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import { PersonalizedVideoCard } from '../../components/PersonalizedVideoCard';
import { SectionCard } from '../../components/SectionCard';
import { extractAutofillHints } from '../../utils/autofill';
import { createAndSaveAppointmentRecord, getAppointmentRecord } from '../../utils/appointments';
import { resolveVehicleImageSelection, type VehiclePageMediaContext } from '../../utils/vehicle-images';
import type {
  AppointmentDraft,
  AppointmentRecord,
  AutofillHints,
} from '../../utils/types';
import type { VehicleImageSelection } from '../../shared/repple-contract';

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

type PageExtractionPayload = {
  title: string;
  visibleText: string;
};

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

export function WorkspacePage() {
  const [draft, setDraft] = useState<AppointmentDraft>(initialDraft);
  const [generated, setGenerated] = useState<AppointmentRecord | null>(null);
  const [smsDraft, setSmsDraft] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy Message');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [detectedHints, setDetectedHints] = useState<AutofillHints | null>(null);
  const [resolvedVehicleImage, setResolvedVehicleImage] = useState<VehicleImageSelection | null>(null);
  const [pageScanVersion, setPageScanVersion] = useState(0);
  const [, setDetectionStatus] = useState<DetectionStatus>('idle');
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const lastAutofillRef = useRef<Partial<AppointmentDraft>>({});

  const canGenerate = REQUIRED_GENERATION_FIELDS.every((field) => draft[field].trim().length > 0);

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

  useEffect(() => {
    if (!generated || generated.videoStatus === 'ready') {
      return;
    }

    const intervalId = window.setInterval(() => {
      void getAppointmentRecord(generated.id, generated.landingPageUrl)
        .then((record) => {
          if (record) {
            setGenerated(record);
          }
        })
        .catch(() => {});
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [generated]);

  function updateField(key: DraftKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function ensurePageReader(tabId: number) {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [PAGE_READER_SCRIPT_PATH],
      });

      console.debug(REPPLE_DEBUG_PREFIX, {
        action: 'inject-page-reader',
        tabId,
      });
    } catch (error) {
      console.debug(REPPLE_DEBUG_PREFIX, {
        action: 'inject-page-reader-failed',
        tabId,
        error,
      });
    }
  }

  async function readHintsWithScript(tabId: number): Promise<AutofillHints | null> {
    try {
      const [result] = await browser.scripting.executeScript({
        target: { tabId },
        func: (): PageExtractionPayload => {
          const crmLabelKeywords =
            /customer|client|guest|buyer|lead|prospect|vehicle|car|model|appointment|appt|scheduled|delivery|arrival|sales|advisor|consultant|dealer|dealership|store|location|address/i;

          function isVisibleElement(element: Element) {
            if (!(element instanceof HTMLElement)) {
              return false;
            }

            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0
            );
          }

          function getNodeText(node: Element | null | undefined) {
            if (!node || !isVisibleElement(node)) {
              return '';
            }

            return node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          }

          function getFieldLabel(
            field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
          ) {
            const associatedLabel =
              (field.id ? document.querySelector(`label[for="${field.id}"]`) : null) ??
              field.closest('label');

            const associatedLabelText = getNodeText(associatedLabel);

            if (associatedLabelText) {
              return associatedLabelText.replace(/\s*:\s*$/, '').trim();
            }

            const previousElementText = getNodeText(field.previousElementSibling);

            if (previousElementText && crmLabelKeywords.test(previousElementText)) {
              return previousElementText.replace(/\s*:\s*$/, '').trim();
            }

            return (
              field.getAttribute('aria-label')?.trim() ||
              field.getAttribute('placeholder')?.trim() ||
              field.getAttribute('name')?.trim() ||
              field.id.trim()
            );
          }

          function getFieldContext() {
            return Array.from(document.querySelectorAll('input, textarea, select'))
              .map((field) => {
                if (
                  !(
                    field instanceof HTMLInputElement ||
                    field instanceof HTMLTextAreaElement ||
                    field instanceof HTMLSelectElement
                  )
                ) {
                  return '';
                }

                const value = 'value' in field ? field.value.trim() : '';
                const label = getFieldLabel(field);

                if (!value || !label) {
                  return '';
                }

                return `${label}: ${value}`;
              })
              .filter(Boolean)
              .join('\n');
          }

          function getAssociatedFieldValue(label: HTMLLabelElement) {
            const labelledField =
              (label.htmlFor ? document.getElementById(label.htmlFor) : null) ??
              label.querySelector('input, textarea, select');

            if (
              labelledField instanceof HTMLInputElement ||
              labelledField instanceof HTMLTextAreaElement ||
              labelledField instanceof HTMLSelectElement
            ) {
              return labelledField.value.trim();
            }

            return '';
          }

          function getSiblingValue(labelElement: Element) {
            const siblingCandidates = [
              labelElement.nextElementSibling,
              labelElement.parentElement?.nextElementSibling,
              labelElement.parentElement?.querySelector(':scope > :last-child'),
            ];

            for (const candidate of siblingCandidates) {
              const text = getNodeText(candidate);

              if (text && text !== getNodeText(labelElement)) {
                return text;
              }
            }

            const row = labelElement.closest('tr');

            if (row) {
              const cells = Array.from(row.children).filter((cell) => cell !== labelElement);

              for (const cell of cells) {
                const text = getNodeText(cell);

                if (text) {
                  return text;
                }
              }
            }

            return '';
          }

          function getLabelValueContext() {
            const pairs = new Set<string>();

            for (const label of Array.from(document.querySelectorAll('label'))) {
              if (!isVisibleElement(label)) {
                continue;
              }

              const labelText = getNodeText(label);

              if (!labelText || !crmLabelKeywords.test(labelText)) {
                continue;
              }

              const value = getAssociatedFieldValue(label);

              if (value) {
                pairs.add(`${labelText}: ${value}`);
              }
            }

            const nearbyLabels = Array.from(
              document.querySelectorAll(
                'dt, th, [data-label], [class*="label"], [class*="Label"], [class*="field-name"]',
              ),
            ).slice(0, 400);

            for (const labelElement of nearbyLabels) {
              if (!isVisibleElement(labelElement)) {
                continue;
              }

              const labelText = getNodeText(labelElement);

              if (!labelText || !crmLabelKeywords.test(labelText)) {
                continue;
              }

              const value = getSiblingValue(labelElement);

              if (value) {
                pairs.add(`${labelText}: ${value}`);
              }
            }

            return Array.from(pairs).join('\n');
          }

          const bodyText = document.body?.innerText?.trim() ?? '';
          const fieldText = getFieldContext();
          const labelValueText = getLabelValueContext();
          const visibleText = [document.title, labelValueText, fieldText, bodyText]
            .filter(Boolean)
            .join('\n');

          return {
            title: document.title,
            visibleText,
          };
        },
      });

      const payload = result?.result;

      if (!payload?.visibleText) {
        return null;
      }

      const hints = extractAutofillHints(payload.visibleText, payload.title);

      console.debug(REPPLE_DEBUG_PREFIX, {
        action: 'script-scan',
        tabId,
        title: payload.title,
        hints,
      });

      return hints;
    } catch (error) {
      console.debug(REPPLE_DEBUG_PREFIX, {
        action: 'script-scan-failed',
        tabId,
        error,
      });
      return null;
    }
  }

  async function readHintsFromTab(tabId: number, attempt = 0): Promise<AutofillHints | null> {
    const scriptedHints = await readHintsWithScript(tabId);

    if (scriptedHints) {
      return scriptedHints;
    }

    try {
      const hints = (await browser.tabs.sendMessage(tabId, {
        type: 'repple:extract-page-context',
      })) as AutofillHints | undefined;

      if (hints) {
        return hints;
      }
    } catch (error) {
      if (attempt === 0) {
        await ensurePageReader(tabId);
      }

      if (attempt >= 2) {
        console.debug(REPPLE_DEBUG_PREFIX, 'sendMessage failed', error);
      }
    }

    if (attempt >= 2) {
      return null;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return readHintsFromTab(tabId, attempt + 1);
  }

  async function readVehicleMediaFromTab(
    tabId: number,
    attempt = 0,
  ): Promise<VehiclePageMediaContext | null> {
    try {
      const context = (await browser.tabs.sendMessage(tabId, {
        type: 'repple:extract-vehicle-media',
      })) as VehiclePageMediaContext | undefined;

      if (context) {
        return context;
      }
    } catch (error) {
      if (attempt === 0) {
        await ensurePageReader(tabId);
      }

      if (attempt >= 2) {
        console.debug(REPPLE_DEBUG_PREFIX, {
          action: 'vehicle-media-read-failed',
          tabId,
          error,
        });
      }
    }

    if (attempt >= 2) {
      return null;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return readVehicleMediaFromTab(tabId, attempt + 1);
  }

  async function detectFromActiveTab() {
    if (generated) {
      return;
    }

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (!tab?.id) {
        setDetectionStatus('empty');
        setPageScanVersion((current) => current + 1);
        return;
      }

      const hints = await readHintsFromTab(tab.id);

      if (!hints) {
        setDetectedHints(null);
        setDetectionStatus('empty');
        setPageScanVersion((current) => current + 1);
        return;
      }

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

      console.debug(REPPLE_DEBUG_PREFIX, {
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
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

        console.debug(REPPLE_DEBUG_PREFIX, {
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
      setDetectedHints(null);
      setDetectionStatus('empty');
      setPageScanVersion((current) => current + 1);
    }
  }

  async function resolveVehicleImageForActiveTab(vehicle: string) {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (!tab?.id) {
        return null;
      }

      const mediaContext = await readVehicleMediaFromTab(tab.id);

      if (!mediaContext) {
        return null;
      }

      return resolveVehicleImageSelection(mediaContext, vehicle);
    } catch (error) {
      console.debug(REPPLE_DEBUG_PREFIX, {
        action: 'vehicle-image-resolution-failed',
        vehicle,
        error,
      });
      return null;
    }
  }

  useEffect(() => {
    void detectFromActiveTab();

    const handleActivated = () => {
      void detectFromActiveTab();
    };

    const handleUpdated = (
      _tabId: number,
      changeInfo: { status?: string },
      tab: { active?: boolean },
    ) => {
      if (tab.active && changeInfo.status === 'complete') {
        void detectFromActiveTab();
      }
    };

    const intervalId = window.setInterval(() => {
      void detectFromActiveTab();
    }, 2500);

    browser.tabs.onActivated.addListener(handleActivated);
    browser.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      window.clearInterval(intervalId);
      browser.tabs.onActivated.removeListener(handleActivated);
      browser.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, [generated]);

  useEffect(() => {
    if (generated) {
      return;
    }

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
      const record = await createAndSaveAppointmentRecord(draft, {
        vehicleImage: resolvedVehicleImage,
      });

      setGenerated(record);
      setSmsDraft(record.smsText);
      setCopyLabel('Copy Message');
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

  async function handleOpenLandingPage() {
    if (!generated) {
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

      const previewUrl = buildEmbeddedLandingPageUrl(generated.landingPageUrl);

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
      console.debug(REPPLE_DEBUG_PREFIX, {
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
          {!generated ? (
            <div className="flex items-start justify-between gap-3">
              <BrandMark />
              <Button
                className="min-h-9 px-3 py-2 text-xs"
                onClick={() => void detectFromActiveTab()}
                type="button"
                variant="ghost"
              >
                Refresh
              </Button>
            </div>
          ) : null}

          {generated ? null : (
            <form className="space-y-3.5" onSubmit={handleGenerate}>
              <div className="space-y-3.5 rounded-[18px] bg-[rgba(255,255,255,0.52)] p-1">
                <FormField
                  label="Customer First Name"
                  placeholder="John"
                  value={draft.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                />
                <FormField
                  label="Vehicle"
                  placeholder="2024 Honda Accord"
                  value={draft.vehicle}
                  onChange={(event) => updateField('vehicle', event.target.value)}
                />
                <FormField
                  label="Appointment Time"
                  placeholder="tomorrow at 3 PM"
                  value={draft.appointmentTime}
                  onChange={(event) => updateField('appointmentTime', event.target.value)}
                />
                <FormField
                  label="Salesperson Name"
                  placeholder="Mike"
                  value={draft.salespersonName}
                  onChange={(event) => updateField('salespersonName', event.target.value)}
                />
                <FormField
                  label="Dealership Name"
                  placeholder="Honda of Example City"
                  value={draft.dealershipName}
                  onChange={(event) => updateField('dealershipName', event.target.value)}
                />
                <FormField
                  label="Address"
                  placeholder="1234 Main Street, Example City, ST 12345"
                  value={draft.dealershipAddress}
                  onChange={(event) => updateField('dealershipAddress', event.target.value)}
                />
              </div>

              <Button disabled={!canGenerate || isGenerating} fullWidth type="submit">
                {isGenerating ? 'Publishing Repple...' : 'Generate Repple'}
              </Button>
            </form>
          )}

          {error ? (
            <div className="rounded-2xl border border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          ) : null}

          {generated ? (
            <div className="space-y-5" ref={resultRef}>
              <div className="space-y-1">
                <p className="text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-[var(--repple-ink)]">
                  {generated.firstName}'s card is ready
                </p>
              </div>

              <PersonalizedVideoCard
                compact
                onPlay={() =>
                  window.open(generated.videoUrl, '_blank', 'noopener,noreferrer')
                }
                status={generated.videoStatus}
                subtitle={
                  generated.videoStatus === 'ready'
                    ? `${generated.firstName} · ${generated.appointmentTime}`
                    : `${generated.vehicle} · ${generated.appointmentTime}`
                }
                thumbnailUrl={generated.videoThumbnailUrl}
                title={
                  generated.videoStatus === 'ready'
                    ? generated.vehicle
                    : `Reserved for ${generated.firstName}`
                }
              />

              <div className="space-y-2">
                <textarea
                  className="min-h-32 w-full resize-none rounded-[18px] border-none bg-white/88 p-4 text-sm leading-6 text-[var(--repple-ink)] outline-none shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
                  onChange={(event) => {
                    setSmsDraft(event.target.value);
                    setCopyLabel('Copy Message');
                  }}
                  value={smsDraft}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleCopySms} type="button" variant="secondary">
                  {copyLabel}
                </Button>
                <Button onClick={handleOpenLandingPage} type="button">
                  View Card
                </Button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>
    </main>
  );
}
