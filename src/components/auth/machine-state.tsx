"use client";
import { createContext, useContext, useEffect, useState } from "react";

/** What the sign-in hero is doing: idle, waiting on the server, wrong details, or through. */
export type MachineState = "idle" | "busy" | "error" | "ok";

type Ctx = { state: MachineState; set: (s: MachineState) => void; reveal: boolean; setReveal: (v: boolean) => void };
const Ctx = createContext<Ctx>({ state: "idle", set: () => undefined, reveal: false, setReveal: () => undefined });

export function MachineStateProvider({ children }: { children: React.ReactNode }) {
  const [state, set] = useState<MachineState>("idle");
  // A password is showing as letters: the operator in the cab looks away.
  const [reveal, setReveal] = useState(false);
  return <Ctx.Provider value={{ state, set, reveal, setReveal }}>{children}</Ctx.Provider>;
}

export const useMachineState = () => useContext(Ctx);

/**
 * Drives the hero from a form: busy while `pending`, a short error pulse whenever a new
 * `error` appears, then back to idle. `ok` is set by the form just before it navigates away.
 */
export function useMachineFeedback(pending: boolean, error: string | null | undefined) {
  const { set } = useMachineState();
  useEffect(() => {
    if (pending) set("busy");
  }, [pending, set]);
  useEffect(() => {
    if (pending) return;
    if (!error) return set("idle");
    set("error");
    const t = setTimeout(() => set("idle"), 1400);
    return () => clearTimeout(t);
  }, [pending, error, set]);
  return set;
}
