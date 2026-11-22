import Link from "next/link";

export function Section({ title, children, href }: { title: string; children: React.ReactNode; href?: string }) {
  return (
    <section className="grid gap-2 surface p-4" aria-label={title}>
      <h2 className="text-lg font-bold">{href ? <Link href={href}>{title}</Link> : title}</h2>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-muted-foreground">{children}</p>;
}

export function Count({ n, href, label }: { n: number; href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-between gap-3 text-base">
      <span>{label}</span>
      <span className="text-2xl font-bold tabular-nums">{n}</span>
    </Link>
  );
}
