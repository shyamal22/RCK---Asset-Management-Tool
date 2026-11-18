import { notFound } from "next/navigation";
import { requireActive } from "@/lib/auth/session";
import { setupSections } from "@/lib/nav/setup";

/** Supervisor and Crew never get into Setup; others only see their sections. */
export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const me = await requireActive();
  if (setupSections(me.actor).length === 0) notFound();
  return <>{children}</>;
}
