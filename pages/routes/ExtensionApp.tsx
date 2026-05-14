import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import { SectionCard } from '../../components/SectionCard';
import type { WorkspaceBootstrapContext, WorkspaceContext } from '../../shared/auth-contract';
import {
  bootstrapExtensionOrganization,
  joinExtensionOrganization,
  loadExtensionWorkspaceContext,
  onExtensionAuthStateChange,
  signInExtensionWithPassword,
  signOutExtension,
  signUpExtensionWithPassword,
} from '../../utils/auth';
import { isSupabaseConfigured } from '../../utils/supabase';
import { WorkspacePage } from './WorkspacePage';

type AuthMode = 'sign-in' | 'sign-up';
type OrganizationOnboardingMode = 'create' | 'join';

function isReadyWorkspace(context: WorkspaceBootstrapContext | null): context is WorkspaceContext {
  return Boolean(context?.activeMembership);
}

export function ExtensionApp() {
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationWebsite, setOrganizationWebsite] = useState('');
  const [organizationJoinMode, setOrganizationJoinMode] =
    useState<OrganizationOnboardingMode>('create');
  const [organizationJoinSlug, setOrganizationJoinSlug] = useState('');
  const [organizationJoinCode, setOrganizationJoinCode] = useState('');
  const [context, setContext] = useState<WorkspaceBootstrapContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const signedInWithoutOrganization = useMemo(
    () => Boolean(context && !context.activeMembership),
    [context],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function refreshContext() {
      try {
        const nextContext = await loadExtensionWorkspaceContext();

        if (cancelled) {
          return;
        }

        setContext(nextContext);
        setOrganizationName((current) => current || nextContext?.profile.email?.split('@')[0] || '');
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

    const unsubscribe = onExtensionAuthStateChange(() => {
      setIsLoading(true);
      void refreshContext();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      if (authMode === 'sign-in') {
        await signInExtensionWithPassword(email, password);
      } else {
        const session = await signUpExtensionWithPassword(email, password);

        if (!session) {
          setInfo('Check your email to confirm your account, then sign in.');
        }
      }

      const nextContext = await loadExtensionWorkspaceContext();
      setContext(nextContext);
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
      await bootstrapExtensionOrganization({
        name: organizationName,
        slug: organizationName,
        websiteUrl: organizationWebsite,
      });

      const nextContext = await loadExtensionWorkspaceContext();
      setContext(nextContext);
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
      await joinExtensionOrganization({
        slug: organizationJoinSlug,
        code: organizationJoinCode,
      });

      const nextContext = await loadExtensionWorkspaceContext();
      setContext(nextContext);
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
    setError('');
    setInfo('');
    await signOutExtension();
    setContext(null);
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto w-full max-w-[430px]">
          <SectionCard className="space-y-4 p-4">
            <BrandMark />
            <div className="space-y-2">
              <p className="text-base font-semibold text-[var(--repple-ink)]">
                Repple setup is not complete yet.
              </p>
              <p className="text-sm leading-6 text-[var(--repple-muted)]">
                Finish the extension setup, then reopen the side panel to sign in and generate
                appointment cards.
              </p>
            </div>
          </SectionCard>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto w-full max-w-[430px]">
          <SectionCard className="space-y-4 p-4">
            <BrandMark />
            <div className="space-y-2">
              <p className="text-base font-semibold text-[var(--repple-ink)]">
                Loading your dealership workspace
              </p>
              <p className="text-sm leading-6 text-[var(--repple-muted)]">
                Repple is opening your side-panel workspace and checking your dealership access.
              </p>
            </div>
          </SectionCard>
        </div>
      </main>
    );
  }

  if (isReadyWorkspace(context)) {
    return <WorkspacePage onSignOut={handleSignOut} workspace={context} />;
  }

  return (
    <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto w-full max-w-[430px]">
        <SectionCard className="space-y-4 p-4">
          <div className="space-y-2">
            <BrandMark />
            <p className="text-sm leading-6 text-[var(--repple-muted)]">
              {signedInWithoutOrganization
                ? 'Create your dealership account or join an existing dealership before generating cards.'
                : 'Sign in to your Repple dealership account to use the side panel.'}
            </p>
          </div>

          {signedInWithoutOrganization ? (
            <>
              <div className="rounded-[14px] bg-[rgba(255,255,255,0.58)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className={`rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                      organizationJoinMode === 'create'
                        ? 'bg-white text-[var(--repple-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                        : 'text-[var(--repple-muted)]'
                    }`}
                    onClick={() => setOrganizationJoinMode('create')}
                    type="button"
                  >
                    Create
                  </button>
                  <button
                    className={`rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                      organizationJoinMode === 'join'
                        ? 'bg-white text-[var(--repple-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                        : 'text-[var(--repple-muted)]'
                    }`}
                    onClick={() => setOrganizationJoinMode('join')}
                    type="button"
                  >
                    Join
                  </button>
                </div>
              </div>

              {organizationJoinMode === 'create' ? (
                <form className="space-y-3.5" onSubmit={handleOrganizationSubmit}>
                  <FormField
                    label="Dealership Name"
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="Acme Motors"
                    value={organizationName}
                  />
                  <FormField
                    label="Website URL"
                    onChange={(event) => setOrganizationWebsite(event.target.value)}
                    placeholder="https://www.acmemotors.com"
                    value={organizationWebsite}
                  />
                  <Button disabled={isSubmitting || !organizationName.trim()} fullWidth type="submit">
                    {isSubmitting ? 'Creating Dealership...' : 'Create Dealership'}
                  </Button>
                </form>
              ) : (
                <form className="space-y-3.5" onSubmit={handleOrganizationJoinSubmit}>
                  <FormField
                    label="Dealership Slug"
                    onChange={(event) => setOrganizationJoinSlug(event.target.value)}
                    placeholder="north-coast-auto"
                    value={organizationJoinSlug}
                  />
                  <FormField
                    label="Rep Join Code"
                    onChange={(event) => setOrganizationJoinCode(event.target.value.toUpperCase())}
                    placeholder="AB12CD34"
                    value={organizationJoinCode}
                  />
                  <Button
                    disabled={
                      isSubmitting ||
                      !organizationJoinSlug.trim() ||
                      !organizationJoinCode.trim()
                    }
                    fullWidth
                    type="submit"
                  >
                    {isSubmitting ? 'Joining Dealership...' : 'Join Dealership'}
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="rounded-[14px] bg-[rgba(255,255,255,0.58)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className={`rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                      authMode === 'sign-in'
                        ? 'bg-white text-[var(--repple-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                        : 'text-[var(--repple-muted)]'
                    }`}
                    onClick={() => setAuthMode('sign-in')}
                    type="button"
                  >
                    Sign In
                  </button>
                  <button
                    className={`rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                      authMode === 'sign-up'
                        ? 'bg-white text-[var(--repple-ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                        : 'text-[var(--repple-muted)]'
                    }`}
                    onClick={() => setAuthMode('sign-up')}
                    type="button"
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              <form className="space-y-3.5" onSubmit={handleAuthSubmit}>
                <FormField
                  autoComplete="email"
                  label="Email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="rep@dealership.com"
                  type="email"
                  value={email}
                />
                <FormField
                  autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
                  label="Password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                />
                <Button
                  disabled={isSubmitting || !email.trim() || password.length < 8}
                  fullWidth
                  type="submit"
                >
                  {isSubmitting
                    ? authMode === 'sign-in'
                      ? 'Signing In...'
                      : 'Creating Account...'
                    : authMode === 'sign-in'
                      ? 'Sign In'
                      : 'Create Account'}
                </Button>
              </form>
            </>
          )}

          {info ? (
            <div className="rounded-2xl border border-[rgba(10,132,255,0.12)] bg-[rgba(10,132,255,0.06)] px-4 py-3 text-sm text-[var(--repple-accent-deep)]">
              {info}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </main>
  );
}
