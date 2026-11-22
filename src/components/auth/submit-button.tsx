"use client";
import { Cog } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Primary action with a turning gear while the server works. */
export function SubmitButton({ pending, children, className, disabled, ...props }: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button type="submit" size="lg" aria-busy={pending} disabled={pending || disabled} className={cn("h-14 gap-3 text-lg", className)} {...props}>
      {pending ? <Cog className="size-5 animate-spin [animation-duration:1.4s]" aria-hidden /> : null}
      {children}
    </Button>
  );
}
