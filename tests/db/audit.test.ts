import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { auditLog } from "@db/schema";
import { makeCompany, makeUser } from "./helpers";

let co: Awaited<ReturnType<typeof makeCompany>>;
let director: Awaited<ReturnType<typeof makeUser>>;
let workshop: Awaited<ReturnType<typeof makeUser>>;

const rows = (entityId: string) =>
  adminDb.select().from(auditLog).where(sql`entity_id = ${entityId}`).orderBy(auditLog.id);

beforeAll(async () => {
  co = await makeCompany();
  director = await makeUser({ companyId: co.company.id, userType: "director" });
  workshop = await makeUser({ companyId: co.company.id, userType: "workshop" });
});

describe("audit trigger", () => {
  it("records who/what/when with before and after; soft delete shows as delete", async () => {
    const [site] = (await asUser({ ...director, device: "iPhone test" }, (tx) =>
      tx.execute(sql`insert into public.sites (company_id, name) values (${co.company.id}, 'Westgate') returning id`),
    )) as unknown as { id: string }[];
    await asUser(director, (tx) => tx.execute(sql`update public.sites set name = 'Westgate Yard' where id = ${site.id}`));
    await asUser(director, (tx) => tx.execute(sql`update public.sites set deleted_at = now() where id = ${site.id}`));
    const r = await rows(site.id);
    expect(r.map((x) => x.action)).toEqual(["insert", "update", "delete"]);
    expect(r[0].actorUserId).toBe(director.id);
    expect(r[0].device).toBe("iPhone test");
    expect((r[1].before as { name: string }).name).toBe("Westgate");
    expect((r[1].after as { name: string }).name).toBe("Westgate Yard");
  });

  it("never stores the sign-up code", async () => {
    const r = await adminDb.select().from(auditLog).where(sql`entity = 'companies' and entity_id = ${co.company.id}`);
    expect(r.length).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toContain(co.company.signupCode);
  });

  it("exports are logged", async () => {
    await asUser(director, (tx) => tx.execute(sql`select public.log_export('audit_log', '{"rows": 12}'::jsonb)`));
    const [r] = await adminDb.select().from(auditLog).where(sql`action = 'export' and actor_user_id = ${director.id}`);
    expect(r.entity).toBe("audit_log");
  });

  it("Director reads the company audit log; Workshop sees only their own entries", async () => {
    const d = (await asUser(director, (tx) => tx.select().from(auditLog))) as unknown[];
    expect(d.length).toBeGreaterThan(2);
    await asUser(workshop, (tx) => tx.execute(sql`select public.log_export('test', '{}'::jsonb)`));
    const w = await asUser(workshop, (tx) => tx.select().from(auditLog));
    expect(w.length).toBeGreaterThan(0);
    expect(w.every((x) => x.actorUserId === workshop.id)).toBe(true);
  });
});
