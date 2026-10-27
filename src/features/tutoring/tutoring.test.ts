import { describe, it, expect } from "vitest";
import {
zonedInputToISO,
formatSession,
sessionsOverlap,
bookingLabel,
} from "./tutoring";
describe("tutoring time boundaries", () => {
  it("converts Dhaka wall time without using the host timezone", () => {
    expect(zonedInputToISO("2030-06-15T10:00", "Asia/Dhaka")).toBe(
      "2030-06-15T04:00:00.000Z",
    );
  });
  it("respects daylight saving offsets in ordinary times", () => {
    expect(zonedInputToISO("2030-06-15T10:00", "America/New_York")).toBe(
      "2030-06-15T14:00:00.000Z",
    );
  });
  it("rejects nonexistent and ambiguous DST wall times instead of silently shifting a booking", () => {
    expect(() =>
      zonedInputToISO("2030-03-10T02:30", "America/New_York"),
    ).toThrow("does not exist");
    expect(() =>
      zonedInputToISO("2030-11-03T01:30", "America/New_York"),
    ).toThrow("occurs twice");
  });
  it("rejects invalid dates and zones", () => {
    expect(() => zonedInputToISO("2030-02-31T10:00", "UTC")).toThrow();
    expect(() => zonedInputToISO("2030-06-15T10:00", "Not/A_Zone")).toThrow();
  });
  it("treats adjacent sessions as nonoverlapping", () => {
    const a = { starts_at: "2030-01-01T10:00Z", ends_at: "2030-01-01T11:00Z" };
    expect(
      sessionsOverlap(a, {
        starts_at: a.ends_at,
        ends_at: "2030-01-01T12:00Z",
      }),
    ).toBe(false);
    expect(
      sessionsOverlap(a, {
        starts_at: "2030-01-01T10:30Z",
        ends_at: "2030-01-01T11:30Z",
      }),
    ).toBe(true);
  });
  it("shows the user timezone and a clear confirmed label", () => {
    expect(
      formatSession("2030-01-01T10:00Z", "2030-01-01T11:00Z", "Asia/Dhaka"),
    ).toContain("Asia/Dhaka");
    expect(bookingLabel("approved")).toBe("confirmed");
  });
});
