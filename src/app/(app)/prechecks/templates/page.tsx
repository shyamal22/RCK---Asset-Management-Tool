import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/guard";
import { runAs } from "@/lib/assets/queries";
import { typeTemplates } from "@/lib/prechecks/queries";

export const dynamic = "force-dynamic";

/** Workshop / Director: one pre-check template per machine type. */
export default async function TemplatesPage() {
  const me = await requirePermission("precheck_templates", "edit");
  const types = await runAs(me, (tx) => typeTemplates(tx));
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <h1 className="text-large-title">Templates</h1>
      <ul className="surface divide-y divide-border overflow-hidden" aria-label="Machine types">
        {types.map((t) => (
          <li key={t.type_id}>
            <Link href={`/prechecks/templates/${t.type_id}`} className="press flex min-h-14 items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-headline">{t.type_name}</span>
              <span className={t.template_id ? "text-footnote text-muted-foreground" : "text-footnote font-bold text-[var(--indigo)]"}>
                {t.template_id ? `${t.items} checks` : "Not set up"}
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
