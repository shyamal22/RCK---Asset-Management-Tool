import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { auditLog, userFlags, users } from "@db/schema";
import { expectDbError, makeCompany, makeUser } from "./helpers";

let co: Awaited<ReturnType<typeof makeCompany>>;
let other: Awaited<ReturnType<typeof makeCompany>>;
let director: Awaited<ReturnType<typeof makeUser>>;
let office: Awaited<ReturnType<typeof makeUser>>;

const approve = (actor: { id: string; sessionId: string }, userId: string, type = "workshop", crew: string | null = null, lead = false) =>
  asUser(actor, (tx) =>
    tx.execute(sql`select public.approve_user(${userId}, ${type}::public.user_type, ${crew}, ${lead})`),
  );

beforeAll(async () => {
  co = await makeCompany();
  other = await makeCompany();
  director = await makeUser({ companyId: co.company.id, userType: "director" });
  office = await makeUser({ companyId: co.company.id, userType: "office" });
});

describe("approving accounts", () => {
  it("Director approves with type, crew and Workshop lead flag; audited", async () => {
    const p = await makeUser({ companyId: co.company.id, userType: null, status: "pending" });
    await approve(director, p.id, "workshop", co.crew.id, true);
    const [u] = await adminDb.select().from(users).where(eq(users.id, p.id));
    expect(u.status).toBe("active");
    expect(u.userType).toBe("workshop");
    expect(u.approvedBy).toBe(director.id);
    const flags = await adminDb.select().from(userFlags).where(eq(userFlags.userId, p.id));
    expect(flags.map((f) => f.flag)).toEqual(["workshop_lead"]);
    const audit = await adminDb.select().from(auditLog).where(eq(auditLog.entityId, p.id));
    expect(audit.map((a) => a.action)).toContain("approve");
    expect(audit.find((a) => a.action === "approve")?.actorUserId).toBe(director.id);
  });

  it("Office can see pending accounts but cannot approve", async () => {
    const p = await makeUser({ companyId: co.company.id, userType: null, status: "pending" });
    const seen = await asUser(office, (tx) =>
      tx.select({ id: users.id }).from(users).where(eq(users.id, p.id)),
    );
    expect(seen).toHaveLength(1);
    await expectDbError(approve(office, p.id), /Not permitted/);
  });

  it("Crew cannot see pending accounts", async () => {
    const crew = await makeUser({ companyId: co.company.id, userType: "crew" });
    const p = await makeUser({ companyId: co.company.id, userType: null, status: "pending" });
    const seen = await asUser(crew, (tx) => tx.select({ id: users.id }).from(users).where(eq(users.id, p.id)));
    expect(seen).toHaveLength(0);
  });

  it("cannot approve someone in another company", async () => {
    const p = await makeUser({ companyId: other.company.id, userType: null, status: "pending" });
    await expectDbError(approve(director, p.id), /No pending user/);
  });

  it("cannot assign a crew from another company", async () => {
    const p = await makeUser({ companyId: co.company.id, userType: null, status: "pending" });
    await expectDbError(approve(director, p.id, "crew", other.crew.id), /Unknown crew/);
  });

  it("reject keeps the account but with no access", async () => {
    const p = await makeUser({ companyId: co.company.id, userType: null, status: "pending" });
    await asUser(director, (tx) => tx.execute(sql`select public.reject_user(${p.id}, 'not staff')`));
    const [u] = await adminDb.select().from(users).where(eq(users.id, p.id));
    expect(u.status).toBe("rejected");
    const r = await asUser(p, (tx) => tx.execute(sql`select app.current_company_id() as c`));
    expect((r as unknown as { c: string | null }[])[0].c).toBeNull();
  });
});
