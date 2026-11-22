import { AuthSheet } from "@/components/auth/auth-shell";
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
    <p role="alert" className="rounded-xl border border-destructive/40 p-3 text-base text-destructive">
      {message}
    </p>
  );
}

/** An account screen: gradient header (title + line) and the white sheet below it. */
export function Screen({ title, subtitle, wide, children }: { title: string; subtitle?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <>
      <header className={cn("auth-hero auth-rise flex flex-col gap-3 px-7 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 md:w-full md:px-2", wide ? "md:max-w-3xl" : "md:max-w-md")}>
        <p className="flex items-center gap-2 text-base">
          <span className="size-2.5 rounded-full bg-[var(--tangerine)]" aria-hidden />
          <span className="font-bold tracking-wide">KRE</span>
          <span className="opacity-75">Asset Management Tool</span>
        </p>
        <h1 className="mt-10 text-[2.75rem] leading-none font-normal tracking-tight text-balance md:mt-6">{title}</h1>
        {subtitle ? <p className="text-lg opacity-90">{subtitle}</p> : null}
      </header>
      <AuthSheet wide={wide}>
        <div className={cn("auth-form auth-rise mx-auto flex w-full flex-col gap-6", wide ? "max-w-3xl" : "max-w-sm")}>{children}</div>
      </AuthSheet>
    </>
  );
}
