import { sql } from "drizzle-orm";
import { boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies, crews, ownerEntities, sites } from "./company";
import { users } from "./users";
import { createdAt, id, timestamps } from "./common";
import { assetStatusEnum, complianceKindEnum, readingSourceEnum, trackingUnitEnum } from "./enums";

/** Company-editable list (Paver, Roller, Truck…). Suggests a tracking unit; the user still confirms. */
export const assetTypes = pgTable(
  "asset_types",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    defaultUnit: trackingUnitEnum("default_unit"),
    /** Suggests the next asset code, e.g. "ROL" → ROL-08 (RCK's existing convention). */
    codePrefix: text("code_prefix"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("asset_types_company_name").on(t.companyId, sql`lower(${t.name})`).where(sql`deleted_at is null`)],
);

export const assets = pgTable(
  "assets",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    /** Company's own code (T11, LV09). Uppercase, unique per company, printed on the QR label. */
    code: text("code").notNull(),
    name: text("name").notNull(),
    assetTypeId: uuid("asset_type_id")
      .notNull()
      .references(() => assetTypes.id),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    trackingUnit: trackingUnitEnum("tracking_unit").notNull(),
    /** Latest accepted meter reading (maintained by record_meter_reading). */
    currentReading: numeric("current_reading", { precision: 12, scale: 1, mode: "number" }),
    currentReadingAt: timestamp("current_reading_at", { withTimezone: true }),
    status: assetStatusEnum("status").notNull().default("available"),
    siteId: uuid("site_id").references(() => sites.id),
    crewId: uuid("crew_id").references(() => crews.id),
    ownerEntityId: uuid("owner_entity_id").references(() => ownerEntities.id),
    rego: text("rego"),
    vinSerial: text("vin_serial"),
    photoPath: text("photo_path"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("assets_company_code").on(t.companyId, t.code).where(sql`deleted_at is null`),
    index("assets_company_idx").on(t.companyId),
    index("assets_crew_idx").on(t.crewId),
  ],
);

/** Every reading ever entered. Append-only; lower-than-last readings are flagged, not applied. */
export const meterReadings = pgTable(
  "meter_readings",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    reading: numeric("reading", { precision: 12, scale: 1, mode: "number" }).notNull(),
    unit: trackingUnitEnum("unit").notNull(),
    source: readingSourceEnum("source").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
    enteredBy: uuid("entered_by").references(() => users.id),
    lowerThanPrevious: boolean("lower_than_previous").notNull().default(false),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("meter_readings_asset_idx").on(t.assetId, t.readAt)],
);

/** CoF, WoF, RUC, rego, insurance… with expiry (date, or km for RUC). */
export const complianceItems = pgTable(
  "compliance_items",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    kind: complianceKindEnum("kind").notNull(),
    expiresOn: date("expires_on"),
    expiresAtReading: numeric("expires_at_reading", { precision: 12, scale: 1, mode: "number" }),
    reference: text("reference"),
    documentPath: text("document_path"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [index("compliance_items_asset_idx").on(t.assetId), index("compliance_items_company_expiry").on(t.companyId, t.expiresOn)],
);
