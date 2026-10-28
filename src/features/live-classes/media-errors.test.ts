import { describe, expect, it } from "vitest";
import { mediaError } from "./useWebRTCBroadcast";

describe("media recovery messages", () => {
  it.each([
    ["NotAllowedError", "Permission denied"],
    ["NotFoundError", "Device unavailable"],
    ["NotReadableError", "Device is busy or disconnected"],
    ["OverconstrainedError", "Device settings unavailable"],
    ["NotSupportedError", "You can still join without devices"],
  ])("explains %s without exposing provider objects", (name, text) => {
    expect(mediaError(new DOMException("internal details", name))).toContain(
      text,
    );
  });
  it("provides a recoverable fallback for non-Error device failures", () => {
    expect(mediaError({ private: "not displayed" })).toBe(
      "Media unavailable. Check your devices and retry.",
    );
  });
});
