export const USER_TYPES = ["director", "office", "workshop", "supervisor", "crew"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const USER_FLAGS = ["workshop_lead"] as const;
export type UserFlag = (typeof USER_FLAGS)[number];

export const PERMISSION_SCOPES = ["all", "crew", "own"] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  director: "Director",
  office: "Office",
  workshop: "Workshop",
  supervisor: "Supervisor",
  crew: "Crew",
};
