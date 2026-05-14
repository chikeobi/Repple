import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

function getHostPermissions() {
  return ['http://*/*', 'https://*/*'];
}

function getSiteUrl() {
  const rawSiteUrl =
    import.meta.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    import.meta.env.WXT_PUBLIC_APP_URL?.trim() ||
    import.meta.env.WXT_SITE_URL?.trim();

  if (!rawSiteUrl) {
    return 'https://repple.ai';
  }

  try {
    return new URL(rawSiteUrl).origin;
  } catch {
    return 'https://repple.ai';
  }
}

function getExternallyConnectableMatches() {
  const siteOrigin = getSiteUrl();
  return [`${siteOrigin}/*`];
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => ({
    name: 'Repple',
    short_name: 'Repple',
    description:
      'Generate dealership appointment cards from CRM data in the Chrome side panel.',
    permissions: ['scripting', 'storage', 'sidePanel', 'tabs'],
    host_permissions: getHostPermissions(),
    homepage_url: getSiteUrl(),
    externally_connectable: {
      matches: getExternallyConnectableMatches(),
    },
    icons: {
      16: 'icons/repple-16.png',
      32: 'icons/repple-32.png',
      48: 'icons/repple-48.png',
      128: 'icons/repple-128.png',
    },
    action: {
      default_title: 'Open Repple side panel',
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
