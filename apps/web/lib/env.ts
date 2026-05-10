function readEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

function readFirstEnv(names: string[]) {
  for (const name of names) {
    const value = readEnv(name);

    if (value) {
      return value;
    }
  }

  return null;
}

function isProductionDeployment() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function requireEnv(name: string, fallbackNames: string[] = []) {
  const value = readFirstEnv([name, ...fallbackNames]);

  if (value) {
    return value;
  }

  if (isProductionDeployment()) {
    const aliases = fallbackNames.length > 0 ? ` (or ${fallbackNames.join(', ')})` : '';

    throw new Error(`Missing required environment variable: ${name}${aliases}`);
  }

  return null;
}

export function getSiteUrl() {
  const siteUrl = requireEnv('NEXT_PUBLIC_SITE_URL') || 'https://repple.ai';

  return siteUrl.replace(/\/+$/, '');
}

export function getSupabasePublicEnv() {
  return {
    supabaseUrl: requireEnv('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']),
    supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY']),
  };
}
