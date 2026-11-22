"use client";
import { SwitchRow } from "@/components/switch-row";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { FormError } from "@/components/field";
import { USER_TYPES, USER_TYPE_LABELS, type UserType } from "@/lib/permissions/types";
import { approveUserAction, rejectUserAction } from "./actions";

export function PendingUserCard({
  user,
  crews,
  canApprove,
}: {
  user: { id: string; name: string; contact: string; signedUp: string };
  crews: { id: string; name: string }[];
  canApprove: boolean;
}) {
  const [userType, setUserType] = useState<UserType>("crew");
  const [crewId, setCrewId] = useState<string>("");
  const [lead, setLead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needsCrew = userType === "crew" || userType === "supervisor";

  return (
    <section className="grid gap-3 rounded-lg border p-4" aria-label={user.name}>
      <div>
        <h2 className="text-xl font-bold">{user.name}</h2>
        <p className="text-base">{user.contact}</p>
        <p className="text-sm text-muted-foreground">{user.signedUp}</p>
      </div>
      {canApprove ? (
        <>
          <Segmented
            label="User type"
            value={userType}
            onChange={setUserType}
            options={USER_TYPES.map((t) => ({ value: t, label: USER_TYPE_LABELS[t] }))}
          />
          {needsCrew ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`crew-${user.id}`}>Crew</Label>
              <select
                id={`crew-${user.id}`}
                className="h-12 rounded-[0.875rem] border border-input bg-background px-3 text-lg"
                value={crewId}
                onChange={(e) => setCrewId(e.target.value)}
              >
                <option value="">Choose crew</option>
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {userType === "workshop" ? (
            <SwitchRow label="Workshop lead" checked={lead} onCheckedChange={setLead} />
          ) : null}
          <FormError message={error} />
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-12"
              disabled={pending || (needsCrew && !crewId)}
              onClick={() =>
                start(async () => {
                  setError(null);
                  try {
                    await approveUserAction({ userId: user.id, userType, crewId: needsCrew ? crewId : null, workshopLead: lead });
                  } catch {
                    setError("Couldn't approve. Try again.");
                  }
                })
              }
            >
              Approve
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              disabled={pending}
              onClick={() => {
                const reason = prompt("Reason for rejecting?");
                if (reason) start(() => rejectUserAction({ userId: user.id, reason }));
              }}
            >
              Reject
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
