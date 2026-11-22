import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Tabs that are links (the choice lives in the URL, so it works without JavaScript and can be shared).
 * Styled like shadcn/ui TabsList / TabsTrigger.
 */
export function LinkTabs({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex h-12 w-fit items-center gap-1 rounded-full bg-muted p-1 text-base font-semibold text-muted-foreground shadow-[inset_0_2px_5px_rgb(11_11_16/.09)]">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          scroll={false}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "press inline-flex h-10 items-center rounded-full px-5",
            t.active ? "bg-background text-[var(--indigo)] shadow-[0_4px_14px_-6px_var(--indigo)]" : "hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
