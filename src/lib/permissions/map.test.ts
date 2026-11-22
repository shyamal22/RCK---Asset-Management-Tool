import { describe, expect, it } from "vitest";
import { AREAS, PERMISSION_MAP, type Area } from "./map";
import { can, scopeFor, permissionRows } from "./check";
import { USER_TYPES, type UserType } from "./types";

/**
 * Independent transcription of the docs/05 matrix. Each string is action:scope, with
 * "+lead" when the Workshop lead flag is required. If the map and this table disagree,
 * one of them is wrong — check docs/05 before changing either.
 */
const EXPECTED: Record<Area, Record<UserType, string[]>> = {
  dashboard: { director: ["view:all", "export:all"], office: ["view:all"], workshop: [], supervisor: [], crew: [] },
  workshop_budget: { director: ["view:all"], office: ["view:all"], workshop: ["view:all+lead"], supervisor: [], crew: [] },
  assets: {
    director: ["view:all", "create:all", "edit:all", "delete:all"],
    office: ["view:all", "create:all", "edit:all"],
    workshop: ["view:all", "create:all", "edit:all"],
    supervisor: ["view:all"],
    crew: ["view:crew"],
  },
  asset_tracking_unit: { director: ["edit:all"], office: [], workshop: ["edit:all+lead"], supervisor: [], crew: [] },
  asset_commercial: { director: ["view:all", "edit:all"], office: ["view:all"], workshop: [], supervisor: [], crew: [] },
  docs_workshop: {
    director: ["view:all"],
    office: ["view:all"],
    workshop: ["view:all", "create:all", "edit:all", "delete:all"],
    supervisor: [],
    crew: [],
  },
  docs_operator: {
    director: ["view:all", "create:all", "edit:all", "delete:all"],
    office: ["view:all"],
    workshop: ["view:all", "create:all", "edit:all", "delete:all"],
    supervisor: ["view:all"],
    crew: ["view:all"],
  },
  docs_compliance: {
    director: ["view:all", "create:all", "edit:all", "delete:all"],
    office: ["view:all", "create:all", "edit:all", "delete:all"],
    workshop: ["view:all"],
    supervisor: ["view:all"],
    crew: [],
  },
  prechecks: {
    director: ["view:all"],
    office: ["view:all"],
    workshop: ["view:all"],
    supervisor: ["view:crew", "create:crew"],
    crew: ["view:own", "create:crew"],
  },
  precheck_templates: {
    director: ["view:all", "create:all", "edit:all", "delete:all"],
    office: [],
    workshop: ["view:all", "create:all", "edit:all", "delete:all"],
    supervisor: [],
    crew: [],
  },
  defects: {
    director: ["view:all", "create:all", "triage:all", "delete:all"],
    office: ["view:all"],
    workshop: ["view:all", "create:all", "triage:all"],
    supervisor: ["view:crew", "create:all"],
    crew: ["view:own", "create:all"],
  },
  work_orders: {
    director: ["view:all", "create:all", "edit:all", "assign:all", "sign_off:all", "cost:all", "delete:all"],
    office: ["view:all", "cost:all"],
    workshop: ["view:all", "create:all", "edit:all", "assign:all+lead", "sign_off:all+lead"],
    supervisor: ["view:crew"],
    crew: ["view:own"],
  },
  labour: {
    director: ["view:all"],
    office: ["view:all"],
    workshop: ["view:own", "create:own", "edit:own", "view:all+lead", "edit:all+lead"],
    supervisor: [],
    crew: [],
  },
  parts: {
    director: ["view:all", "create:all", "edit:all", "issue:all", "request:all", "delete:all"],
    office: ["view:all", "create:all", "edit:all", "issue:all", "request:all", "delete:all"],
    workshop: ["view:all", "issue:all", "request:all"],
    supervisor: [],
    crew: [],
  },
  purchasing: {
    director: ["view:all", "approve:all"],
    office: ["view:all", "create:all", "edit:all", "match:all"],
    workshop: ["view:own", "request:all"],
    supervisor: [],
    crew: [],
  },
  settings: { director: ["view:all", "use:all", "edit:all"], office: ["view:all", "use:all"], workshop: [], supervisor: [], crew: [] },
  users: {
    director: ["view:all", "view_pending:all", "approve:all", "edit:all", "deactivate:all"],
    office: ["view_pending:all"],
    workshop: [],
    supervisor: [],
    crew: [],
  },
  audit_log: { director: ["view:all", "export:all"], office: [], workshop: ["view:own"], supervisor: [], crew: [] },
};

const encode = (g: { action: string; scope: string; flag?: string }) =>
  `${g.action}:${g.scope}${g.flag ? "+lead" : ""}`;

const cells = (Object.keys(AREAS) as Area[]).flatMap((area) =>
  USER_TYPES.map((userType) => ({ area, userType })),
);

describe("permission map — every cell matches docs/05", () => {
  it("covers every area", () => {
    expect(Object.keys(PERMISSION_MAP).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(cells)("$area × $userType", ({ area, userType }) => {
    const actual = PERMISSION_MAP[area][userType].map(encode).sort();
    expect(actual).toEqual([...EXPECTED[area][userType]].sort());
  });

  it.each(cells)("$area × $userType uses only actions valid for the area", ({ area, userType }) => {
    for (const g of PERMISSION_MAP[area][userType]) {
      expect(AREAS[area] as readonly string[]).toContain(g.action);
    }
  });
});

describe("can / scopeFor", () => {
  const workshop = { userType: "workshop" as const, flags: [] };
  const lead = { userType: "workshop" as const, flags: ["workshop_lead" as const] };
  const crew = { userType: "crew" as const, flags: [] };

  it("Workshop lead flag unlocks assign and sign-off", () => {
    expect(can(workshop, "work_orders", "sign_off")).toBe(false);
    expect(can(lead, "work_orders", "sign_off")).toBe(true);
    expect(can(lead, "work_orders", "assign")).toBe(true);
  });

  it("lead flag widens labour from own to all", () => {
    expect(scopeFor(workshop, "labour", "edit")).toBe("own");
    expect(scopeFor(lead, "labour", "edit")).toBe("all");
  });

  it("Crew cannot see workshop documents, costs or commercial values", () => {
    expect(can(crew, "docs_workshop", "view")).toBe(false);
    expect(can(crew, "work_orders", "cost")).toBe(false);
    expect(can(crew, "asset_commercial", "view")).toBe(false);
    expect(can(crew, "dashboard", "view")).toBe(false);
  });

  it("flattens to unique rows for the database", () => {
    const rows = permissionRows();
    const keys = rows.map((r) => `${r.userType}|${r.area}|${r.action}|${r.requiredFlag}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.length).toBeGreaterThan(50);
  });
});
