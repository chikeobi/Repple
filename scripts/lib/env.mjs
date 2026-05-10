import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const entries = {};

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

export function loadEnv(cwd = process.cwd()) {
  const rootEnv = parseEnvFile(path.join(cwd, '.env'));
  const webEnv = parseEnvFile(path.join(cwd, 'apps/web/.env.local'));

  return {
    ...rootEnv,
    ...webEnv,
    ...process.env,
  };
}

export function getConfig(env) {
  const supabaseUrl = env.SUPABASE_URL || env.WXT_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    env.SUPABASE_ANON_KEY || env.WXT_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || env.WXT_PUBLIC_APP_URL || 'https://repple.ai';

  return {
    siteUrl: siteUrl.replace(/\/+$/, ''),
    supabaseAnonKey,
    supabaseServiceRoleKey,
    supabaseUrl,
  };
}
