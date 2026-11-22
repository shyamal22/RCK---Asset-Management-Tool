import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Open damage reports on a machine: red if any is Unusable, else yellow. */
export function FlagBadge({ flag, n, className }: { flag: "yellow" | "red"; n: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
        flag === "red" ? "bg-status-red text-white" : "bg-status-yellow text-[var(--onyx)]",
        className,
      )}
    >
      <TriangleAlert className="size-3.5" aria-hidden />
      {n} {n === 1 ? "report" : "reports"}
    </span>
  );
}
