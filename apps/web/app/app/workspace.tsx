'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';

import type { AppointmentEventCounts } from '../../../../shared/appointment-events';
import {
  formatOrganizationSubscriptionStatus,
  isOrganizationSubscriptionActive,
} from '../../../../shared/billing';
import type { WorkspaceBootstrapContext } from '../../../../shared/auth-contract';
import type { WorkspaceContext } from '../../../../shared/auth-contract';
import {
  bootstrapWebOrganization,
  joinWebOrganization,
  isSupabaseBrowserConfigured,
  loadWebWorkspaceContext,
  onWebAuthStateChange,
  signInWebWithPassword,
  signOutWeb,
  signUpWebWithPassword,
} from '../../lib/browser-auth';
import {
  createEmptyAppointmentEventCounts,
  getOrganizationAnalyticsCounts,
} from '../../lib/analytics';
import {
  completeStripeCheckout,
  openStripeBillingPortal,
  startStripeCheckout,
  syncStripeBillingStatus,
} from '../../lib/billing';

type AuthMode = 'sign-in' | 'sign-up';
type OrganizationOnboardingMode = 'create' | 'join';

function shellStyle(): CSSProperties {
  return {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(180deg, #f5f7fb 0%, #eef3fa 55%, #f8fbff 100%)',
  };
}

function cardStyle(): CSSProperties {
  return {
    width: '100%',
    maxWidth: 460,
    borderRadius: 28,
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 24px 64px rgba(15, 23, 42, 0.08)',
    padding: 24,
  };
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

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    height: 48,
    borderRadius: 14,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: '#fbfdff',
    padding: '0 14px',
    fontSize: 15,
    color: '#172341',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function buttonStyle(primary = true): CSSProperties {
  return {
    width: '100%',
    height: 48,
    borderRadius: 14,
    border: primary ? 'none' : '1px solid rgba(15, 23, 42, 0.1)',
    background: primary ? '#1473ff' : '#ffffff',
    color: primary ? '#ffffff' : '#172341',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: primary ? '0 14px 30px rgba(20, 115, 255, 0.22)' : 'none',
  };
}

function isReadyContext(
  context: WorkspaceBootstrapContext | null,
): context is WorkspaceContext {
  return Boolean(context?.activeMembership);
}

function statCardStyle(): CSSProperties {
  return {
    borderRadius: 18,
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
    padding: 16,
  };
}

export function AppDashboard() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationWebsite, setOrganizationWebsite] = useState('');
  const [organizationJoinMode, setOrganizationJoinMode] =
    useState<OrganizationOnboardingMode>('create');
  const [organizationJoinSlug, setOrganizationJoinSlug] = useState('');
  const [organizationJoinCode, setOrganizationJoinCode] = useState('');
  const [context, setContext] = useState<WorkspaceBootstrapContext | null>(null);
  const [analyticsCounts, setAnalyticsCounts] = useState<AppointmentEventCounts>(
    createEmptyAppointmentEventCounts,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const needsOrganization = useMemo(
    () => Boolean(context && !context.activeMembership),
    [context],
  );
  const canManageBilling = useMemo(
    () => context?.activeMembership?.role !== 'rep',
    [context],
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
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load Repple.');
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
    if (!isReadyContext(context)) {
      setAnalyticsCounts(createEmptyAppointmentEventCounts());
      return;
    }

    let cancelled = false;
    setIsAnalyticsLoading(true);

    void getOrganizationAnalyticsCounts(context.activeMembership.organization.id)
      .then((counts) => {
        if (!cancelled) {
          setAnalyticsCounts(counts);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load analytics.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyticsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [context]);

  useEffect(() => {
    if (!isReadyContext(context) || typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const checkoutState = url.searchParams.get('checkout');
    const sessionId = url.searchParams.get('session_id');

    if (checkoutState === 'canceled') {
      setInfo('Stripe Checkout was canceled. Billing was not changed.');
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (checkoutState !== 'success' || !sessionId || !canManageBilling) {
      return;
    }

    let cancelled = false;
    setIsBillingLoading(true);

    void completeStripeCheckout({
      organizationId: context.activeMembership.organization.id,
      sessionId,
    })
      .then(async () => {
        if (cancelled) {
          return;
        }

        setInfo('Billing is active for this dealership.');
        setContext(await loadWebWorkspaceContext());
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : 'Unable to finalize billing.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBillingLoading(false);
          url.searchParams.delete('checkout');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canManageBilling, context]);

  useEffect(() => {
    if (!isReadyContext(context) || !canManageBilling) {
      return;
    }

    if (!context.activeMembership.organization.stripe_subscription_id) {
      return;
    }

    let cancelled = false;

    void syncStripeBillingStatus(context.activeMembership.organization.id)
      .then(async () => {
        if (cancelled) {
          return;
        }

        setContext(await loadWebWorkspaceContext());
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    canManageBilling,
    context?.activeMembership?.organization.id,
    context?.activeMembership?.organization.stripe_subscription_id,
  ]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      if (mode === 'sign-in') {
        await signInWebWithPassword(email, password);
      } else {
        const session = await signUpWebWithPassword(email, password);

        if (!session) {
          setInfo('Check your email to confirm your account, then sign in.');
        }
      }

      setContext(await loadWebWorkspaceContext());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to authenticate.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOrganizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      await bootstrapWebOrganization({
        name: organizationName,
        slug: organizationName,
        websiteUrl: organizationWebsite,
      });

      setContext(await loadWebWorkspaceContext());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to create your dealership account.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOrganizationJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      await joinWebOrganization({
        slug: organizationJoinSlug,
        code: organizationJoinCode,
      });

      setContext(await loadWebWorkspaceContext());
      setInfo('Joined dealership account.');
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to join this dealership account.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOutWeb();
    setContext(null);
    setError('');
    setInfo('');
  }

  async function handleStartCheckout() {
    if (!isReadyContext(context)) {
      return;
    }

    setIsBillingLoading(true);
    setError('');
    setInfo('');

    try {
      const url = await startStripeCheckout(context.activeMembership.organization.id);
      window.location.assign(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to start billing.');
      setIsBillingLoading(false);
    }
  }

  async function handleOpenBillingPortal() {
    if (!isReadyContext(context)) {
      return;
    }

    setIsBillingLoading(true);
    setError('');
    setInfo('');

    try {
      const url = await openStripeBillingPortal(context.activeMembership.organization.id);
      window.location.assign(url);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to open the billing portal.',
      );
      setIsBillingLoading(false);
    }
  }

  return (
    <main style={shellStyle()}>
      <div style={cardStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            Repple App
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: '#5d6c8b',
            }}
          >
            Sign in to manage your dealership account and use the same credentials in the
            extension.
          </p>
        </div>

        <div style={{ height: 18 }} />

        {!isSupabaseBrowserConfigured ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the web app
            environment to enable auth.
          </p>
        ) : isLoading ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
            Loading your dealership workspace...
          </p>
        ) : isReadyContext(context) ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                borderRadius: 18,
                background: '#f8fbff',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                padding: 18,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#6b7891' }}>Signed in as</p>
              <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#172341' }}>
                {context.profile.full_name?.trim() || context.profile.email}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#6b7891' }}>
                Active dealership
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#172341' }}>
                {context.activeMembership.organization.name}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7891' }}>
                Slug: {context.activeMembership.organization.slug}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#5d6c8b' }}>
                Role: {context.activeMembership.role}
              </p>
              {context.profile.title ? (
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#5d6c8b' }}>
                  Profile: {context.profile.title}
                </p>
              ) : null}
              {context.activeMembership.organization.address ? (
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#5d6c8b' }}>
                  {context.activeMembership.organization.address}
                </p>
              ) : null}
            </div>

            <div
              style={{
                borderRadius: 18,
                background: '#f8fbff',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                padding: 18,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#6b7891' }}>Billing status</p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#172341',
                }}
              >
                {formatOrganizationSubscriptionStatus(
                  context.activeMembership.organization.subscription_status,
                )}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#5d6c8b' }}>
                {isOrganizationSubscriptionActive(
                  context.activeMembership.organization.subscription_status,
                )
                  ? 'This dealership can generate Repple cards.'
                  : 'Card generation stays locked until the dealership has an active billing status.'}
              </p>
              {context.activeMembership.organization.subscription_current_period_ends_at ? (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#6b7891' }}>
                  Current period ends{' '}
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(
                    new Date(context.activeMembership.organization.subscription_current_period_ends_at),
                  )}
                </p>
              ) : null}
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {canManageBilling ? (
                  <>
                    <button
                      disabled={isBillingLoading}
                      onClick={() => void handleStartCheckout()}
                      style={buttonStyle(true)}
                      type="button"
                    >
                      {isBillingLoading ? 'Opening Checkout...' : 'Start Billing'}
                    </button>
                    {context.activeMembership.organization.stripe_customer_id ? (
                      <button
                        disabled={isBillingLoading}
                        onClick={() => void handleOpenBillingPortal()}
                        style={buttonStyle(false)}
                        type="button"
                      >
                        Billing Portal
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#5d6c8b' }}>
                    Contact your dealership owner or admin to manage billing.
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                background: '#f8fbff',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                padding: 18,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#6b7891' }}>Usage summary</p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#5d6c8b',
                }}
              >
                {isAnalyticsLoading
                  ? 'Refreshing dealership activity counts...'
                  : 'Simple counts from your live Repple activity.'}
              </p>
              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <div style={statCardStyle()}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Cards Created</p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#172341',
                    }}
                  >
                    {analyticsCounts.appointment_created}
                  </p>
                </div>
                <div style={statCardStyle()}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Card Opens</p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#172341',
                    }}
                  >
                    {analyticsCounts.card_opened}
                  </p>
                </div>
                <div style={statCardStyle()}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Messages Copied</p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#172341',
                    }}
                  >
                    {analyticsCounts.message_copied}
                  </p>
                </div>
                <div style={statCardStyle()}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Card Views</p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#172341',
                    }}
                  >
                    {analyticsCounts.card_viewed}
                  </p>
                </div>
                <div style={statCardStyle()}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Confirmed</p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#172341',
                    }}
                  >
                    {analyticsCounts.confirmed}
                  </p>
                </div>
                <div style={statCardStyle()}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>Reschedules</p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#172341',
                    }}
                  >
                    {analyticsCounts.reschedule_requested}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <Link
                href="/app/activity"
                style={{
                  ...buttonStyle(false),
                  display: 'grid',
                  placeItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Activity
              </Link>
              <Link
                href="/app/settings"
                style={{
                  ...buttonStyle(true),
                  display: 'grid',
                  placeItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Settings
              </Link>
              <button onClick={() => void handleSignOut()} style={buttonStyle(false)} type="button">
                Sign Out
              </button>
            </div>
          </div>
        ) : needsOrganization ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: 6,
                borderRadius: 16,
                background: '#f5f8fc',
              }}
            >
              <button
                onClick={() => setOrganizationJoinMode('create')}
                style={{
                  ...buttonStyle(organizationJoinMode === 'create'),
                  height: 42,
                  boxShadow:
                    organizationJoinMode === 'create'
                      ? '0 10px 22px rgba(20, 115, 255, 0.14)'
                      : 'none',
                }}
                type="button"
              >
                Create Dealership
              </button>
              <button
                onClick={() => setOrganizationJoinMode('join')}
                style={{
                  ...buttonStyle(organizationJoinMode === 'join'),
                  height: 42,
                  boxShadow:
                    organizationJoinMode === 'join'
                      ? '0 10px 22px rgba(20, 115, 255, 0.14)'
                      : 'none',
                }}
                type="button"
              >
                Join Dealership
              </button>
            </div>

            {organizationJoinMode === 'create' ? (
              <form onSubmit={handleOrganizationSubmit} style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label htmlFor="organizationName" style={labelStyle()}>
                    Dealership Name
                  </label>
                  <input
                    id="organizationName"
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="Acme Motors"
                    style={inputStyle()}
                    value={organizationName}
                  />
                </div>

                <div>
                  <label htmlFor="organizationWebsite" style={labelStyle()}>
                    Website URL
                  </label>
                  <input
                    id="organizationWebsite"
                    onChange={(event) => setOrganizationWebsite(event.target.value)}
                    placeholder="https://www.acmemotors.com"
                    style={inputStyle()}
                    value={organizationWebsite}
                  />
                </div>

                <button
                  disabled={isSubmitting || !organizationName.trim()}
                  style={buttonStyle(true)}
                  type="submit"
                >
                  {isSubmitting ? 'Creating Dealership...' : 'Create Dealership'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOrganizationJoinSubmit} style={{ display: 'grid', gap: 16 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#5d6c8b' }}>
                  Ask your dealership owner or admin for the dealership slug and rep join code.
                </p>

                <div>
                  <label htmlFor="organizationJoinSlug" style={labelStyle()}>
                    Dealership Slug
                  </label>
                  <input
                    autoCapitalize="none"
                    id="organizationJoinSlug"
                    onChange={(event) => setOrganizationJoinSlug(event.target.value)}
                    placeholder="north-coast-auto"
                    style={inputStyle()}
                    value={organizationJoinSlug}
                  />
                </div>

                <div>
                  <label htmlFor="organizationJoinCode" style={labelStyle()}>
                    Rep Join Code
                  </label>
                  <input
                    autoCapitalize="characters"
                    id="organizationJoinCode"
                    onChange={(event) => setOrganizationJoinCode(event.target.value)}
                    placeholder="A1B2C3D4"
                    style={inputStyle()}
                    value={organizationJoinCode}
                  />
                </div>

                <button
                  disabled={
                    isSubmitting ||
                    !organizationJoinSlug.trim() ||
                    !organizationJoinCode.trim()
                  }
                  style={buttonStyle(true)}
                  type="submit"
                >
                  {isSubmitting ? 'Joining Dealership...' : 'Join Dealership'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: 6,
                borderRadius: 16,
                background: '#f5f8fc',
              }}
            >
              <button
                onClick={() => setMode('sign-in')}
                style={{
                  ...buttonStyle(mode === 'sign-in'),
                  height: 42,
                  boxShadow: mode === 'sign-in' ? '0 10px 22px rgba(20, 115, 255, 0.14)' : 'none',
                }}
                type="button"
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('sign-up')}
                style={{
                  ...buttonStyle(mode === 'sign-up'),
                  height: 42,
                  boxShadow: mode === 'sign-up' ? '0 10px 22px rgba(20, 115, 255, 0.14)' : 'none',
                }}
                type="button"
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label htmlFor="email" style={labelStyle()}>
                  Email
                </label>
                <input
                  autoComplete="email"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="rep@dealership.com"
                  style={inputStyle()}
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label htmlFor="password" style={labelStyle()}>
                  Password
                </label>
                <input
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  style={inputStyle()}
                  type="password"
                  value={password}
                />
              </div>

              <button
                disabled={isSubmitting || !email.trim() || password.length < 8}
                style={buttonStyle(true)}
                type="submit"
              >
                {isSubmitting
                  ? mode === 'sign-in'
                    ? 'Signing In...'
                    : 'Creating Account...'
                  : mode === 'sign-in'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {info ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              background: 'rgba(20, 115, 255, 0.08)',
              border: '1px solid rgba(20, 115, 255, 0.12)',
              padding: 14,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#1557b0',
            }}
          >
            {info}
          </div>
        ) : null}

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
