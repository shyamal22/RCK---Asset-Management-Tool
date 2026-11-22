"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/**
 * Pick-one switch (Hours | Kilometres, Fixed | Dismiss, user type…) built on shadcn/ui ToggleGroup.
 * Radix gives each option role="radio" + aria-checked; clicking the chosen option never clears it.
 */
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
    <ToggleGroup
      type="single"
      spacing={1}
      aria-label={label}
      value={value || ""}
      onValueChange={(v) => {
        if (v) onChange(v as T);
      }}
      className={cn(
        "grid w-full gap-1 rounded-full border border-input bg-muted p-1",
        options.length > 3 ? "grid-cols-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none" : "auto-cols-fr grid-flow-col",
      )}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-11 min-w-0 truncate rounded-full px-1 text-callout font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
