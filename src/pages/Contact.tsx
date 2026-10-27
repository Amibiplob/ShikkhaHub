import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import PageShell from "@/components/layout/PageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
contactErrors,
solveChallenge,
supportCategories,
type ContactFields,
} from "../../supabase/functions/_shared/supportProtocol";
import type { Tables } from "@/integrations/supabase/types";
function ContactContent() {
  const { user, profile } = useAuth();
  const [fields, setFields] = useState<ContactFields>({
    name: profile?.full_name || "",
    email: user?.email || "",
    category: "account",
    subject: "",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [reference, setReference] = useState(""),
    [failure, setFailure] = useState(""),
    [tickets, setTickets] = useState<Tables<"support_tickets">[]>([]),
    [ticketError, setTicketError] = useState("");
  useEffect(() => {
    let active = true;
    if (!user) return;
    supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (active) {
          setTickets(data || []);
          setTicketError(error ? "Could not load your support history." : "");
        }
      });
    return () => {
      active = false;
    };
  }, [user, reference]);
  const update = (key: keyof ContactFields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = contactErrors(fields);
    setErrors(validation);
    setFailure("");
    if (Object.keys(validation).length) return;
    setBusy(true);
    try {
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-contact`;
      const baseHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const ask = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: baseHeaders,
        body: JSON.stringify({
          action: "challenge",
          email: fields.email.trim(),
        }),
      });
      if (!ask.ok)
        throw new Error(
          "Support is temporarily unavailable. Please try again.",
        );
      const { token } = await ask.json();
      if (typeof token !== "string")
        throw new Error("Invalid support response.");
      const counter = await solveChallenge(token);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = { ...baseHeaders };
      if (session) headers.Authorization = `Bearer ${session.access_token}`;
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers,
        body: JSON.stringify({ ...fields, token, counter }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to save your request.",
        );
      if (typeof body.ticket_id !== "string")
        throw new Error("Unable to confirm your saved request.");
      setReference(body.ticket_id);
      setFields((f) => ({ ...f, subject: "", message: "" }));
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "Unable to save your request.",
      );
    } finally {
      setBusy(false);
    }
  };
  const control = (
    key: "name" | "email" | "subject",
    label: string,
    type = "text",
    max = 160,
  ) => (
    <div>
      <Label htmlFor={`contact-${key}`}>{label}</Label>
      <Input
        id={`contact-${key}`}
        type={type}
        maxLength={max}
        value={fields[key]}
        onChange={(e) => update(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
      />
      {errors[key] && (
        <p id={`error-${key}`} className="mt-1 text-sm text-destructive">
          {errors[key]}
        </p>
      )}
    </div>
  );
  return (
    <PageShell
      title="Contact Support"
      description="Send a private request to the ShikkhaHub team. Do not include passwords, payment details or recovery links."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          onSubmit={send}
          noValidate
          className="space-y-5 rounded-xl border bg-card p-5 md:p-7"
        >
          {reference && (
            <div
              role="status"
              className="rounded-lg border border-primary/30 bg-primary/5 p-4"
            >
              <p className="font-semibold">Your support request was saved.</p>
              <p className="mt-2 break-all text-sm">Reference: {reference}</p>
              <p className="mt-2 text-sm">
                No email response has been sent by this form.
              </p>
            </div>
          )}
          {failure && (
            <p role="alert" className="text-destructive">
              {failure}
            </p>
          )}
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="text-destructive">
              Please correct the highlighted fields.
            </p>
          )}
          {control("name", "Name", "text", 120)}
          {control("email", "Email", "email", 254)}
          <div>
            <Label htmlFor="contact-category">Category</Label>
            <select
              id="contact-category"
              className="mt-1 block h-10 w-full rounded-md border bg-background px-3"
              value={fields.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {supportCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {control("subject", "Subject")}
          <div>
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              rows={6}
              maxLength={5000}
              value={fields.message}
              onChange={(e) => update("message", e.target.value)}
              aria-invalid={!!errors.message}
              aria-describedby="error-message"
            />
            {errors.message && (
              <p id="error-message" className="mt-1 text-sm text-destructive">
                {errors.message}
              </p>
            )}
          </div>
          <div className="hidden" aria-hidden="true">
            <label>
              Website
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={fields.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </label>
          </div>
          <Button disabled={busy} type="submit">
            {busy ? "Checking and sending…" : "Send support request"}
          </Button>
          <p className="text-xs text-muted-foreground">
            An automatic anti-spam check runs before submission. Requests are
            limited to three per email each hour. Keep your reference number.
          </p>
        </form>
        <aside className="space-y-5">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">What happens next?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              An administrator can review your request and update its status.
              Email delivery is not configured by this form. Sign in before
              submitting to track your requests here.
            </p>
          </div>
          {user && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">My support requests</h2>
              {ticketError && <p role="alert">{ticketError}</p>}
              {!tickets.length && !ticketError && (
                <p className="text-muted-foreground">
                  No support requests yet.
                </p>
              )}
              {tickets.map((t) => (
                <article key={t.id} className="rounded-xl border bg-card p-4">
                  <h3 className="font-medium">{t.subject}</h3>
                  <p className="mt-2 text-sm">
                    {t.status.replace("_", " ")} ·{" "}
                    {new Date(t.updated_at).toLocaleString()}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {t.id}
                  </p>
                </article>
              ))}
            </section>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

export default function Contact() {
 const {user,loading}=useAuth();
 if (loading) return <PageShell title="Contact support"><p role="status">Loading contact form…</p></PageShell>;
 return <ContactContent key={user?.id || "guest"} />;
}
