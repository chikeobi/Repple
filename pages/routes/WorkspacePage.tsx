import { useEffect, useRef, useState, type FormEvent } from 'react';
import { browser } from 'wxt/browser';

import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import { PersonalizedVideoCard } from '../../components/PersonalizedVideoCard';
import { SectionCard } from '../../components/SectionCard';
import { createAndSaveAppointmentRecord, getAppointmentRecord } from '../../utils/appointments';
import type { AppointmentDraft, AppointmentRecord, AutofillHints } from '../../utils/types';

const initialDraft: AppointmentDraft = {
  firstName: '',
  vehicle: '',
  appointmentTime: '',
  salespersonName: '',
};

type DraftKey = keyof AppointmentDraft;
type DetectionStatus = 'idle' | 'scanning' | 'applied' | 'empty';

function mergeDraftFromHints(
  draft: AppointmentDraft,
  hints: AutofillHints,
  lastAutofill: Partial<AppointmentDraft>,
) {
  const nextDraft = { ...draft };
  const nextAutofill: Partial<AppointmentDraft> = {};
  let changed = false;

  for (const key of ['firstName', 'vehicle', 'appointmentTime'] as Array<
    keyof Pick<AppointmentDraft, 'firstName' | 'vehicle' | 'appointmentTime'>
  >) {
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
  const [copyLabel, setCopyLabel] = useState('Copy SMS');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [detectedHints, setDetectedHints] = useState<AutofillHints | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const lastAutofillRef = useRef<Partial<AppointmentDraft>>({});

  const canGenerate = Object.values(draft).every((value) => value.trim().length > 0);

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

  async function detectFromActiveTab() {
    if (generated) {
      return;
    }

    setDetectionStatus('scanning');

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (!tab?.id) {
        setDetectionStatus('empty');
        return;
      }

      const hints = (await browser.tabs.sendMessage(tab.id, {
        type: 'repple:extract-page-context',
      })) as AutofillHints | undefined;

      if (!hints) {
        setDetectedHints(null);
        setDetectionStatus('empty');
        return;
      }

      const usefulHints = {
        firstName: hints.firstName?.trim() ?? '',
        vehicle: hints.vehicle?.trim() ?? '',
        appointmentTime: hints.appointmentTime?.trim() ?? '',
        sourceTitle: hints.sourceTitle?.trim() ?? '',
      };

      const hasUsefulData = Boolean(
        usefulHints.firstName || usefulHints.vehicle || usefulHints.appointmentTime,
      );

      if (!hasUsefulData) {
        setDetectedHints(null);
        setDetectionStatus('empty');
        return;
      }

      setDetectedHints(usefulHints);
      setDraft((current) => {
        const { nextDraft, nextAutofill } = mergeDraftFromHints(
          current,
          usefulHints,
          lastAutofillRef.current,
        );
        lastAutofillRef.current = nextAutofill;
        return nextDraft;
      });
      setDetectionStatus('applied');
    } catch {
      setDetectedHints(null);
      setDetectionStatus('empty');
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

    browser.tabs.onActivated.addListener(handleActivated);
    browser.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      browser.tabs.onActivated.removeListener(handleActivated);
      browser.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, [generated]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canGenerate) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const record = await createAndSaveAppointmentRecord(draft);

      setGenerated(record);
      setCopyLabel('Copy SMS');
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

    await navigator.clipboard.writeText(generated.smsText);
    setCopyLabel('Copied');
  }

  function handleOpenLandingPage() {
    if (!generated) {
      return;
    }

    window.open(generated.landingPageUrl, '_blank', 'noopener,noreferrer');
  }

  function handleCreateAnother() {
    setGenerated(null);
    setCopyLabel('Copy SMS');
    setError('');
    lastAutofillRef.current = {};
    setDetectedHints(null);
    setDetectionStatus('idle');

    window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });

    window.setTimeout(() => {
      void detectFromActiveTab();
    }, 120);
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
              {!generated && detectionStatus !== 'empty' ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.06)] bg-white/78 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--repple-muted)] shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--repple-accent)]" />
                  {detectionStatus === 'scanning' ? 'Scanning' : 'Auto-Filled'}
                </div>
              ) : null}
              {!generated ? (
                <Button
                  className="min-h-9 px-3 py-2 text-xs"
                  onClick={() => void detectFromActiveTab()}
                  type="button"
                  variant="ghost"
                >
                  Refresh
                </Button>
              ) : null}
            </div>
          </div>

          {!generated && detectionStatus !== 'empty' ? (
            <div className="-mt-1 text-[11px] text-[var(--repple-muted)]">
              {detectionStatus === 'applied'
                ? 'Fields were filled from the current page.'
                : detectionStatus === 'scanning'
                  ? 'Reading current page...'
                  : ''}
            </div>
          ) : null}

          {generated ? (
            <div className="subtle-card rounded-[16px] border-none p-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--repple-muted)]">
                    Appointment Snapshot
                  </p>
                  <p className="text-sm leading-6 text-[var(--repple-ink)]">
                    {generated.firstName} · {generated.vehicle} ·{' '}
                    {generated.appointmentTime}
                  </p>
                </div>
                <Button onClick={handleCreateAnother} type="button" variant="ghost">
                  Create Another
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-3.5" onSubmit={handleGenerate}>
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

              <Button disabled={!canGenerate || isGenerating} fullWidth type="submit">
                {isGenerating ? 'Generating...' : 'Generate Repple'}
              </Button>
            </form>
          )}

          {error ? (
            <div className="rounded-2xl border border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          ) : null}

          {generated ? (
            <SectionCard
              className="celebration-card space-y-3.5 border-[rgba(10,132,255,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,249,255,0.96))] p-3.5"
              ref={resultRef}
            >
              <div className="relative z-10 space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-[rgba(10,132,255,0.16)] bg-[rgba(10,132,255,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--repple-ink)]">
                      {generated.videoStatus === 'ready'
                        ? 'Generated Successfully'
                        : 'Video In Progress'}
                    </div>
                    <div>
                      <p className="text-[1.45rem] font-semibold tracking-[-0.03em] leading-none text-[var(--repple-ink)]">
                        {generated.videoStatus === 'ready'
                          ? 'Repple is live.'
                          : 'Generating personalized video...'}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--repple-muted)]">
                        {generated.videoStatus === 'ready'
                          ? 'Your personalized page and SMS are ready to send right now.'
                          : 'Your page is saved. The mock video is processing and will appear automatically.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(10,132,255,0.16)] bg-white/92 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                    <span className="text-base text-[var(--repple-accent)]">
                      {generated.videoStatus === 'ready' ? '✓' : '…'}
                    </span>
                  </div>
                </div>

                <PersonalizedVideoCard
                  compact
                  onPlay={() =>
                    window.open(generated.videoUrl, '_blank', 'noopener,noreferrer')
                  }
                  status={generated.videoStatus}
                  subtitle={
                    generated.videoStatus === 'ready'
                      ? 'Mock personalized video ready to preview'
                      : 'Mock generation job running'
                  }
                  thumbnailUrl={generated.videoThumbnailUrl}
                  title={
                    generated.videoStatus === 'ready'
                      ? 'Personalized video ready'
                      : 'Generating personalized video...'
                  }
                />

                <div className="rounded-[16px] border border-[rgba(15,23,42,0.06)] bg-white/82 p-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--repple-muted)]">
                    Generated Link
                  </p>
                  <p className="mt-3 text-xs text-[var(--repple-muted)]">ID</p>
                  <p className="mt-1 break-all text-sm text-[var(--repple-ink)]">
                    {generated.id}
                  </p>
                  <p className="mt-3 text-xs text-[var(--repple-muted)]">URL</p>
                  <p className="mt-1 break-all text-sm text-[var(--repple-ink)]">
                    {generated.landingPageUrl}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--repple-muted)]">
                    SMS Preview
                  </p>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-[16px] border border-[rgba(15,23,42,0.06)] bg-white/84 p-3.5 text-sm leading-6 text-[var(--repple-ink)] outline-none shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
                    readOnly
                    value={generated.smsText}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleCopySms} type="button" variant="secondary">
                    {copyLabel}
                  </Button>
                  <Button onClick={handleOpenLandingPage} type="button">
                    Open Landing Page
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </SectionCard>
      </div>
    </main>
  );
}
