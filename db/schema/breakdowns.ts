import { sql } from "drizzle-orm";
import { doublePrecision, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies, crews } from "./company";
import { users } from "./users";
import { assets } from "./assets";
import { createdAt, id, updatedAt } from "./common";
import { breakdownSeverityEnum, breakdownStatusEnum } from "./enums";

/**
 * Damage / breakdown report (docs/07 §2). Raises a yellow (still usable) or red (unusable) flag on
 * the asset. Never deleted; closed by dismissing (reason) or marking fixed (what was done).
 */
export const breakdownReports = pgTable(
  "breakdown_reports",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    /** The asset's crew when raised (Supervisor sees their crew's reports). */
    crewId: uuid("crew_id").references(() => crews.id),
    raisedBy: uuid("raised_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    details: text("details").notNull(),
    severity: breakdownSeverityEnum("severity").notNull(),
    photoPaths: text("photo_paths")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    reading: numeric("reading", { precision: 12, scale: 1, mode: "number" }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    status: breakdownStatusEnum("status").notNull().default("open"),
    closedNote: text("closed_note"),
    closedBy: uuid("closed_by").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("breakdowns_company_status_idx").on(t.companyId, t.status, t.createdAt),
    index("breakdowns_asset_idx").on(t.assetId, t.status),
  ],
);
