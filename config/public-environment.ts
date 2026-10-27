const publicNames = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY", // Also accepts a modern public publishable key.
  "VITE_SUPABASE_PROJECT_ID", // Historical local tooling; unused by the SPA.
  // Exact public framework names, not the full Vercel system-variable namespace:
  // https://vercel.com/docs/environment-variables/framework-environment-variables
  "VITE_VERCEL_ENV",
  "VITE_VERCEL_TARGET_ENV",
  "VITE_VERCEL_URL",
  "VITE_VERCEL_BRANCH_URL",
  "VITE_VERCEL_PROJECT_PRODUCTION_URL",
  "VITE_VERCEL_HASH_SALT",
  "VITE_VERCEL_GIT_PROVIDER",
  "VITE_VERCEL_GIT_REPO_SLUG",
  "VITE_VERCEL_GIT_REPO_OWNER",
  "VITE_VERCEL_GIT_REPO_ID",
  "VITE_VERCEL_GIT_COMMIT_REF",
  "VITE_VERCEL_GIT_COMMIT_SHA",
  "VITE_VERCEL_GIT_COMMIT_MESSAGE",
  "VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
  "VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME",
  "VITE_VERCEL_GIT_PULL_REQUEST_ID",
]);
const localFixtureKeys = new Set([
  "isolated-e2e-public-key",
  "isolated-ci-public-key",
]);

/** Runs before Vite serves or builds. Errors deliberately omit configuration values. */
export function validatePublicEnvironment(env: Record<string, string>) {
  for (const name of Object.keys(env).filter((key) => key.startsWith("VITE_"))) {
    if (!publicNames.has(name))
      throw new Error(`Unsupported browser variable ${name}; keep server secrets outside VITE_*.`);
  }
  const rawUrl = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!rawUrl || !key)
    throw new Error("Configure VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in an ignored local environment or hosting configuration.");

  let url: URL;
  try { url = new URL(rawUrl); } catch {
    throw new Error("VITE_SUPABASE_URL must be an HTTP(S) origin without credentials, a path, query or fragment.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(loopback && url.protocol === "http:")))
    throw new Error("VITE_SUPABASE_URL must be an HTTPS origin (HTTP is allowed only for loopback), without credentials, a path, query or fragment.");

  // Check both fields, including an unused alias: either VITE_* field can be bundled.
  for (const name of ["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"]) {
    const candidate = env[name];
    if (!candidate) continue;
    let anon = false;
    if (candidate.split(".").length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(candidate.split(".")[1], "base64url").toString("utf8"));
        anon = payload.role === "anon";
      } catch { /* Malformed and user/service-role JWTs are rejected below. */ }
    }
    const publishable = /^sb_publishable_[A-Za-z0-9_-]+$/.test(candidate);
    if (!publishable && !anon && !(loopback && localFixtureKeys.has(candidate)))
      throw new Error(`${name} must be a public publishable/anon key; never use a secret, service-role or user-session key.`);
  }

  if (env.VITE_SUPABASE_PROJECT_ID && !/^[a-z0-9-]+$/.test(env.VITE_SUPABASE_PROJECT_ID))
    throw new Error("VITE_SUPABASE_PROJECT_ID must contain only the public project identifier.");

  return key;
}
