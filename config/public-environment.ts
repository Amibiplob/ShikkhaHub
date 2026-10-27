// A diagnostic guard for common accidental browser-credential names. Unknown
// settings are excluded by Vite's exposure policy, not trusted by their prefix.
const credentialName = /(?:^|_)(?:SECRET|PASSWORD|PASSWD|TOKEN|CREDENTIALS?|SERVICE_ROLE|PRIVATE_KEY|API_KEY|ACCESS_KEY|DATABASE_URL|DATABASE_URI|DB_URL|POSTGRES(?:QL)?_URL|REDIS_URL|MONGODB_URI|CONNECTION_STRING)(?:_|$)/i;
const localFixtureKeys = new Set([
  "isolated-e2e-public-key",
  "isolated-ci-public-key",
]);

function stringSetting(env: Record<string, unknown>, name: string) {
  const value = env[name];
  if (value !== undefined && typeof value !== "string")
    throw new Error(`${name} must be a string.`);
  return value;
}

/** Return only values approved for client exposure; never return/spread input. */
export function validatePublicEnvironment(env: Record<string, unknown>) {
  for (const name of Object.keys(env)) {
    if (name.startsWith("VITE_") && credentialName.test(name))
      throw new Error(`Sensitive browser variable ${name}; keep server secrets outside VITE_*.`);
  }
  const rawUrl = stringSetting(env, "VITE_SUPABASE_URL");
  const publishableKey = stringSetting(env, "VITE_SUPABASE_PUBLISHABLE_KEY");
  const anonKey = stringSetting(env, "VITE_SUPABASE_ANON_KEY");
  const key = publishableKey || anonKey;
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

  // Reject a privileged key even in the unused alias, before producing defines.
  for (const [name, candidate] of [
    ["VITE_SUPABASE_PUBLISHABLE_KEY", publishableKey],
    ["VITE_SUPABASE_ANON_KEY", anonKey],
  ] as const) {
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

  return {
    VITE_SUPABASE_URL: rawUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: key,
  };
}
