import { cn } from "@/lib/utils";

const TONE = { green: "bg-status-green", yellow: "bg-status-yellow", red: "bg-status-red" } as const;

export function StatusDot({ tone, label }: { tone: keyof typeof TONE; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn("size-2.5 rounded-full", TONE[tone])} aria-hidden />
      {label}
    </span>
  );
}
