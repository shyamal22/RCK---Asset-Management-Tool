"use client";
import { useOptimistic, useTransition } from "react";
import { SwitchRow } from "@/components/switch-row";
import { Button } from "@/components/ui/button";
import { setSignupLinkAction } from "./actions";

export function SignupLinkControls({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useOptimistic(enabled);
  return (
    <div className="grid gap-3">
      <SwitchRow
        label="Sign-up link"
        checked={on}
        disabled={pending}
        onCheckedChange={(v) =>
          start(async () => {
            setOn(v);
            await setSignupLinkAction({ enabled: v });
          })
        }
      />
      <Button
        size="lg"
        variant="outline"
        className="h-12"
        disabled={pending}
        onClick={() => {
          if (confirm("The old link and QR code will stop working. Continue?"))
            start(() => setSignupLinkAction({ enabled, regenerate: true }));
        }}
      >
        New link
      </Button>
    </div>
  );
}
