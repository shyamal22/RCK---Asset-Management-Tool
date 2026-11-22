"use client";
import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** A whole-row on/off setting: the label and the switch are one big tap target. */
export function SwitchRow({
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-[1rem] border border-input bg-background px-4 text-body font-semibold", className)}>
      {label}
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}
