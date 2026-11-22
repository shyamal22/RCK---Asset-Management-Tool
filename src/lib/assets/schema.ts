import { z } from "zod";
import { ASSET_STATUSES, TRACKING_UNITS } from "./labels";

const optionalId = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.uuid().optional());
const optionalText = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

/** A reading as typed: "1,234.5" → 1234.5. Empty → undefined. */
export const readingInput = z.preprocess(
  (v) => (typeof v === "string" ? (v.replace(/[,\s]/g, "") === "" ? undefined : Number(v.replace(/[,\s]/g, ""))) : v),
  z.number({ error: "Enter a number" }).min(0, "Can't be negative").max(99_999_999, "That reading is too big").optional(),
);

/** Shared by Add and Edit (docs/06: six fixed details are required). */
export const assetDetailsSchema = z.object({
  assetTypeId: z.uuid("Pick a type"),
  code: z
    .string()
    .trim()
    .min(1, "Enter a code")
    .max(20, "Keep the code under 20 characters")
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1, "Enter a name").max(80),
  make: z.string().trim().min(1, "Enter the make").max(60),
  model: z.string().trim().min(1, "Enter the model").max(60),
  year: z.coerce
    .number({ error: "Enter the year" })
    .int("Enter a 4-digit year")
    .min(1950, "Enter a 4-digit year")
    .max(new Date().getFullYear() + 1, "That year is in the future"),
  siteId: optionalId,
  crewId: optionalId,
  ownerEntityId: optionalId,
  rego: optionalText(10),
  vinSerial: optionalText(40),
  notes: optionalText(1000),
});

export const createAssetSchema = assetDetailsSchema.extend({
  trackingUnit: z.enum(TRACKING_UNITS, { error: "Choose Hours or Kilometres" }),
  reading: readingInput,
});

export const updateAssetSchema = assetDetailsSchema.extend({
  id: z.uuid(),
  status: z.enum(ASSET_STATUSES),
});

export type CreateAssetInput = z.input<typeof createAssetSchema>;
