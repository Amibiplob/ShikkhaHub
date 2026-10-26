// Pure target-safety checks: no browser, account or network calls.
import { describe, it, expect } from 'vitest';
import { stagingSettings } from './settings';

const approved = (): NodeJS.ProcessEnv => ({
  STAGING_ACCEPTANCE: 'disposable-project-approved',
  STAGING_SUPABASE_URL: 'https://disposable.example.test',
  STAGING_ALLOWED_HOST: 'disposable.example.test',
  STAGING_PUBLIC_KEY: 'sb_publishable_test-placeholder',
  ...Object.fromEntries(['STUDENT', 'TEACHER', 'ADMIN'].flatMap(role => [
    [`STAGING_${role}_EMAIL`, `${role.toLowerCase()}@example.test`],
    [`STAGING_${role}_PASSWORD`, 'external-test-placeholder'],
  ])),
});
describe('staging target safeguards', () => {
  it('stays disabled without explicit disposable-project authorization', () => {
    expect(stagingSettings({})).toBeNull();
    expect(stagingSettings({ ...approved(), STAGING_ACCEPTANCE: '' })).toBeNull();
  });
  it('accepts only the exact externally approved origin', () => {
    expect(stagingSettings(approved())?.url).toBe('https://disposable.example.test');
    for (const url of ['http://disposable.example.test', 'https://other.example.test',
      'https://disposable.example.test/path', 'https://disposable.example.test?x=1',
      'https://user:password@disposable.example.test', 'https://disposable.example.test#fragment']) {
      expect(() => stagingSettings({ ...approved(), STAGING_SUPABASE_URL: url })).toThrow('exact approved HTTPS origin');
    }
  });
  it('rejects partial configuration', () => {
    expect(() => stagingSettings({ ...approved(), STAGING_ADMIN_PASSWORD: '' })).toThrow('Missing external staging configuration');
  });
  it('requires distinct identities', () => {
    expect(() => stagingSettings({ ...approved(), STAGING_ADMIN_EMAIL: 'STUDENT@example.test' })).toThrow('distinct');
  });
  it('rejects service keys and malformed JWTs', () => {
    for (const key of ['sb_secret_external-placeholder', 'malformed', `x.${btoa('{"role":"service_role"}')}.x`])
      expect(() => stagingSettings({ ...approved(), STAGING_PUBLIC_KEY: key })).toThrow('public publishable/anon key');
  });
  it('accepts legacy anon JWT format and requires separate Realtime opt-in', () => {
    const env = { ...approved(), STAGING_PUBLIC_KEY: `x.${btoa('{"role":"anon"}')}.x` };
    expect(stagingSettings(env)?.realtime).toBe(false);
    expect(stagingSettings({ ...env, STAGING_REALTIME: 'enabled' })?.realtime).toBe(true);
  });
});
