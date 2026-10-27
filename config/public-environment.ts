const publicNames = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID", // Historical local tooling; unused by the SPA.
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
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !key)
    throw new Error("Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in an ignored local environment or hosting configuration.");

  let url: URL;
  try { url = new URL(rawUrl); } catch {
    throw new Error("VITE_SUPABASE_URL must be an HTTP(S) origin without credentials, a path, query or fragment.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(loopback && url.protocol === "http:")))
    throw new Error("VITE_SUPABASE_URL must be an HTTPS origin (HTTP is allowed only for loopback), without credentials, a path, query or fragment.");

  let anon = false;
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
      anon = payload.role === "anon";
    } catch { /* Malformed and user/service-role JWTs are rejected below. */ }
  }
  const publishable = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publishable && !anon && !(loopback && localFixtureKeys.has(key)))
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be a public publishable/anon key; never use a secret, service-role or user-session key.");

  if (env.VITE_SUPABASE_PROJECT_ID && !/^[a-z0-9-]+$/.test(env.VITE_SUPABASE_PROJECT_ID))
    throw new Error("VITE_SUPABASE_PROJECT_ID must contain only the public project identifier.");
}
