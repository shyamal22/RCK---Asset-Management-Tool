import type { AssetStatus } from "./labels";
import { STATUS_TONE } from "./labels";

export type Backlight = "green" | "yellow" | "red" | "none";

/**
 * The glow behind the machine at the front of the wheel (Sam, 22/11/2026): its status at a glance.
 * An open damage report outranks the status: a red report (unusable) is red, a usable one yellow.
 */
export function backlightFor(status: AssetStatus, flag?: { flag: "yellow" | "red" } | null): Backlight {
  if (flag?.flag === "red" || status === "unusable") return "red";
  if (flag?.flag === "yellow") return "yellow";
  return STATUS_TONE[status] ?? "none";
}
