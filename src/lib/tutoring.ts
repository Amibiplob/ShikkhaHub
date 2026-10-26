export const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export function zonedInputToISO(value: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Choose a date and time.");
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const expected = Date.UTC(year, month - 1, day, hour, minute);
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let guess = expected;
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      format.formatToParts(guess).map((p) => [p.type, p.value]),
    );
    const actual = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
    );
    const delta = expected - actual;
    if (!delta) break;
    guess += delta;
  }
  const matches = (ms: number) => {
    const p = Object.fromEntries(
      format.formatToParts(ms).map((p) => [p.type, p.value]),
    );
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value;
  };
  if (!matches(guess))
    throw new Error(
      "This local time does not exist because the clocks change. Choose another time.",
    );
  // Ambiguous fall-back times must be chosen with an unambiguous timezone/date.
  if (matches(guess - 3_600_000) || matches(guess + 3_600_000))
    throw new Error(
      "This local time occurs twice because the clocks change. Choose another time or use UTC.",
    );
  return new Date(guess).toISOString();
}
export function formatSession(
  start: string,
  end: string,
  zone = browserTimezone(),
) {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: zone,
  };
  return `${new Intl.DateTimeFormat(undefined, options).format(new Date(start))} – ${new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: zone }).format(new Date(end))} (${zone})`;
}
export const bookingLabel = (status: string) =>
  status === "approved" ? "confirmed" : status;
export const sessionsOverlap = (
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string },
) =>
  Date.parse(a.starts_at) < Date.parse(b.ends_at) &&
  Date.parse(b.starts_at) < Date.parse(a.ends_at);
