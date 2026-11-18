"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setSignupLinkAction } from "./actions";

export function SignupLinkControls({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3">
      <Button
        size="lg"
        className="h-12"
        variant={enabled ? "outline" : "default"}
        disabled={pending}
        onClick={() => start(() => setSignupLinkAction({ enabled: !enabled }))}
      >
        {enabled ? "Turn link off" : "Turn link on"}
      </Button>
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
