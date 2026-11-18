import { test, expect } from './fixture';
import { mockOrigin } from './target';

// Real Chrome + Supabase SDK, intercepted provider/backend contracts. These do
// not exercise Google, email delivery, or the hosted Supabase provider.
test('Google remains disabled when Supabase reports the provider off', async ({ page }) => {
  await page.route('**/auth/v1/settings', route => route.fulfill({ json: { external: { google: false } } }));
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: 'Google', exact: true })).toBeDisabled();
  await expect(page.getByText('Google sign-in is unavailable. Use email and password.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/release-prep/auth-disabled-375.png', fullPage: true });
});

test('PKCE Google callback restores a session and safe deep link without metadata elevation', async ({ page, backend }) => {
  await page.route('**/auth/v1/settings', route => route.fulfill({ json: { external: { google: true } } }));
  let exchanges = 0;
  await page.route('**/auth/v1/token?grant_type=pkce', route => {
    exchanges++;
    expect(route.request().postDataJSON().code_verifier).toBeTruthy();
    const session = backend.session('student');
    session.user.user_metadata = { ...session.user.user_metadata, ...{ role: 'admin', roles: ['teacher','admin'] } };
    return route.fulfill({ json: session });
  });
  await page.route('**/auth/v1/authorize?**', route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256');
    const callback = new URL(url.searchParams.get('redirect_to')!);
    expect(callback.origin + callback.pathname).toBe(`${mockOrigin}/auth/callback`);
    callback.searchParams.set('code', 'synthetic-google-code');
    return route.fulfill({ status: 302, headers: { location: callback.toString() } });
  });
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/auth$/);
  await page.getByRole('button', { name: 'Google', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  expect(exchanges).toBe(1);
  await page.reload();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: "You don't have access to this page" })).toBeVisible();
});

test('provider cancellation clears sensitive URL state and leaves email login available', async ({ page }) => {
  await page.goto('/auth/callback#error=access_denied&error_description=do-not-reflect-this');
  await expect(page.getByRole('alert')).toContainText('cancelled');
  await expect(page).toHaveURL(`${mockOrigin}/auth/callback`);
  await expect(page.locator('body')).not.toContainText('do-not-reflect-this');
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('a callback code without this browser verifier fails with a usable retry', async ({ page }) => {
  await page.goto('/auth/callback?code=invalid-code');
  await expect(page.getByRole('alert')).toContainText('same browser');
  await expect(page).toHaveURL(`${mockOrigin}/auth/callback`);
});

test('password recovery exchanges PKCE once and updates the password through the existing SDK', async ({ page, backend }) => {
  let recoveryReturn = '';
  let exchanges = 0;
  let updated = false;
  await page.route('**/auth/v1/recover?**', route => {
    const url = new URL(route.request().url());
    recoveryReturn = url.searchParams.get('redirect_to')!;
    expect(new URL(recoveryReturn).pathname).toBe('/reset-password');
    return route.fulfill({ json: {} });
  });
  await page.route('**/auth/v1/token?grant_type=pkce', route => {
    exchanges++;
    expect(route.request().postDataJSON().code_verifier).toBeTruthy();
    return route.fulfill({ json: backend.session('student') });
  });
  await page.route('**/auth/v1/user', route => {
    if (route.request().method() === 'PUT') updated = route.request().postDataJSON().password === 'new-test-password';
    return route.fulfill({ json: backend.session('student').user });
  });
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email', { exact: true }).fill('student@example.test');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect.poll(() => recoveryReturn).not.toBe('');
  const callback = new URL(recoveryReturn); callback.searchParams.set('code', 'synthetic-recovery-code');
  await page.goto(callback.toString());
  await page.getByLabel('New Password', { exact: true }).fill('new-test-password');
  await page.getByLabel('Confirm Password', { exact: true }).fill('new-test-password');
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect(page.getByText('Password Updated!', { exact: true })).toBeVisible();
  expect(updated).toBe(true); expect(exchanges).toBe(1);
});

test('a forged recovery fragment does not expose a password update form', async ({ page }) => {
  await page.goto('/reset-password#type=recovery');
  await expect(page.getByText(/Invalid or expired reset link/)).toBeVisible();
  await expect(page.getByLabel('New Password', { exact: true })).toHaveCount(0);
});


test('legacy recovery is validated and subsequent Google sign-in returns to PKCE', async ({ page, backend }) => {
  const session = backend.session('student');
  const fragment = new URLSearchParams({ type: 'recovery', access_token: session.access_token, refresh_token: session.refresh_token, expires_in: '3600', token_type: 'bearer' });
  await page.goto(`/reset-password#${fragment}`);
  await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${mockOrigin}/reset-password`);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByText(/Invalid or expired reset link/)).toBeVisible();
  await page.evaluate(() => { Object.assign(window, { legacyDocumentMarker: true }); });
  const reload = page.waitForEvent('load');
  await page.getByRole('button', { name: 'sign in page', exact: true }).click();
  await reload;
  expect(await page.evaluate(() => 'legacyDocumentMarker' in window)).toBe(false);
  await page.route('**/auth/v1/settings', route => route.fulfill({ json: { external: { google: true } } }));
  await page.reload();
  await page.route('**/auth/v1/authorize?**', route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    const callback = new URL(url.searchParams.get('redirect_to')!);
    callback.searchParams.set('error', 'access_denied');
    return route.fulfill({ status: 302, headers: { location: callback.toString() } });
  });
  await page.getByRole('button', { name: 'Google', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cancelled');
});
