"use client";
import { MachineStateProvider, useMachineState } from "./machine-state";
import { StatusBarBackdrop } from "@/components/shell/status-bar";

/** Theme + feedback state for every account screen; each page draws its own header and sheet via <Screen>. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <MachineStateProvider>
      <div className="auth-theme flex flex-col md:items-center md:justify-center md:py-10">
        <StatusBarBackdrop />
        {children}
      </div>
    </MachineStateProvider>
  );
}

/** White sheet with big rounded top corners; carries the waiting / wrong-details state for its CSS. */
export function AuthSheet({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const { state } = useMachineState();
  return (
    <main
      className={`auth-sheet relative flex-1 rounded-t-[3.25rem] px-7 pt-12 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] md:w-full md:flex-none ${wide ? "md:max-w-3xl" : "md:max-w-md"} md:rounded-[2.5rem] md:px-10 md:pt-10`}
      data-state={state}
    >
      {children}
    </main>
  );
}
