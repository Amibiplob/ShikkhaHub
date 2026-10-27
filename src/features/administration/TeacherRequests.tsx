import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
export default function TeacherRequests({
  onReviewed,
}: {
  onReviewed: () => void;
}) {
  const [requests, setRequests] = useState<Tables<"teacher_requests">[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [selected, setSelected] = useState<{ id: string; approve: boolean } | null>(
      null,
    );
  const load = async () => {
    const { data, error } = await supabase
      .from("teacher_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at")
      .limit(100);
    setError(!!error);
    setRequests(data || []);
  };
  useEffect(() => {
    void (async () => { await load(); })();
  }, []);
  const review = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("review_teacher_request", {
      request_id: selected.id,
      approve: selected.approve,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(
        selected.approve ? "Teacher access approved" : "Request dismissed",
      );
      setSelected(null);
      await load();
      onReviewed();
    }
    setBusy(false);
  };
  return (
    <section
      className="mb-8 rounded-xl border bg-card p-5"
      aria-labelledby="teacher-requests-heading"
    >
      <h2 id="teacher-requests-heading" className="mb-3 text-xl font-semibold">
        Teacher access requests
      </h2>
      {error ? (
        <p role="alert">
          Could not load teacher requests.{" "}
          <Button onClick={load} variant="outline">
            Retry
          </Button>
        </p>
      ) : !requests.length ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
            >
              <div>
                <p className="font-medium">{r.full_name || "Applicant"}</p>
                <p className="text-sm text-muted-foreground">{r.email}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={busy}
                  onClick={() => setSelected({ id: r.id, approve: true })}
                >
                  Approve teacher
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => setSelected({ id: r.id, approve: false })}
                >
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm teacher access review</DialogTitle>
          </DialogHeader>
          <p>
            {selected?.approve
              ? "Approval grants teacher tools to this applicant. Verify the account before continuing."
              : "This dismisses the pending teacher access request."}
          </p>
          <Button disabled={busy} onClick={review}>
            Confirm teacher review
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
