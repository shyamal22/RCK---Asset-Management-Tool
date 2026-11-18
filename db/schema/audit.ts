import { bigserial, doublePrecision, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./company";

/** Append-only. UPDATE/DELETE are blocked by trigger and revoked from every API role. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    device: text("device"),
    ip: text("ip"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_company_at_idx").on(t.companyId, t.at),
    index("audit_entity_idx").on(t.entity, t.entityId),
  ],
);
