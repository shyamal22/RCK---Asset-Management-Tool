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

export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
    </main>
  );
}
