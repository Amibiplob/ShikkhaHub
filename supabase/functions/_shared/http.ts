export async function boundedJson(
  request: Request,
  limit = 24_000,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid request");
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Request is too large");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid request");
  return value;
}
export function corsHeaders(request: Request, origins: string[]) {
  const origin = request.headers.get("origin");
  if (origin && !origins.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin || origins[0] || "",
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
  };
}
