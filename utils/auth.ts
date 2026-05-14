import type { Session } from '@supabase/supabase-js';
import { browser } from 'wxt/browser';

import {
  bootstrapOrganization,
  getOrganizationSettings,
  joinOrganizationWithCode,
  listMembershipsForProfile,
  resolveActiveMembership,
  upsertProfileFromUser,
} from '../shared/auth-browser';
import type {
  BootstrapOrganizationInput,
  JoinOrganizationInput,
  WorkspaceBootstrapContext,
} from '../shared/auth-contract';
import { isSupabaseConfigured, supabase } from './supabase';

const ACTIVE_ORGANIZATION_KEY = 'repple:active-organization-id';

async function getStoredActiveOrganizationId() {
  const result = await browser.storage.local.get(ACTIVE_ORGANIZATION_KEY);
  const value = result[ACTIVE_ORGANIZATION_KEY];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function setStoredActiveOrganizationId(organizationId: string) {
  await browser.storage.local.set({
    [ACTIVE_ORGANIZATION_KEY]: organizationId,
  });
}

export async function getExtensionSession() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getExtensionAccessToken() {
  const session = await getExtensionSession();
  return session?.access_token ?? null;
}

export async function loadExtensionWorkspaceContext(): Promise<WorkspaceBootstrapContext | null> {
  if (!supabase) {
    return null;
  }

  const session = await getExtensionSession();

  if (!session?.user) {
    return null;
  }

  const profile = await upsertProfileFromUser(supabase, session.user);
  const memberships = await listMembershipsForProfile(supabase, profile.id);

  if (memberships.length === 0) {
    return {
      session,
      profile,
      memberships,
      activeMembership: null,
      organizationSettings: null,
    };
  }

  const storedOrganizationId = await getStoredActiveOrganizationId();
  const activeMembership = resolveActiveMembership(memberships, storedOrganizationId);

  if (!activeMembership) {
    throw new Error('Unable to resolve an active dealership account.');
  }

  await setStoredActiveOrganizationId(activeMembership.organization.id);
  const organizationSettings = await getOrganizationSettings(
    supabase,
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

export async function signInExtensionWithPassword(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured for the extension.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpExtensionWithPassword(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured for the extension.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function signOutExtension() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
  await browser.storage.local.remove(ACTIVE_ORGANIZATION_KEY);
}

export async function bootstrapExtensionOrganization(input: BootstrapOrganizationInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured for the extension.');
  }

  await bootstrapOrganization(supabase, input);
}

export async function joinExtensionOrganization(input: JoinOrganizationInput) {
  if (!supabase) {
    throw new Error('Supabase is not configured for the extension.');
  }

  await joinOrganizationWithCode(supabase, input);
}

export function onExtensionAuthStateChange(
  callback: (session: Session | null) => void,
) {
  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}
