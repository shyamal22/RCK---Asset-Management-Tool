import { pgEnum } from "drizzle-orm/pg-core";
import { PERMISSION_SCOPES, USER_FLAGS, USER_TYPES } from "../../src/lib/permissions/types";

export { PERMISSION_SCOPES, USER_FLAGS, USER_TYPES };

export const userTypeEnum = pgEnum("user_type", USER_TYPES);

export const USER_STATUSES = ["pending", "active", "rejected", "deactivated"] as const;
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);

export const userFlagEnum = pgEnum("user_flag", USER_FLAGS);

export const permissionScopeEnum = pgEnum("permission_scope", PERMISSION_SCOPES);

/** docs/06: every asset is tracked by hours OR kilometres, chosen by the user. */
export const TRACKING_UNITS = ["hours", "km"] as const;
export const trackingUnitEnum = pgEnum("tracking_unit", TRACKING_UNITS);

/** PROGRESS Q3 default: Out of service = Unusable. */
export const ASSET_STATUSES = ["available", "in_use", "unusable", "in_workshop", "at_subcontractor", "parked", "disposed"] as const;
export const assetStatusEnum = pgEnum("asset_status", ASSET_STATUSES);

export const READING_SOURCES = ["manual", "precheck", "work_order", "telematics", "import"] as const;
export const readingSourceEnum = pgEnum("reading_source", READING_SOURCES);

export const COMPLIANCE_KINDS = ["cof", "wof", "ruc", "rego", "insurance", "crane_cert", "other"] as const;
export const complianceKindEnum = pgEnum("compliance_kind", COMPLIANCE_KINDS);

/** docs/07: Still usable (yellow) or Unusable (red). */
export const BREAKDOWN_SEVERITIES = ["usable", "unusable"] as const;
export const breakdownSeverityEnum = pgEnum("breakdown_severity", BREAKDOWN_SEVERITIES);

/** open → dismissed (not a fault, reason) | fixed (what was done). Work orders link in Milestone 3. */
export const BREAKDOWN_STATUSES = ["open", "dismissed", "fixed"] as const;
export const breakdownStatusEnum = pgEnum("breakdown_status", BREAKDOWN_STATUSES);
