import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

function getSupabaseHostPermissions() {
  const supabaseUrl = import.meta.env.WXT_SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  try {
    return [`${new URL(supabaseUrl).origin}/*`];
  } catch {
    return [];
  }
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => ({
    name: 'Repple',
    description:
      'Generate personalized appointment media pages for dealership customers.',
    permissions: ['storage', 'sidePanel', 'tabs'],
    host_permissions: getSupabaseHostPermissions(),
    action: {
      default_title: 'Open Repple workspace',
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
