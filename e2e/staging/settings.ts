// Read process environment only; never inherit the app's tracked .env as authority.
export function stagingSettings(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.STAGING_ACCEPTANCE === 'disposable-project-approved';
  if (!enabled) return null;
  const required = ['STAGING_SUPABASE_URL', 'STAGING_ALLOWED_HOST', 'STAGING_PUBLIC_KEY',
    'STAGING_STUDENT_EMAIL', 'STAGING_STUDENT_PASSWORD', 'STAGING_TEACHER_EMAIL',
    'STAGING_TEACHER_PASSWORD', 'STAGING_ADMIN_EMAIL', 'STAGING_ADMIN_PASSWORD'] as const;
  if (required.some(name => !env[name])) throw new Error('Missing external staging configuration; see TESTING.md.');
  const url = new URL(env.STAGING_SUPABASE_URL!);
  if (url.protocol !== 'https:' || url.host !== env.STAGING_ALLOWED_HOST || url.pathname !== '/' || url.search || url.hash || url.username || url.password)
    throw new Error('Staging URL must be an exact approved HTTPS origin.');
  const emails = ['STUDENT', 'TEACHER', 'ADMIN'].map(role => env[`STAGING_${role}_EMAIL`]!.toLowerCase());
  if (new Set(emails).size !== 3) throw new Error('Three distinct, disposable staging accounts are required.');
  // A service/secret key has no place in these browser acceptance tests.
  const key = env.STAGING_PUBLIC_KEY!;
  if (key.startsWith('sb_secret_')) throw new Error('Use a public publishable/anon key.');
  if (!key.startsWith('sb_publishable_')) {
    try {
      if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon') throw new Error();
    } catch { throw new Error('Use a public publishable/anon key.'); }
  }
  return { url: url.origin, key, realtime: env.STAGING_REALTIME === 'enabled',
    identities: Object.fromEntries(['student', 'teacher', 'admin'].map(role => [role, {
      email: env[`STAGING_${role.toUpperCase()}_EMAIL`]!, password: env[`STAGING_${role.toUpperCase()}_PASSWORD`]!,
    }])) as Record<'student' | 'teacher' | 'admin', { email: string; password: string }> };
}
