"use client";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-1 rounded-md border p-1",
        options.length > 3 ? "grid-cols-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none" : "auto-cols-fr grid-flow-col",
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-11 min-w-0 truncate rounded px-1 text-base font-bold",
            value === o.value ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
