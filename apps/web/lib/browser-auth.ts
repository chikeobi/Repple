'use client';

import type { Session } from '@supabase/supabase-js';

import {
  bootstrapOrganization,
  generateOrganizationRepJoinCode,
  getOrganizationSettings,
  joinOrganizationWithCode,
  listMembershipsForProfile,
  resolveActiveMembership,
  upsertProfileFromUser,
} from '../../../shared/auth-browser';
import type {
  BootstrapOrganizationInput,
  JoinOrganizationInput,
  WorkspaceBootstrapContext,
} from '../../../shared/auth-contract';
import { isSupabaseBrowserConfigured, supabaseBrowser } from './supabase-browser';

const ACTIVE_ORGANIZATION_KEY = 'repple:web:active-organization-id';

function getStoredActiveOrganizationId() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
  return value?.trim() ? value.trim() : null;
}

function setStoredActiveOrganizationId(organizationId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
}

function clearStoredActiveOrganizationId() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
}

export async function getWebSession() {
  if (!supabaseBrowser) {
    return null;
  }

  const { data, error } = await supabaseBrowser.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getWebAccessToken() {
  const session = await getWebSession();
  return session?.access_token ?? null;
}

export async function loadWebWorkspaceContext(): Promise<WorkspaceBootstrapContext | null> {
  if (!supabaseBrowser) {
    return null;
  }

  const session = await getWebSession();

  if (!session?.user) {
    return null;
  }

  const profile = await upsertProfileFromUser(supabaseBrowser, session.user);
  const memberships = await listMembershipsForProfile(supabaseBrowser, profile.id);

  if (memberships.length === 0) {
    return {
      session,
      profile,
      memberships,
      activeMembership: null,
      organizationSettings: null,
    };
  }

  const activeMembership = resolveActiveMembership(
    memberships,
    getStoredActiveOrganizationId(),
  );

  if (!activeMembership) {
    throw new Error('Unable to resolve an active dealership account.');
  }

  setStoredActiveOrganizationId(activeMembership.organization.id);
  const organizationSettings = await getOrganizationSettings(
    supabaseBrowser,
    activeMembership.organization.id,
  );

  return {
    session,
    profile,
    memberships,
    activeMembership,
    organizationSettings,
  };
}

export async function signInWebWithPassword(email: string, password: string) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  const { error } = await supabaseBrowser.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpWebWithPassword(email: string, password: string) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  const { data, error } = await supabaseBrowser.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function signOutWeb() {
  if (!supabaseBrowser) {
    return;
  }

  await supabaseBrowser.auth.signOut();
  clearStoredActiveOrganizationId();
}

export async function bootstrapWebOrganization(input: BootstrapOrganizationInput) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  await bootstrapOrganization(supabaseBrowser, input);
}

export async function generateWebRepJoinCode(organizationId: string) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  return generateOrganizationRepJoinCode(supabaseBrowser, organizationId);
}

export async function joinWebOrganization(input: JoinOrganizationInput) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  await joinOrganizationWithCode(supabaseBrowser, input);
}

export function onWebAuthStateChange(callback: (session: Session | null) => void) {
  if (!supabaseBrowser) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export { isSupabaseBrowserConfigured };
