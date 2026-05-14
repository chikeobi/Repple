'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from 'react';

import type { WorkspaceBootstrapContext, WorkspaceContext, WorkspaceSettingsInput } from '../../../../../shared/auth-contract';
import { HEYGEN_SCENE_TEMPLATE_KEYS } from '../../../../../shared/heygen';
import {
  generateWebRepJoinCode,
  isSupabaseBrowserConfigured,
  loadWebWorkspaceContext,
  onWebAuthStateChange,
  signOutWeb,
} from '../../../lib/browser-auth';
import {
  buildWorkspaceSettingsInput,
  updateWorkspaceSettings,
} from '../../../lib/workspace-settings';

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
    maxWidth: 640,
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

function inputStyle(disabled = false): CSSProperties {
  return {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: disabled ? '#f2f5fa' : '#fbfdff',
    padding: '12px 14px',
    fontSize: 15,
    color: '#172341',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
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

function codeStyle(): CSSProperties {
  return {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    background: '#f3f6fb',
    borderRadius: 6,
    padding: '2px 6px',
    color: '#172341',
  };
}

function isReadyContext(
  context: WorkspaceBootstrapContext | null,
): context is WorkspaceContext {
  return Boolean(context?.activeMembership);
}

function createEmptySettings(): WorkspaceSettingsInput {
  return {
    organizationName: '',
    organizationAddress: '',
    organizationPhone: '',
    organizationWebsiteUrl: '',
    organizationLogoUrl: '',
    organizationBrandColor: '',
    defaultSmsTemplate: '',
    heygenAvatarId: '',
    heygenVoiceId: '',
    heygenSceneTemplateKey: HEYGEN_SCENE_TEMPLATE_KEYS[0],
    profileFullName: '',
    profileTitle: '',
    profileAvatarUrl: '',
  };
}

export default function SettingsPage() {
  const [context, setContext] = useState<WorkspaceBootstrapContext | null>(null);
  const [form, setForm] = useState<WorkspaceSettingsInput>(createEmptySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingJoinCode, setIsGeneratingJoinCode] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [generatedJoinCode, setGeneratedJoinCode] = useState('');

  const canManageOrganization = useMemo(
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

        if (isReadyContext(nextContext)) {
          setForm(buildWorkspaceSettingsInput(nextContext));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load settings.');
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

  function updateField<Key extends keyof WorkspaceSettingsInput>(
    key: Key,
    value: WorkspaceSettingsInput[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Logo upload must be an image file.');
      return;
    }

    if (file.size > 1_500_000) {
      setError('Logo upload must be smaller than 1.5 MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';

      if (!result) {
        setError('Unable to read the selected logo file.');
        return;
      }

      setError('');
      updateField('organizationLogoUrl', result);
    };

    reader.onerror = () => {
      setError('Unable to read the selected logo file.');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReadyContext(context)) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      await updateWorkspaceSettings(context, form);
      const nextContext = await loadWebWorkspaceContext();

      setContext(nextContext);

      if (isReadyContext(nextContext)) {
        setForm(buildWorkspaceSettingsInput(nextContext));
      }

      setInfo('Settings saved.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save settings.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOutWeb();
    setContext(null);
    setInfo('');
    setError('');
    setGeneratedJoinCode('');
  }

  async function handleGenerateJoinCode() {
    if (!isReadyContext(context) || !canManageOrganization) {
      return;
    }

    setIsGeneratingJoinCode(true);
    setError('');
    setInfo('');

    try {
      const nextJoinCode = await generateWebRepJoinCode(context.activeMembership.organization.id);
      setGeneratedJoinCode(nextJoinCode);
      setInfo('Rep join code generated. Share it with reps who should join this dealership.');
      setContext(await loadWebWorkspaceContext());
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to generate a rep join code.',
      );
    } finally {
      setIsGeneratingJoinCode(false);
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
            Settings
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: '#5d6c8b',
            }}
          >
            Keep your dealership identity and rep profile in one place so the extension uses real
            account data.
          </p>
        </div>

        <div style={{ height: 18 }} />

        {!isSupabaseBrowserConfigured ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the web app
            environment to enable settings.
          </p>
        ) : isLoading ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
            Loading your dealership settings...
          </p>
        ) : !isReadyContext(context) ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#5d6c8b' }}>
              Sign in from the main app before editing dealership settings.
            </p>
            <Link href="/app" style={{ ...buttonStyle(false), display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
              Back to App
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#172341' }}>
                Dealership
              </p>

              <div>
                <label htmlFor="organizationName" style={labelStyle()}>
                  Dealership Name
                </label>
                <input
                  disabled={!canManageOrganization}
                  id="organizationName"
                  onChange={(event) => updateField('organizationName', event.target.value)}
                  style={inputStyle(!canManageOrganization)}
                  value={form.organizationName}
                />
              </div>

              <div>
                <label htmlFor="organizationAddress" style={labelStyle()}>
                  Address
                </label>
                <textarea
                  disabled={!canManageOrganization}
                  id="organizationAddress"
                  onChange={(event) => updateField('organizationAddress', event.target.value)}
                  rows={3}
                  style={inputStyle(!canManageOrganization)}
                  value={form.organizationAddress}
                />
              </div>

              <div>
                <label htmlFor="organizationPhone" style={labelStyle()}>
                  Phone
                </label>
                <input
                  disabled={!canManageOrganization}
                  id="organizationPhone"
                  onChange={(event) => updateField('organizationPhone', event.target.value)}
                  placeholder="(555) 555-5555"
                  style={inputStyle(!canManageOrganization)}
                  value={form.organizationPhone}
                />
              </div>

              <div>
                <label htmlFor="organizationWebsiteUrl" style={labelStyle()}>
                  Website URL
                </label>
                <input
                  disabled={!canManageOrganization}
                  id="organizationWebsiteUrl"
                  onChange={(event) => updateField('organizationWebsiteUrl', event.target.value)}
                  placeholder="https://www.dealership.com"
                  style={inputStyle(!canManageOrganization)}
                  value={form.organizationWebsiteUrl}
                />
              </div>

              <div>
                <label htmlFor="organizationLogoUrl" style={labelStyle()}>
                  Logo URL
                </label>
                <input
                  disabled={!canManageOrganization}
                  id="organizationLogoUrl"
                  onChange={(event) => updateField('organizationLogoUrl', event.target.value)}
                  placeholder="https://cdn.example.com/logo.png"
                  style={inputStyle(!canManageOrganization)}
                  value={form.organizationLogoUrl}
                />
              </div>

              <div>
                <label htmlFor="organizationLogoUpload" style={labelStyle()}>
                  Logo Upload
                </label>
                <input
                  accept="image/*"
                  disabled={!canManageOrganization}
                  id="organizationLogoUpload"
                  onChange={handleLogoUpload}
                  style={{ ...inputStyle(!canManageOrganization), padding: 10 }}
                  type="file"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="organizationBrandColorPicker" style={labelStyle()}>
                    Color
                  </label>
                  <input
                    disabled={!canManageOrganization}
                    id="organizationBrandColorPicker"
                    onChange={(event) => updateField('organizationBrandColor', event.target.value)}
                    style={{ ...inputStyle(!canManageOrganization), padding: 4 }}
                    type="color"
                    value={form.organizationBrandColor || '#1473ff'}
                  />
                </div>
                <div>
                  <label htmlFor="organizationBrandColor" style={labelStyle()}>
                    Brand Color
                  </label>
                  <input
                    disabled={!canManageOrganization}
                    id="organizationBrandColor"
                    onChange={(event) => updateField('organizationBrandColor', event.target.value)}
                    placeholder="#1473ff"
                    style={inputStyle(!canManageOrganization)}
                    value={form.organizationBrandColor}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="defaultSmsTemplate" style={labelStyle()}>
                  Default SMS Template
                </label>
                <textarea
                  disabled={!canManageOrganization}
                  id="defaultSmsTemplate"
                  onChange={(event) => updateField('defaultSmsTemplate', event.target.value)}
                  placeholder="Hey {{firstName}}, your {{vehicle}} is ready for {{appointmentTime}}. {{landingPageUrl}}"
                  rows={4}
                  style={inputStyle(!canManageOrganization)}
                  value={form.defaultSmsTemplate}
                />
                <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: '#6b7891' }}>
                  Available variables:{' '}
                  <span style={codeStyle()}>{'{{firstName}}'}</span>{' '}
                  <span style={codeStyle()}>{'{{vehicle}}'}</span>{' '}
                  <span style={codeStyle()}>{'{{appointmentTime}}'}</span>{' '}
                  <span style={codeStyle()}>{'{{salespersonName}}'}</span>{' '}
                  <span style={codeStyle()}>{'{{dealershipName}}'}</span>{' '}
                  <span style={codeStyle()}>{'{{landingPageUrl}}'}</span>.
                </p>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#172341' }}>
                  Personalized Video
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#5d6c8b' }}>
                  Optional HeyGen defaults for short personalized welcome videos. Leave these blank
                  until your dealership is ready to enable real video generation.
                </p>

                <div>
                  <label htmlFor="heygenAvatarId" style={labelStyle()}>
                    HeyGen Avatar ID
                  </label>
                  <input
                    disabled={!canManageOrganization}
                    id="heygenAvatarId"
                    onChange={(event) => updateField('heygenAvatarId', event.target.value)}
                    placeholder="avatar_..."
                    style={inputStyle(!canManageOrganization)}
                    value={form.heygenAvatarId}
                  />
                </div>

                <div>
                  <label htmlFor="heygenVoiceId" style={labelStyle()}>
                    HeyGen Voice ID
                  </label>
                  <input
                    disabled={!canManageOrganization}
                    id="heygenVoiceId"
                    onChange={(event) => updateField('heygenVoiceId', event.target.value)}
                    placeholder="voice_..."
                    style={inputStyle(!canManageOrganization)}
                    value={form.heygenVoiceId}
                  />
                </div>

                <div>
                  <label htmlFor="heygenSceneTemplateKey" style={labelStyle()}>
                    Video Scene Template
                  </label>
                  <select
                    disabled={!canManageOrganization}
                    id="heygenSceneTemplateKey"
                    onChange={(event) => updateField('heygenSceneTemplateKey', event.target.value)}
                    style={inputStyle(!canManageOrganization)}
                    value={form.heygenSceneTemplateKey}
                  >
                    {HEYGEN_SCENE_TEMPLATE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#172341' }}>
                Salesperson Profile
              </p>

              <div>
                <label htmlFor="profileFullName" style={labelStyle()}>
                  Full Name
                </label>
                <input
                  id="profileFullName"
                  onChange={(event) => updateField('profileFullName', event.target.value)}
                  style={inputStyle()}
                  value={form.profileFullName}
                />
              </div>

              <div>
                <label htmlFor="profileTitle" style={labelStyle()}>
                  Title
                </label>
                <input
                  id="profileTitle"
                  onChange={(event) => updateField('profileTitle', event.target.value)}
                  placeholder="Sales Consultant"
                  style={inputStyle()}
                  value={form.profileTitle}
                />
              </div>

              <div>
                <label htmlFor="profileAvatarUrl" style={labelStyle()}>
                  Avatar URL
                </label>
                <input
                  id="profileAvatarUrl"
                  onChange={(event) => updateField('profileAvatarUrl', event.target.value)}
                  placeholder="https://cdn.example.com/rep.jpg"
                  style={inputStyle()}
                  value={form.profileAvatarUrl}
                />
              </div>
            </div>

            {canManageOrganization ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#172341' }}>
                  Rep Onboarding
                </p>

                <div
                  style={{
                    borderRadius: 18,
                    background: '#f8fbff',
                    border: '1px solid rgba(15, 23, 42, 0.06)',
                    padding: 16,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7891' }}>Dealership slug</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#172341' }}>
                    {context.activeMembership.organization.slug}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#5d6c8b' }}>
                    Reps sign in to Repple, choose <span style={codeStyle()}>Join Dealership</span>,
                    then enter this slug and the current rep join code.
                  </p>
                  <button
                    disabled={isGeneratingJoinCode}
                    onClick={() => void handleGenerateJoinCode()}
                    style={buttonStyle(false)}
                    type="button"
                  >
                    {isGeneratingJoinCode ? 'Generating Join Code...' : 'Generate Rep Join Code'}
                  </button>
                  {generatedJoinCode ? (
                    <div
                      style={{
                        borderRadius: 14,
                        background: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        padding: 14,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7891' }}>
                        Current rep join code
                      </p>
                      <p
                        style={{
                          margin: '8px 0 0',
                          fontSize: 24,
                          fontWeight: 800,
                          letterSpacing: '0.12em',
                          color: '#172341',
                        }}
                      >
                        {generatedJoinCode}
                      </p>
                      <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: '#6b7891' }}>
                        Generating a new code replaces the previous one.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!canManageOrganization ? (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#6b7891' }}>
                Your role can update your rep profile, but dealership-wide settings stay read-only.
              </p>
            ) : null}

            {error ? (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#c62828' }}>{error}</p>
            ) : null}

            {info ? (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#1a7f37' }}>{info}</p>
            ) : null}

            <div style={{ display: 'grid', gap: 10 }}>
              <button disabled={isSubmitting} style={buttonStyle(true)} type="submit">
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </button>
              <Link
                href="/app"
                style={{
                  ...buttonStyle(false),
                  display: 'grid',
                  placeItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Back to App
              </Link>
              <button onClick={() => void handleSignOut()} style={buttonStyle(false)} type="button">
                Sign Out
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
