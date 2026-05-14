'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import type {
  OrganizationMembership,
  WorkspaceBootstrapContext,
  WorkspaceContext,
} from '../../../../../shared/auth-contract';
import { getAppointmentStatusSummary } from '../../../../../shared/appointment-status';
import {
  isSupabaseBrowserConfigured,
  loadWebWorkspaceContext,
  onWebAuthStateChange,
  signOutWeb,
} from '../../../lib/browser-auth';
import {
  buildRepOptions,
  listOrganizationActivityRecords,
} from '../../../lib/activity';
import type { AppointmentRecord } from '../../../lib/repple';

function shellStyle(): CSSProperties {
  return {
    minHeight: '100vh',
    padding: 16,
    background: 'linear-gradient(180deg, #f5f7fb 0%, #eef3fa 55%, #f8fbff 100%)',
  };
}

function cardStyle(): CSSProperties {
  return {
    width: '100%',
    maxWidth: 960,
    margin: '0 auto',
    borderRadius: 28,
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 24px 64px rgba(15, 23, 42, 0.08)',
    padding: 24,
  };
}

function isReadyContext(
  context: WorkspaceBootstrapContext | null,
): context is WorkspaceContext {
  return Boolean(context?.activeMembership);
}

function labelStyle(): CSSProperties {
  return {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#6b7891',
    marginBottom: 8,
  };
}

