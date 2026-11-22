import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Open damage reports on a machine (shadcn/ui Badge): red if any is Unusable, else yellow. */
export function FlagBadge({ flag, n, className }: { flag: "yellow" | "red"; n: number; className?: string }) {
  return (
    <Badge
      className={cn(
        "gap-1 px-2.5 py-0.5 font-bold",
        flag === "red" ? "bg-status-red text-white" : "bg-status-yellow text-[var(--onyx)]",
        className,
      )}
    >
      <TriangleAlert aria-hidden />
      {n} {n === 1 ? "report" : "reports"}
    </Badge>
  );
}
