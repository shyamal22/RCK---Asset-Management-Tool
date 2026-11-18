import { pgEnum } from "drizzle-orm/pg-core";
import { PERMISSION_SCOPES, USER_FLAGS, USER_TYPES } from "../../src/lib/permissions/types";

export { PERMISSION_SCOPES, USER_FLAGS, USER_TYPES };

export const userTypeEnum = pgEnum("user_type", USER_TYPES);

export const USER_STATUSES = ["pending", "active", "rejected", "deactivated"] as const;
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);

export const userFlagEnum = pgEnum("user_flag", USER_FLAGS);

export const permissionScopeEnum = pgEnum("permission_scope", PERMISSION_SCOPES);
