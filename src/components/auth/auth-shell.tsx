"use client";
import { MachineHero } from "./machine-hero";
import { MachineStateProvider, useMachineState } from "./machine-state";

function Sheet({ children }: { children: React.ReactNode }) {
  const { state } = useMachineState();
  return (
    <main
      className="auth-sheet relative -mt-10 flex flex-1 flex-col rounded-t-[2rem] border-t border-border bg-card px-5 pt-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:mt-0 md:justify-center md:rounded-none md:border-t-0 md:border-l md:px-12"
      data-state={state}
    >
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </main>
  );
}

/** Every account screen (sign in, join, codes, reset, unlock, tablet switch) shares this shell. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <MachineStateProvider>
      <div className="auth-theme flex min-h-dvh flex-col md:grid md:grid-cols-[1.1fr_1fr]">
        <section className="relative flex flex-col items-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-12 md:justify-center md:pb-5">
          <div className="flex w-full items-center gap-2 md:absolute md:top-6 md:left-8 md:w-auto">
            <span className="size-2.5 rounded-full bg-[var(--tangerine)] shadow-[0_0_12px_var(--tangerine)]" aria-hidden />
            <span className="text-lg font-bold tracking-wide">KRE</span>
            <span className="text-base text-muted-foreground">Asset Management Tool</span>
          </div>
          <div className="w-[min(72vw,17rem)] pt-4 md:w-[min(34vw,26rem)] md:pt-0">
            <MachineHero />
          </div>
        </section>
        <Sheet>{children}</Sheet>
      </div>
    </MachineStateProvider>
  );
}
