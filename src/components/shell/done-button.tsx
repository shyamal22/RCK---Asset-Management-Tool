"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { leaveSharedAction } from "@/app/(auth)/switch-actions";

/** On a shared tablet: finish and hand back to the name list. */
export function DoneButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await leaveSharedAction();
          router.replace("/switch");
        })
      }
    >
      Done
    </Button>
  );
}
