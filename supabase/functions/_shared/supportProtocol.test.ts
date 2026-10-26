// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  contactErrors,
  supportChallenge,
  solveChallenge,
  verifyChallenge,
  emailBucket,
} from "./supportProtocol";
import { supportHandler, type Intake } from "./supportHandler";
const secret = "isolated-test-only-signing-material-1234567890";
const fields = {
  name: "Test person",
  email: "person@example.test",
  category: "courses",
  subject: "Learning support",
  message: "Please help me understand enrollment.",
};
describe("support validation and authenticated challenge", () => {
  it("validates bounds, email, category and honeypot", () => {
    expect(contactErrors(fields)).toEqual({});
    expect(
      Object.keys(
        contactErrors({
          ...fields,
          name: "",
          email: "invalid",
          category: "fake",
          subject: "a",
          message: "short",
          website: "spam",
        }),
      ),
    ).toHaveLength(6);
  });
  it("binds a signed expiring challenge to the normalized email and a valid proof", async () => {
    const token = await supportChallenge(fields.email, secret, 10000);
    const proof = await solveChallenge(token);
    expect(
      await verifyChallenge(token, proof, fields.email, secret, 10001),
    ).not.toBeNull();
    expect(
      await verifyChallenge(
        token,
        proof,
        "different@example.test",
        secret,
        10001,
      ),
    ).toBeNull();
    expect(
      await verifyChallenge(token, proof, fields.email, secret, 610001),
    ).toBeNull();
    expect(
      await verifyChallenge(token + "x", proof, fields.email, secret, 10001),
    ).toBeNull();
    expect(
      await verifyChallenge(token, -1, fields.email, secret, 10001),
    ).toBeNull();
  });
  it("does not store raw email in rate-limit keys", async () => {
    const bucket = await emailBucket(fields.email, secret);
    expect(bucket).toHaveLength(64);
    expect(bucket).not.toContain("person");
    expect(await emailBucket("PERSON@example.test", secret)).toBe(bucket);
  });
  it("stores a valid guest request through server intake and ignores a spoofed owner ID", async () => {
    let saved: Intake | null = null;
    const handler = supportHandler({
      secret,
      origins: ["https://app.example.test"],
      authenticate: async () => null,
      intake: async (data) => {
        saved = data;
        return "ticket-reference";
      },
    });
    const token = await supportChallenge(fields.email, secret);
    const counter = await solveChallenge(token);
    const response = await handler(
      new Request("https://api.example.test", {
        method: "POST",
        headers: { Origin: "https://app.example.test" },
        body: JSON.stringify({ ...fields, token, counter, user_id: "spoof" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(saved!.owner_id).toBeNull();
    expect(saved!.sender_email).toBe(fields.email);
  });
  it("associates only a verified JWT identity and rejects expired sessions before writing", async () => {
    let writes = 0;
    const token = await supportChallenge(fields.email, secret);
    const counter = await solveChallenge(token);
    const handler = supportHandler({
      secret,
      origins: [],
      authenticate: async (auth) =>
        auth === "Bearer valid-test-session" ? "verified-user" : null,
      intake: async (data) => {
        writes++;
        expect(data.owner_id).toBe("verified-user");
        return "ticket";
      },
    });
    for (const [authorization, status] of [
      ["Bearer expired-test-session", 401],
      ["Bearer valid-test-session", 200],
    ] as const) {
      const response = await handler(
        new Request("https://api.example.test", {
          method: "POST",
          headers: { authorization },
          body: JSON.stringify({ ...fields, token, counter }),
        }),
      );
      expect(response.status).toBe(status);
    }
    expect(writes).toBe(1);
  });
  it("enforces origin, request-size and database-limit failures without leaking internals", async () => {
    const handler = supportHandler({
      secret,
      origins: ["https://app.example.test"],
      authenticate: async () => null,
      intake: async () => {
        throw new Error("limit reached");
      },
    });
    expect(
      (
        await handler(
          new Request("https://api.example.test", {
            method: "POST",
            headers: { Origin: "https://untrusted.example.test" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handler(
          new Request("https://api.example.test", {
            method: "POST",
            body: "x".repeat(30000),
          }),
        )
      ).status,
    ).toBe(400);
    const token = await supportChallenge(fields.email, secret);
    const counter = await solveChallenge(token);
    expect(
      (
        await handler(
          new Request("https://api.example.test", {
            method: "POST",
            body: JSON.stringify({ ...fields, token, counter }),
          }),
        )
      ).status,
    ).toBe(429);
  });
});
