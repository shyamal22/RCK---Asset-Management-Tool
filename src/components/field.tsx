import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Field({
  label,
  error,
  className,
  id,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string; id: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input id={id} aria-invalid={!!error} className={cn("h-12 text-lg", className)} {...props} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/40 p-3 text-base text-destructive">
      {message}
    </p>
  );
}

/** Content of an account screen; the (auth) layout supplies the hero and sheet. */
export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="auth-form flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
      {children}
    </div>
  );
}
