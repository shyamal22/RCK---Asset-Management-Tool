import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { auditLog, users } from "@db/schema";
import { expectDbError, makeCompany, makeUser } from "./helpers";

type U = Awaited<ReturnType<typeof makeUser>>;
let co: Awaited<ReturnType<typeof makeCompany>>;
let director: U;
let workshop: U;

const q = <T,>(u: U, query: ReturnType<typeof sql>) =>
  asUser(u, async (tx) => (await tx.execute(query)) as unknown as T[]);
const canView = async (u: U, area: string) =>
  (await q<{ ok: boolean }>(u, sql`select app.can(${area}, 'view') as ok`))[0].ok;

beforeAll(async () => {
  co = await makeCompany();
  director = await makeUser({ companyId: co.company.id, userType: "director" });
  workshop = await makeUser({ companyId: co.company.id, userType: "workshop" });
});

describe("user admin", () => {
  it("Director changes type, crew and lead flag; before/after audited", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    await q(director, sql`select public.update_user_access(${u.id}, 'workshop', null, true)`);
    expect(await canView(u, "docs_workshop")).toBe(true);
    const lead = await q<{ ok: boolean }>(u, sql`select app.can('work_orders','sign_off') as ok`);
    expect(lead[0].ok).toBe(true);
    const [a] = await adminDb.select().from(auditLog).where(sql`entity_id = ${u.id} and action = 'update'`);
    expect((a.before as { user_type: string }).user_type).toBe("crew");
    expect((a.after as { user_type: string; workshop_lead: boolean }).workshop_lead).toBe(true);
    expect(JSON.stringify(a.after)).not.toContain("pin_hash");
  });

  it("only users.edit holders can change access; nobody changes their own", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    await expectDbError(q(workshop, sql`select public.update_user_access(${u.id}, 'director', null, false)`), /Not permitted/);
    await expectDbError(q(director, sql`select public.update_user_access(${director.id}, 'crew', null, false)`), /own access/);
  });

  it("acting access works until its end date, then reverts by itself", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    const [{ id }] = await q<{ id: string }>(director,
      sql`select public.grant_acting_access(${u.id}, 'workshop', now() + interval '2 days', 'covering for Mike') as id`);
    expect(await canView(u, "docs_workshop")).toBe(true);
    await adminDb.execute(sql`update public.temp_access set ends_at = now() - interval '1 second' where id = ${id}`);
    expect(await canView(u, "docs_workshop")).toBe(false);
  });

  it("acting access needs a reason and a future end within 90 days; can be revoked", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    await expectDbError(q(director, sql`select public.grant_acting_access(${u.id}, 'workshop', now() + interval '1 day', ' ')`), /Reason/);
    await expectDbError(q(director, sql`select public.grant_acting_access(${u.id}, 'workshop', now() - interval '1 day', 'x')`), /future/);
    await expectDbError(q(director, sql`select public.grant_acting_access(${u.id}, 'workshop', now() + interval '200 days', 'x')`), /90 days/);
    const [{ id }] = await q<{ id: string }>(director,
      sql`select public.grant_acting_access(${u.id}, 'office', now() + interval '1 day', 'leave') as id`);
    await q(director, sql`select public.revoke_acting_access(${id})`);
    expect(await canView(u, "dashboard")).toBe(false);
  });

  it("deactivate: no access immediately, banned from sign-in, row kept; reactivate restores", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    await q(director, sql`select public.set_user_active(${u.id}, false)`);
    const [row] = await adminDb.select().from(users).where(eq(users.id, u.id));
    expect(row.status).toBe("deactivated");
    expect(await canView(u, "assets")).toBe(false);
    const [ban] = (await adminDb.execute(sql`select banned_until from auth.users where id = ${u.id}`)) as unknown as { banned_until: string }[];
    expect(ban.banned_until).not.toBeNull();
    await q(director, sql`select public.set_user_active(${u.id}, true)`);
    const [again] = await adminDb.select().from(users).where(eq(users.id, u.id));
    expect(again.status).toBe("active");
  });

  it("users can never be deleted through the API role", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    await expectDbError(q(director, sql`delete from public.users where id = ${u.id}`), /permission denied/);
  });
});
