import { describe, expect, it } from "vitest";
import { policySql } from "./policy-sql";

describe("policySql", () => {
  it("generates select/insert/update policies from the area's actions", () => {
    const sql = policySql({ table: "asset_documents", area: "docs_workshop", softDelete: true });
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("app.allows('docs_workshop', 'view', company_id, null::uuid, null::uuid) and deleted_at is null");
    expect(sql).toContain("for insert to authenticated with check (app.allows('docs_workshop', 'create'");
    expect(sql).toContain("revoke delete, truncate");
  });

  it("omits insert/update for areas without those actions", () => {
    const sql = policySql({ table: "prechecks", area: "prechecks", crewColumn: "crew_id", ownerColumn: "created_by" });
    expect(sql).toContain("for insert");
    expect(sql).not.toContain("for update");
    expect(sql).toContain("crew_id::uuid, created_by::uuid");
  });

  it("rejects unsafe identifiers", () => {
    expect(() => policySql({ table: "x; drop table users", area: "assets" })).toThrow();
  });
});
