import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireActive } from "@/lib/auth/session";
import { setupSections } from "@/lib/nav/setup";

export default async function SetupPage() {
  const me = await requireActive();
  if (setupSections(me.actor).length === 0) notFound();
  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-bold">Setup</h1>
      <ul className="divide-y surface overflow-hidden">
        {setupSections(me.actor).map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="press flex min-h-14 items-center justify-between px-4 text-lg">
              {s.label}
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