function selectStyle(): CSSProperties {
  return {
    width: '100%',
    height: 46,
    borderRadius: 14,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: '#fbfdff',
    padding: '0 14px',
    fontSize: 14,
    color: '#172341',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function navLinkStyle(primary = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    padding: '0 16px',
    borderRadius: 14,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 700,
    border: primary ? 'none' : '1px solid rgba(15, 23, 42, 0.1)',
    background: primary ? '#1473ff' : '#ffffff',
    color: primary ? '#ffffff' : '#172341',
    boxShadow: primary ? '0 14px 30px rgba(20, 115, 255, 0.22)' : 'none',
  };
}

function buttonStyle(): CSSProperties {
  return {
    ...navLinkStyle(false),
    cursor: 'pointer',
  };
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently generated';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function StatusPill({
  active,
  label,
  tone,
}: {
  active: boolean;
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'info';
}) {
  const tones = {
    neutral: {
      background: 'rgba(15,23,42,0.06)',
      color: '#5d6c8b',
    },
    success: {
      background: 'rgba(16,185,129,0.12)',
      color: '#0f766e',
    },
    warning: {
      background: 'rgba(245,158,11,0.14)',
      color: '#9a6700',
    },
    info: {
      background: 'rgba(20,115,255,0.12)',
      color: '#1557b0',
    },
  } as const;

  const colors = active ? tones[tone] : tones.neutral;

  return (
    <span
      style={{
        borderRadius: 999,
        background: colors.background,
        color: colors.color,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}

export default function ActivityPage() {
  const [context, setContext] = useState<WorkspaceBootstrapContext | null>(null);
  const [records, setRecords] = useState<AppointmentRecord[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [repFilter, setRepFilter] = useState<'all' | 'mine' | string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const memberships = context?.memberships ?? [];
  const selectedMembership = useMemo<OrganizationMembership | null>(() => {
    if (memberships.length === 0) {
      return null;
    }

    return (
      memberships.find((membership) => membership.organization.id === selectedOrganizationId) ??
      context?.activeMembership ??
      memberships[0]
    );
  }, [context?.activeMembership, memberships, selectedOrganizationId]);

  const repOptions = useMemo(
    () => (isReadyContext(context) ? buildRepOptions(records, context.profile) : []),
    [context, records],
  );

  const refreshActivityRecords = useMemo(
    () =>
      async function refreshActivityRecords() {
        if (!isReadyContext(context) || !selectedMembership) {
          return;
        }

        setIsRefreshing(true);
        setError('');

        try {
          const nextRecords = await listOrganizationActivityRecords({
            membership: selectedMembership,
            profile: context.profile,
            repFilter,
          });
          setRecords(nextRecords);
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load activity.');
        } finally {
          setIsRefreshing(false);
        }
      },
    [context, repFilter, selectedMembership],
  );

  useEffect(() => {
    if (!isSupabaseBrowserConfigured) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function refreshContext() {
      try {
        const nextContext = await loadWebWorkspaceContext();

        if (cancelled) {
          return;
        }

        setContext(nextContext);

        if (nextContext?.activeMembership) {
          setSelectedOrganizationId((current) =>
            current.trim() ? current : nextContext.activeMembership!.organization.id,
          );
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load activity.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void refreshContext();

    const unsubscribe = onWebAuthStateChange(() => {
      setIsLoading(true);
      void refreshContext();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshActivityRecords();
  }, [refreshActivityRecords]);

  useEffect(() => {
    if (!isReadyContext(context) || !selectedMembership) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshActivityRecords();
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshActivityRecords();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [context, refreshActivityRecords, selectedMembership]);

  async function handleSignOut() {
    await signOutWeb();
    setContext(null);
    setRecords([]);
    setError('');
  }

  const showingLabel =
    repFilter === 'mine'
      ? 'My cards'
      : repOptions.find((option) => option.value === repFilter)?.label ?? 'All reps';

  return (
    <main style={shellStyle()}>
      <div style={cardStyle()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.08,
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              Repple Activity
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#5d6c8b' }}>
              Recent cards, customer status, and quick links back to each public appointment.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/app" style={navLinkStyle(false)}>
              Workspace
            </Link>
            <Link href="/app/settings" style={navLinkStyle(false)}>
              Settings
            </Link>
            <button onClick={() => void handleSignOut()} style={buttonStyle()} type="button">
              Sign Out
            </button>
          </div>
        </div>

        <div style={{ height: 22 }} />

        {!isSupabaseBrowserConfigured ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the web app
            environment to enable activity.
          </p>
        ) : isLoading ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
            Loading your dealership activity...
          </p>
        ) : !isReadyContext(context) ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
              Sign in and create a dealership account before viewing activity.
            </p>
            <Link href="/app" style={navLinkStyle(true)}>
              Go to Workspace
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              <div>
                <label htmlFor="organizationFilter" style={labelStyle()}>
                  Organization
                </label>
                <select
                  id="organizationFilter"
                  onChange={(event) => {
                    setSelectedOrganizationId(event.target.value);
                    setRepFilter('all');
                  }}
                  style={selectStyle()}
                  value={selectedMembership?.organization.id ?? ''}
                >
                  {memberships.map((membership) => (
                    <option key={membership.organization.id} value={membership.organization.id}>
                      {membership.organization.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="repFilter" style={labelStyle()}>
                  Rep
                </label>
                <select
                  id="repFilter"
                  onChange={(event) => setRepFilter(event.target.value)}
                  style={selectStyle()}
                  value={repFilter}
                >
                  {repOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                background: '#f8fbff',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                padding: '14px 16px',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#5d6c8b',
              }}
            >
              {isRefreshing
                ? 'Refreshing recent cards...'
                : `Showing ${records.length} recent cards for ${selectedMembership?.organization.name ?? 'your dealership'} · ${showingLabel}`}
            </div>

            {records.length === 0 && !isRefreshing ? (
              <div
                style={{
                  borderRadius: 18,
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
                  padding: 18,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: '#5d6c8b',
                }}
              >
                No cards match the current filters yet.
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 12 }}>
              {records.map((record) => (
                (() => {
                  const latestStatus = getAppointmentStatusSummary(record);

                  return (
                    <a
                      href={record.landingPageUrl}
                      key={record.id}
                      rel="noreferrer"
                      style={{
                        display: 'grid',
                        gap: 12,
                        borderRadius: 20,
                        background: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.06)',
                        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.06)',
                        padding: 18,
                        textDecoration: 'none',
                      }}
                      target="_blank"
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 16,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 17,
                              lineHeight: 1.2,
                              fontWeight: 700,
                              color: '#172341',
                            }}
                          >
                            {record.firstName}
                          </p>
                          <p
                            style={{
                              margin: '6px 0 0',
                              fontSize: 14,
                              lineHeight: 1.5,
                              color: '#5d6c8b',
                            }}
                          >
                            {record.vehicle}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Generated</p>
                          <p
                            style={{
                              margin: '4px 0 0',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#172341',
                            }}
                          >
                            {formatTimestamp(record.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'grid', gap: 2 }}>
                          <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Rep</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#172341' }}>
                            {record.salespersonName}
                          </p>
                        </div>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Appointment</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#172341' }}>
                            {record.appointmentTime}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: 16,
                          background: '#f8fbff',
                          border: '1px solid rgba(15, 23, 42, 0.06)',
                          padding: '12px 14px',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Latest activity</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#172341' }}>
                          {latestStatus.label}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#5d6c8b' }}>
                          {formatTimestamp(latestStatus.occurredAt)}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <StatusPill active={Boolean(record.viewedAt)} label="Viewed" tone="info" />
                        <StatusPill
                          active={Boolean(record.confirmedAt)}
                          label="Confirmed"
                          tone="success"
                        />
                        <StatusPill
                          active={Boolean(record.rescheduleRequestedAt)}
                          label="Reschedule Requested"
                          tone="warning"
                        />
                      </div>
                    </a>
                  );
                })()
              ))}
            </div>
          </div>
        )}

        {error ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.12)',
              padding: 14,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#b42318',
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
