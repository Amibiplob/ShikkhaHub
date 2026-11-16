import { expect, it } from 'vitest';
import { primaryWorkspace, signInDestination } from './workspaces';
it('defaults administrators to management without denying their other workspaces', () => {
  expect(primaryWorkspace(['admin','teacher','student'])).toBe('/admin');
  expect(primaryWorkspace(['teacher','student'])).toBe('/dashboard');
  expect(signInDestination('/dashboard?tab=teaching', ['admin','teacher'])).toBe('/dashboard?tab=teaching');
});
it('retains a protected deep link and rejects external redirect targets', () => {
  expect(signInDestination('/courses/a?lesson=b#lesson-content',['student'])).toBe('/courses/a?lesson=b#lesson-content');
  for (const from of [null, '//other.test', 'https://other.test', '/auth']) expect(signInDestination(from,['admin'])).toBe('/admin');
});
