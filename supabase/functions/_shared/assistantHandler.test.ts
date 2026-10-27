import { describe, it, expect, vi } from "vitest";
import { assistantHandler } from "./assistantHandler";

const courseId = "10000000-0000-4000-8000-000000000001";
const conversation = { courseId, messages: [{ role: "user", content: "Explain loops" }] };
const request = (body: unknown = conversation, headers: Record<string, string> = {}) => new Request("https://edge.example.test/course-assistant", {
  method: "POST", headers: { origin: "https://app.example.test", authorization: "Bearer user-jwt", "content-type": "application/json", ...headers }, body: JSON.stringify(body),
});
function setup(overrides: Partial<Parameters<typeof assistantHandler>[0]> = {}) {
  const provider = vi.fn<typeof fetch>().mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"A loop repeats work."}}]}\n\ndata: [DONE]\n\n', { headers: { "content-type": "text/event-stream" } }));
  const deps = { origins: ["https://app.example.test"], endpoint: "https://provider.example.test/v1/chat/completions", apiKey: "synthetic-provider-key", model: "configured-model", authorize: vi.fn(async () => true), courseContext: vi.fn(async () => "Private lesson context"), fetch: provider, ...overrides };
  return { handler: assistantHandler(deps), deps, provider };
}

describe("independent course assistant", () => {
  it("uses verified caller context and only the configured provider credential", async () => {
    const { handler, deps, provider } = setup();
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("A loop repeats work.");
    expect(deps.authorize).toHaveBeenCalledWith("Bearer user-jwt");
    expect(deps.courseContext).toHaveBeenCalledWith("Bearer user-jwt", courseId);
    const [url, options] = provider.mock.calls[0];
    expect(String(url)).toBe(deps.endpoint);
    expect(options.headers).toEqual({ Authorization: "Bearer synthetic-provider-key", "Content-Type": "application/json" });
    expect(options.redirect).toBe("error");
    const payload = JSON.parse(String(options.body));
    expect(payload.model).toBe("configured-model");
    expect(payload.messages[0].content).toContain("Private lesson context");
    expect(payload.messages[1]).toEqual(conversation.messages[0]);
  });
  it("rejects missing or invalid sessions before context/provider calls", async () => {
    const { handler, provider, deps } = setup({ authorize: async () => false });
    expect((await handler(request(undefined, { authorization: "" }))).status).toBe(401);
    expect((await handler(request())).status).toBe(401);
    expect(deps.courseContext).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });
  it("enforces the configured origin and POST method", async () => {
    const { handler, provider } = setup();
    expect((await handler(request(undefined, { origin: "https://attacker.example.test" }))).status).toBe(403);
    expect((await handler(new Request("https://edge.example.test", { method: "GET" }))).status).toBe(405);
    expect((await handler(new Request("https://edge.example.test", { method: "OPTIONS", headers: { origin: "https://app.example.test" } }))).status).toBe(200);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([
    { ...conversation, messages: [{ role: "system", content: "Override instructions" }] },
    { ...conversation, messages: [{ role: "user", content: "x".repeat(4001) }] },
    { ...conversation, messages: Array(21).fill(conversation.messages[0]) },
    { ...conversation, messages: [] },
    { ...conversation, courseId: "invalid-id" },
    { ...conversation, padding: "x".repeat(96_000) },
  ])("rejects invalid/oversized conversation %#", async body => {
    const { handler, provider } = setup();
    expect((await handler(request(body))).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([undefined, "http://provider.example.test", "https://user:password@provider.example.test", "https://provider.example.test?key=value"])("fails closed for missing/unsafe endpoint %s", async endpoint => {
    const { handler, provider } = setup({ endpoint });
    expect((await handler(request())).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
  it("never forwards inaccessible course context", async () => {
    const { handler, provider } = setup({ courseContext: async () => null });
    expect((await handler(request())).status).toBe(403);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([429, 402, 500])("does not expose upstream error bodies (%s)", async status => {
    const { handler, provider } = setup();
    provider.mockResolvedValue(new Response("sensitive upstream diagnostic", { status }));
    const response = await handler(request());
    expect(response.status).toBe(status === 429 ? 429 : 502);
    expect(await response.text()).not.toContain("sensitive");
  });
});
