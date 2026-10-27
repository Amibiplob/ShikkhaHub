// These are synthetic values. No configuration file, account or network is read.
import { describe, expect, it } from "vitest";
import { validatePublicEnvironment } from "./public-environment";

const base = () => ({
  VITE_SUPABASE_URL: "https://staging.example.test",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-placeholder",
});
const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.x`;

describe("browser environment boundary", () => {
  it("accepts publishable and legacy anonymous keys", () => {
    expect(() => validatePublicEnvironment(base())).not.toThrow();
    expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon") })).not.toThrow();
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
  it("rejects additional browser variables, including server credential names", () => {
    for (const name of ["VITE_SUPABASE_SERVICE_ROLE_KEY", "VITE_AI_API_KEY", "VITE_STAGING_ADMIN_PASSWORD", "VITE_OTHER"])
      expect(() => validatePublicEnvironment({ ...base(), [name]: "synthetic-test-only" })).toThrow("Unsupported browser variable");
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
  it("supports the historical public identifier but rejects other content", () => {
    expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_PROJECT_ID: "test-project" })).not.toThrow();
    expect(() => validatePublicEnvironment({ ...base(), VITE_SUPABASE_PROJECT_ID: "sb_secret_test-placeholder" })).toThrow("public project identifier");
  });
});
