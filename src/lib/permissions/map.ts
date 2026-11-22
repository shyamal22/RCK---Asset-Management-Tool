/**
 * THE permission map (docs/05-users-and-access.md). Single source of truth:
 * - server checks call `can()` from ./check
 * - each company's `user_type_permissions` rows are generated from it (RLS reads those)
 * Never hard-code a user type check in a screen; ask the map.
 */
import type { PermissionScope, UserFlag, UserType } from "./types";

export const AREAS = {
  dashboard: ["view", "export"],
  workshop_budget: ["view"],
  assets: ["view", "create", "edit", "delete"],
  asset_tracking_unit: ["edit"],
  asset_commercial: ["view", "edit"],
  docs_workshop: ["view", "create", "edit", "delete"],
  docs_operator: ["view", "create", "edit", "delete"],
  docs_compliance: ["view", "create", "edit", "delete"],
  prechecks: ["view", "create"],
  precheck_templates: ["view", "create", "edit", "delete"],
  defects: ["view", "create", "triage", "delete"],
  work_orders: ["view", "create", "edit", "assign", "sign_off", "cost", "delete"],
  labour: ["view", "create", "edit"],
  parts: ["view", "create", "edit", "issue", "request", "delete"],
  purchasing: ["view", "request", "create", "edit", "match", "approve", "delete"],
  settings: ["view", "use", "edit"],
  users: ["view", "view_pending", "approve", "edit", "deactivate"],
  audit_log: ["view", "export"],
} as const;

export type Area = keyof typeof AREAS;
export type Action<A extends Area = Area> = (typeof AREAS)[A][number];

export type Grant = { action: string; scope: PermissionScope; flag?: UserFlag };
export type Cell = readonly Grant[];

const all = (...actions: string[]): Grant[] => actions.map((action) => ({ action, scope: "all" }));
const crew = (...actions: string[]): Grant[] => actions.map((action) => ({ action, scope: "crew" }));
const own = (...actions: string[]): Grant[] => actions.map((action) => ({ action, scope: "own" }));
const lead = (grants: Grant[]): Grant[] => grants.map((g) => ({ ...g, flag: "workshop_lead" }));
const full = (area: Area): Grant[] => all(...AREAS[area]);

export const PERMISSION_MAP: Record<Area, Record<UserType, Cell>> = {
  // "Overall dashboard and cost reports": Full · View · Workshop budget only (lead) · — · —
  dashboard: {
    director: full("dashboard"),
    office: all("view"),
    workshop: [],
    supervisor: [],
    crew: [],
  },
  workshop_budget: {
    director: all("view"),
    office: all("view"),
    workshop: lead(all("view")),
    supervisor: [],
    crew: [],
  },
  // "Asset register (basic details)": Full · Edit · Edit · View · View (own machines)
  assets: {
    director: full("assets"),
    office: all("view", "create", "edit"),
    workshop: all("view", "create", "edit"),
    supervisor: all("view"),
    crew: crew("view"),
  },
  // docs/06: changing Hours ↔ Kilometres later is Director or Workshop lead only (reason required, audited).
  asset_tracking_unit: {
    director: all("edit"),
    office: [],
    workshop: lead(all("edit")),
    supervisor: [],
    crew: [],
  },
  // "Asset value, lease, cost history": Full · View · — · — · —
  asset_commercial: {
    director: full("asset_commercial"),
    office: all("view"),
    workshop: [],
    supervisor: [],
    crew: [],
  },
  // "Workshop documents": View · View · Full · — · —
  docs_workshop: {
    director: all("view"),
    office: all("view"),
    workshop: full("docs_workshop"),
    supervisor: [],
    crew: [],
  },
  // "Operator documents": Full · View · Full · View · View
  docs_operator: {
    director: full("docs_operator"),
    office: all("view"),
    workshop: full("docs_operator"),
    supervisor: all("view"),
    crew: all("view"),
  },
  // "Compliance documents": Full · Full · View · View · —
  docs_compliance: {
    director: full("docs_compliance"),
    office: full("docs_compliance"),
    workshop: all("view"),
    supervisor: all("view"),
    crew: [],
  },
  // "Pre-start checks": View all · View all · View all · Do + view crew · Do + view own
  prechecks: {
    director: all("view"),
    office: all("view"),
    workshop: all("view"),
    supervisor: [...crew("view"), ...crew("create")],
    crew: [...own("view"), ...crew("create")],
  },
  // Templates: Workshop + Director build (docs/07); Supervisor: no (Q17 default).
  precheck_templates: {
    director: full("precheck_templates"),
    office: [],
    workshop: full("precheck_templates"),
    supervisor: [],
    crew: [],
  },
  // "Defects and breakdowns": Full · View · Full (triage) · Raise + view crew · Raise + view own
  defects: {
    director: full("defects"),
    office: all("view"),
    workshop: all("view", "create", "triage"),
    supervisor: [...crew("view"), ...all("create")],
    crew: [...own("view"), ...all("create")],
  },
  // "Work orders": Full · View + costing · Full (lead assigns, signs off) · View status (crew) · View status (own reports)
  work_orders: {
    director: full("work_orders"),
    office: all("view", "cost"),
    workshop: [...all("view", "create", "edit"), ...lead(all("assign", "sign_off"))],
    supervisor: crew("view"),
    crew: own("view"),
  },
  // "Labour time": View · View · Log own (lead edits all) · — · —
  labour: {
    director: all("view"),
    office: all("view"),
    workshop: [...own("view", "create", "edit"), ...lead(all("view", "edit"))],
    supervisor: [],
    crew: [],
  },
  // "Parts and stock": Full · Full · Issue + request · — · —
  parts: {
    director: full("parts"),
    office: full("parts"),
    workshop: all("view", "issue", "request"),
    supervisor: [],
    crew: [],
  },
  // "POs and supplier invoices": Approve · Create + match · Request · — · —
  purchasing: {
    director: all("view", "approve"),
    office: all("view", "create", "edit", "match"),
    workshop: [...own("view"), ...all("request")],
    supervisor: [],
    crew: [],
  },
  // "Xero and company settings": Full · Use · — · — · —
  settings: {
    director: full("settings"),
    office: all("view", "use"),
    workshop: [],
    supervisor: [],
    crew: [],
  },
  // "Approving accounts, user types, logins": Full · See pending accounts · — · — · —
  users: {
    director: full("users"),
    office: all("view_pending"),
    workshop: [],
    supervisor: [],
    crew: [],
  },
  // "Audit log": Full · — · Own work orders · — · —
  audit_log: {
    director: full("audit_log"),
    office: [],
    workshop: own("view"),
    supervisor: [],
    crew: [],
  },
};
