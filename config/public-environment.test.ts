// These are synthetic values. No configuration file, account or network is read.
import { describe, expect, it } from "vitest";
import { validatePublicEnvironment } from "./public-environment";

const base = () => ({
  VITE_SUPABASE_URL: "https://staging.example.test",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-placeholder",
});
const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.x`;
const vercelMetadata = {
  VITE_VERCEL_ENV: "preview",
  VITE_VERCEL_TARGET_ENV: "preview",
  VITE_VERCEL_URL: "shikkhahub-test.example.test",
  VITE_VERCEL_BRANCH_URL: "shikkhahub-git-test.example.test",
  VITE_VERCEL_PROJECT_PRODUCTION_URL: "shikkhahub.example.test",
  VITE_VERCEL_HASH_SALT: "1783933175",
  VITE_VERCEL_GIT_PROVIDER: "github",
  VITE_VERCEL_GIT_REPO_SLUG: "ShikkhaHub",
  VITE_VERCEL_GIT_REPO_OWNER: "example-owner",
  VITE_VERCEL_GIT_REPO_ID: "123456789",
  VITE_VERCEL_GIT_COMMIT_REF: "test-branch",
  VITE_VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
  VITE_VERCEL_GIT_COMMIT_MESSAGE: "Synthetic build regression",
  VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN: "example-author",
  VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME: "Example Author",
  VITE_VERCEL_GIT_PULL_REQUEST_ID: "",
};

describe("browser environment boundary", () => {
  it("accepts publishable and legacy anonymous keys", () => {
    expect(() => validatePublicEnvironment(base())).not.toThrow();
    expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon") })).not.toThrow();
  });
  it.each(Object.entries(vercelMetadata))("accepts documented framework metadata %s", (name, value) => {
    expect(validatePublicEnvironment({ ...base(), [name]: value })).toEqual(base());
  });
  it("accepts the complete Vercel metadata set with the anon-key alias", () => {
    expect(validatePublicEnvironment({
      ...vercelMetadata,
      VITE_SUPABASE_URL: base().VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: base().VITE_SUPABASE_PUBLISHABLE_KEY,
    })).toEqual(base());
  });
  it("resolves either key name, retaining publishable-name precedence", () => {
    expect(validatePublicEnvironment(base())).toEqual(base());
    expect(validatePublicEnvironment({ VITE_SUPABASE_URL: base().VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: jwt("anon") }).VITE_SUPABASE_PUBLISHABLE_KEY).toBe(jwt("anon"));
    expect(validatePublicEnvironment({ ...base(), VITE_SUPABASE_ANON_KEY: "sb_publishable_alias-placeholder" })).toEqual(base());
  });
  it("validates both key fields even when one has precedence", () => {
    for (const name of ["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"]) {
      for (const key of ["sb_secret_test-placeholder", jwt("service_role"), jwt("authenticated"), "malformed"]) {
        expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_ANON_KEY: "sb_publishable_alias-placeholder", [name]: key })).toThrow("public publishable/anon key");
      }
    }
  });
  it("rejects privileged keys and authenticated session JWTs before bundling", () => {
    for (const key of ["sb_secret_test-placeholder", jwt("service_role"), jwt("authenticated"), "malformed"])
      expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow("public publishable/anon key");
  });
  it("allows exact isolated fixture keys only on loopback", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(() => validatePublicEnvironment({ VITE_SUPABASE_URL: `http://${host}:54321`, VITE_SUPABASE_PUBLISHABLE_KEY: "isolated-e2e-public-key" })).not.toThrow();
    }
    expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_PUBLISHABLE_KEY: "isolated-e2e-public-key" })).toThrow();
  });
  it("rejects recognized browser credential names without logging their values", () => {
    for (const name of ["VITE_SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SECRET_KEY", "VITE_DATABASE_URL", "VITE_POSTGRES_PASSWORD", "VITE_JWT_SECRET", "VITE_UNRECOGNIZED_CLIENT_SECRET", "VITE_AI_API_KEY", "VITE_STAGING_ADMIN_PASSWORD", "VITE_VERCEL_SECRET", "VITE_VERCEL_OIDC_TOKEN", "VITE_VERCEL_AUTOMATION_BYPASS_SECRET", "VITE_VERCEL_GIT_TOKEN"])
      expect(() => validatePublicEnvironment({ ...base(), [name]: "synthetic-test-only" })).toThrow("Sensitive browser variable");
  });
  it("keeps server variables outside the public boundary", () => {
    expect(() => validatePublicEnvironment({ ...base(), AI_API_KEY: "synthetic-test-only" })).not.toThrow();
  });
  it("rejects URLs containing credentials or request data and remote HTTP", () => {
    for (const url of ["invalid", "http://staging.example.test", "https://user:synthetic@staging.example.test", "https://staging.example.test/path", "https://staging.example.test?token=synthetic", "https://staging.example.test#synthetic"])
      expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_URL: url })).toThrow("origin");
  });
  it("reports missing required configuration without reading local files", () => {
    expect(() => validatePublicEnvironment({})).toThrow("Configure VITE_SUPABASE_URL");
  });
  it("does not include rejected values in diagnostics", () => {
    const value = "synthetic-private-value-never-log";
    let message = "";
    try {
      validatePublicEnvironment({ ...base(), VITE_SUPABASE_PUBLISHABLE_KEY: value });
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain("public publishable/anon key");
    expect(message).not.toContain(value);
  });
  it("discards the unused project identifier and arbitrary provider data", () => {
    const ignored = {
      VITE_SUPABASE_PROJECT_ID: "not-exposed-project-marker",
      VITE_VERCEL_FUTURE_UNKNOWN: "not-exposed-provider-marker",
      VITE_OTHER: "not-exposed-other-marker",
      VITE_UNKNOWN_PAYLOAD: ["sb", "secret", "not-exposed-payload-marker"].join("_"),
    };
    expect(validatePublicEnvironment({ ...base(), ...ignored })).toEqual(base());
  });
  it("does not parse, trust or return the unused observability configuration", () => {
    for (const value of [JSON.stringify({ analytics: { endpoint: "/synthetic-marker" } }), "invalid-json-marker", { arbitrary: true }])
      expect(validatePublicEnvironment({ ...base(), VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: value })).toEqual(base());
  });
  it.each(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"])("rejects non-string application setting %s", (name) => {
    for (const value of [null, false, 123, {}, []])
      expect(() => validatePublicEnvironment({ ...base(), [name]: value })).toThrow(`${name} must be a string`);
  });
});
