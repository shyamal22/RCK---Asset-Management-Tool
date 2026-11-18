import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireActive } from "@/lib/auth/session";
import { setupSections } from "@/lib/nav/setup";

export default async function SetupPage() {
  const me = await requireActive();
  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-bold">Setup</h1>
      <ul className="divide-y rounded-lg border bg-card">
        {setupSections(me.actor).map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex min-h-14 items-center justify-between px-4 text-lg">
              {s.label}
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
