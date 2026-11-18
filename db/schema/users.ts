import { index, integer, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { companies, crews, sites } from "./company";
import { createdAt, updatedAt } from "./common";
import { permissionScopeEnum, userFlagEnum, userStatusEnum, userTypeEnum } from "./enums";

/** App profile for each person. Never deleted: deactivated instead. */
export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    email: text("email"),
    mobile: text("mobile"),
    status: userStatusEnum("status").notNull().default("pending"),
    userType: userTypeEnum("user_type"),
    crewId: uuid("crew_id").references(() => crews.id),
    siteId: uuid("site_id").references(() => sites.id),
    hourlyCostRateCents: integer("hourly_cost_rate_cents"),
    pinHash: text("pin_hash"),
    failedPinAttempts: integer("failed_pin_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("users_company_idx").on(t.companyId), index("users_crew_idx").on(t.crewId)],
);

/** Company copy of the permission map (seeded from src/lib/permissions/map.ts). */
export const userTypePermissions = pgTable(
  "user_type_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userType: userTypeEnum("user_type").notNull(),
    area: text("area").notNull(),
    action: text("action").notNull(),
    scope: permissionScopeEnum("scope").notNull(),
    requiredFlag: userFlagEnum("required_flag"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("utp_unique").on(t.companyId, t.userType, t.area, t.action, t.requiredFlag),
  ],
);

export const userFlags = pgTable(
  "user_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    flag: userFlagEnum("flag").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("user_flags_user_idx").on(t.userId)],
);

/** Acting access: a user temporarily acts as another user type until ends_at. */
export const tempAccess = pgTable(
  "temp_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    userType: userTypeEnum("user_type").notNull(),
    reason: text("reason").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("temp_access_user_idx").on(t.userId)],
);

/** A browser/phone a user has signed in on. The cookie holds a random token; we store its hash. */
export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    label: text("label"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    unlockedUntil: timestamp("unlocked_until", { withTimezone: true }),
    webauthnChallenge: text("webauthn_challenge"),
    challengeExpiresAt: timestamp("challenge_expires_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("trusted_devices_user_token").on(t.userId, t.tokenHash)],
);

/** Supabase sessions that passed the device check (second step for Director/Office). */
export const verifiedSessions = pgTable("verified_sessions", {
  sessionId: uuid("session_id").primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  deviceId: uuid("device_id").references(() => trustedDevices.id),
  createdAt: createdAt(),
});

export const passkeys = pgTable(
  "passkeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transports: text("transports").array(),
    label: text("label"),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("passkeys_user_idx").on(t.userId)],
);

/**
 * Failed sign-in attempts, keyed by email/mobile. Pre-authentication, so there is no tenant
 * yet: the one table without company_id. RLS on with no policies (server only).
 */
export const signInFailures = pgTable(
  "sign_in_failures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    ip: text("ip"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sign_in_failures_ident_at").on(t.identifier, t.at)],
);

/** A device (by cookie) set up as a shared workshop tablet: users switch by personal PIN. */
export const sharedDevices = pgTable("shared_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
