import { describe, it, expect } from "vitest";
import { en, bn } from "./translations";

describe("translations", () => {
  it("every English key has a Bangla translation", () => {
    const missing = Object.keys(en).filter((k) => !bn[k]?.trim());
    expect(missing).toEqual([]);
  });

  it("Bangla has no keys that English lacks", () => {
    const extra = Object.keys(bn).filter((k) => !(k in en));
    expect(extra).toEqual([]);
  });

  it("no translation is empty", () => {
    for (const [k, v] of Object.entries(en)) expect(v.trim(), k).not.toBe("");
  });
});
