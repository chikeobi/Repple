import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

function loadRootEnvFile() {
  const rootEnvPath = path.join(process.cwd(), '..', '..', '.env');

  if (!fs.existsSync(rootEnvPath)) {
    return;
  }

  const source = fs.readFileSync(rootEnvPath, 'utf8');

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = value;
  }
}

function applyEnvFallback(name: string, fallbackNames: string[]) {
  if (process.env[name]?.trim()) {
    return;
  }

  for (const fallbackName of fallbackNames) {
    const fallbackValue = process.env[fallbackName]?.trim();

    if (fallbackValue) {
      process.env[name] = fallbackValue;
      return;
    }
  }
}

loadRootEnvFile();
applyEnvFallback('NEXT_PUBLIC_SITE_URL', ['WXT_PUBLIC_APP_URL', 'WXT_SITE_URL']);
applyEnvFallback('NEXT_PUBLIC_SUPABASE_URL', ['SUPABASE_URL', 'WXT_SUPABASE_URL']);
applyEnvFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY', [
  'SUPABASE_ANON_KEY',
  'WXT_SUPABASE_ANON_KEY',
]);
applyEnvFallback('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL', 'WXT_SUPABASE_URL']);
applyEnvFallback('SUPABASE_ANON_KEY', [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'WXT_SUPABASE_ANON_KEY',
]);

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd(), '..', '..'),
  },
};

export default nextConfig;
