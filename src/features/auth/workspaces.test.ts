import { expect, it } from 'vitest';
import { clearAuthReturn, readAuthReturn, rememberAuthReturn, primaryWorkspace, signInDestination } from './workspaces';
it('defaults administrators to management without denying their other workspaces', () => {
  expect(primaryWorkspace(['admin','teacher','student'])).toBe('/admin');
  expect(primaryWorkspace(['teacher','student'])).toBe('/dashboard');
  expect(signInDestination('/dashboard?tab=teaching', ['admin','teacher'])).toBe('/dashboard?tab=teaching');
});
it('retains a protected deep link and rejects external redirect targets', () => {
  expect(signInDestination('/courses/a?lesson=b#lesson-content',['student'])).toBe('/courses/a?lesson=b#lesson-content');
  for (const from of [null, '//other.test', 'https://other.test', '/auth']) expect(signInDestination(from,['admin'])).toBe('/admin');
});

it('rejects browser URL normalization attacks and preserves safe local paths', () => {
  for (const path of ['/\\evil.test', '/\tevil.test', '///evil.test', '/reset-password', '/auth/callback?code=x'])
    expect(signInDestination(path, ['student'])).toBe('/dashboard');
});

it('preserves an OAuth destination across remounts and discards expired or malformed values', () => {
  rememberAuthReturn('/courses/a?lesson=b#content');
  expect(readAuthReturn()).toBe('/courses/a?lesson=b#content');
  expect(readAuthReturn()).toBe('/courses/a?lesson=b#content');
  clearAuthReturn(); expect(readAuthReturn()).toBeNull();
  sessionStorage.setItem('shikkhahub.oauth-return', JSON.stringify({ path: '/admin', at: Date.now() - 600_001 }));
  expect(readAuthReturn()).toBeNull();
  sessionStorage.setItem('shikkhahub.oauth-return', 'invalid');
  expect(readAuthReturn()).toBeNull(); clearAuthReturn();
});
