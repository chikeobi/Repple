import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

function getHostPermissions() {
  const supabaseUrl = import.meta.env.WXT_SUPABASE_URL;
  const permissions = new Set<string>(['<all_urls>']);

  if (!supabaseUrl) {
    return Array.from(permissions);
  }

  try {
    permissions.add(`${new URL(supabaseUrl).origin}/*`);
    return Array.from(permissions);
  } catch {
    return Array.from(permissions);
  }
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => ({
    name: 'Repple',
    description:
      'Generate personalized appointment media pages for dealership customers.',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel', 'tabs'],
    host_permissions: getHostPermissions(),
    action: {
      default_title: 'Open Repple workspace',
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
