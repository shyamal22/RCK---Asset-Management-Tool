"use client";
import { safeAction } from "@/lib/safe-action";
import { StatusNote } from "@/components/feedback/status-note";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Field, FormError } from "@/components/field";
import { endSupportAction, inviteDirectorAction, resendInviteAction, setSuspendedAction, startSupportAction } from "../actions";

type R = { ok: true } | { ok: false; error: string };

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<R>, done?: string) =>
    start(async () => {
      setError(null);
      setMsg(null);
      const r = await safeAction(fn());
      if (!r.ok) return setError(r.error);
      if (done) setMsg(done);
    });
  return { error, msg, pending, run };
}

const Status = ({ msg }: { msg: string | null }) => <StatusNote message={msg} />;

export function ResendInviteButton({ companyId }: { companyId: string }) {
  const a = useAction();
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        size="lg"
        className="h-12"
        disabled={a.pending}
        onClick={() =>
          a.run(async () => {
            const r = await safeAction(resendInviteAction({ companyId }));
            return r.ok && !r.emailed ? { ok: false, error: "Email isn't set up. Send them the link above." } : r;
          }, "Invite sent again")
        }
      >
        Send invite again
      </Button>
      <FormError message={a.error} />
      <Status msg={a.msg} />
    </div>
  );
}

export function InviteDirectorForm({ companyId }: { companyId: string }) {
  const [v, setV] = useState({ directorName: "", directorEmail: "" });
  const a = useAction();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(() => inviteDirectorAction({ companyId, ...v }), "Invite sent");
      }}
    >
      <Field id="invite-name" label="Director's name" value={v.directorName} onChange={(e) => setV({ ...v, directorName: e.target.value })} />
      <Field id="invite-email" label="Director's email" type="email" value={v.directorEmail} onChange={(e) => setV({ ...v, directorEmail: e.target.value })} />
      <FormError message={a.error} />
      <Status msg={a.msg} />
      <Button type="submit" size="lg" className="h-12" disabled={a.pending}>
        Send invite
      </Button>
    </form>
  );
}

const LENGTHS = [
  { hours: 1, label: "1 hour" },
  { hours: 4, label: "4 hours" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

export function StartSupportForm({ companyId }: { companyId: string }) {
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(4);
  const a = useAction();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(() => startSupportAction({ companyId, reason, hours }));
      }}
    >
      <Field id="support-reason" label="Reason for access" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="grid gap-1.5">
        <Label htmlFor="support-length" className="text-base">
          How long
        </Label>
        <select id="support-length" className="h-12 rounded-[0.875rem] border border-input bg-background px-3 text-lg" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {LENGTHS.map((l) => (
            <option key={l.hours} value={l.hours}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <FormError message={a.error} />
      <Button type="submit" size="lg" className="h-12" disabled={a.pending}>
        Start read-only access
      </Button>
    </form>
  );
}

export function EndSupportButton({ companyId, supportId }: { companyId: string; supportId: string }) {
  const a = useAction();
  return (
    <div className="grid gap-2">
      <Button variant="outline" size="lg" className="h-12" disabled={a.pending} onClick={() => a.run(() => endSupportAction({ companyId, supportId }))}>
        End access now
      </Button>
      <FormError message={a.error} />
    </div>
  );
}

export function SuspendControls({ companyId, suspended }: { companyId: string; suspended: boolean }) {
  const [reason, setReason] = useState("");
  const a = useAction();
  if (suspended)
    return (
      <div className="grid gap-3">
        <p>On hold</p>
        <Button size="lg" className="h-12" disabled={a.pending} onClick={() => a.run(() => setSuspendedAction({ companyId, suspended: false }))}>
          Reactivate
        </Button>
        <FormError message={a.error} />
      </div>
    );
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm("Everyone at this client loses access until you reactivate it. Continue?"))
          a.run(() => setSuspendedAction({ companyId, suspended: true, reason }));
      }}
    >
      <Field id="hold-reason" label="Reason for putting on hold" value={reason} onChange={(e) => setReason(e.target.value)} />
      <FormError message={a.error} />
      <Button type="submit" variant="outline" size="lg" className="h-12" disabled={a.pending}>
        Put on hold
      </Button>
    </form>
  );
}
