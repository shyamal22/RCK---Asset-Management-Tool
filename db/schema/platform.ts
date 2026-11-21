import { index, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { companies } from "./company";
import { users } from "./users";
import { createdAt } from "./common";

/**
 * KRE admins: users of the platform company (KRE Consulting) who manage client companies.
 * They see the list of companies and users, never client data, except through support_access.
 */
export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    grantedBy: uuid("granted_by").references(() => users.id),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("platform_admins_user_active").on(t.userId).where(sql`revoked_at is null`)],
);

/** A client company's first Director, invited by a KRE admin. Signing up with this email makes them an active Director. */
export const directorInvites = pgTable(
  "director_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: createdAt(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedUserId: uuid("accepted_user_id").references(() => users.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("director_invites_company_idx").on(t.companyId)],
);

/** Time-limited, read-only access for a KRE admin to one client company (support). */
export const supportAccess = pgTable(
  "support_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedBy: uuid("ended_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("support_access_company_idx").on(t.companyId), index("support_access_admin_idx").on(t.adminUserId)],
);
