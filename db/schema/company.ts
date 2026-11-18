import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";

/** Tenant. `id` is the company_id every other table points at. */
export const companies = pgTable("companies", {
  id: id(),
  name: text("name").notNull(),
  nzbn: text("nzbn"),
  logoPath: text("logo_path"),
  timeZone: text("time_zone").notNull().default("Pacific/Auckland"),
  currency: text("currency").notNull().default("NZD"),
  signupCode: text("signup_code")
    .notNull()
    .unique()
    .default(sql`encode(extensions.gen_random_bytes(9), 'hex')`),
  signupEnabled: boolean("signup_enabled").notNull().default(true),
  labourRateCents: integer("labour_rate_cents"),
  approvalLimitCents: integer("approval_limit_cents").notNull().default(200000),
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  ...timestamps(),
});

export const sites = pgTable(
  "sites",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    address: text("address"),
    ...timestamps(),
  },
  (t) => [index("sites_company_idx").on(t.companyId)],
);

export const crews = pgTable(
  "crews",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    ...timestamps(),
  },
  (t) => [index("crews_company_idx").on(t.companyId)],
);

export const ownerEntities = pgTable(
  "owner_entities",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    leaseRateCents: integer("lease_rate_cents"),
    ...timestamps(),
  },
  (t) => [index("owner_entities_company_idx").on(t.companyId)],
);
