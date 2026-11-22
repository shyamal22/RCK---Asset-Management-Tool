import { ASSET_STATUSES, COMPLIANCE_KINDS, TRACKING_UNITS } from "@db/schema/enums";

export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type TrackingUnit = (typeof TRACKING_UNITS)[number];
export type ComplianceKind = (typeof COMPLIANCE_KINDS)[number];

export const STATUS_LABELS: Record<AssetStatus, string> = {
  available: "Available",
  in_use: "In use",
  unusable: "Unusable",
  in_workshop: "In workshop",
  at_subcontractor: "At subcontractor",
  parked: "Parked",
  disposed: "Disposed",
};

/** Green/yellow/red only for status (docs/10). Parked/disposed carry no colour. */
export const STATUS_TONE: Record<AssetStatus, "green" | "yellow" | "red" | null> = {
  available: "green",
  in_use: "green",
  in_workshop: "yellow",
  at_subcontractor: "yellow",
  unusable: "red",
  parked: null,
  disposed: null,
};

export const UNIT_LABELS: Record<TrackingUnit, { name: string; short: string }> = {
  hours: { name: "Hours", short: "hr" },
  km: { name: "Kilometres", short: "km" },
};

export const COMPLIANCE_LABELS: Record<ComplianceKind, string> = {
  cof: "CoF",
  wof: "WoF",
  ruc: "RUC",
  rego: "Rego",
  insurance: "Insurance",
  crane_cert: "Crane cert",
  other: "Other",
};

const num = new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 1 });

/** "1,234.5 hr" / "182,300 km" / "No reading" */
export function formatReading(reading: number | string | null | undefined, unit: TrackingUnit): string {
  if (reading === null || reading === undefined || reading === "") return "No reading";
  return `${num.format(Number(reading))} ${UNIT_LABELS[unit].short}`;
}

export { ASSET_STATUSES, TRACKING_UNITS };
