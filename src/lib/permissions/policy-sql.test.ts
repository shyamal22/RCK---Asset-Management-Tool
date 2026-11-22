import { describe, expect, it } from "vitest";
import { policySql } from "./policy-sql";

describe("policySql", () => {
  it("generates select/insert/update policies from the area's actions", () => {
    const sql = policySql({ table: "asset_documents", area: "docs_workshop", softDelete: true });
    expect(sql).toContain("enable row level security");
    // Reads evaluate the user's company/scope once per query (InitPlans), not per row.
    expect(sql).toContain("company_id = (select app.current_company_id()) and case (select app.permission_scope('docs_workshop', 'view'))");
    expect(sql).toContain("or ((select app.is_platform_admin()) and app.has_support(company_id))) and deleted_at is null");
    expect(sql).toContain("for insert to authenticated with check (app.allows('docs_workshop', 'create'");
    expect(sql).toContain("revoke delete, truncate");
  });

  it("omits insert/update for areas without those actions", () => {
    const sql = policySql({ table: "prechecks", area: "prechecks", crewColumn: "crew_id", ownerColumn: "created_by" });
    expect(sql).toContain("for insert");
    expect(sql).not.toContain("for update");
    expect(sql).toContain("crew_id::uuid, created_by::uuid");
    expect(sql).toContain("when 'crew' then crew_id = (select app.current_crew_id()) when 'own' then created_by = (select auth.uid())");
  });

  it("rejects unsafe identifiers", () => {
    expect(() => policySql({ table: "x; drop table users", area: "assets" })).toThrow();
  });
});
