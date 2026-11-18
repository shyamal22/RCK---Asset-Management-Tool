import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { asUser, adminDb } from "@db/client";
import { companies, crews, sites, users, auditLog } from "@db/schema";
import { expectDbError, makeCompany, makeUser } from "./helpers";

let a: Awaited<ReturnType<typeof makeCompany>>;
let b: Awaited<ReturnType<typeof makeCompany>>;
let directorA: Awaited<ReturnType<typeof makeUser>>;
let pendingA: Awaited<ReturnType<typeof makeUser>>;

beforeAll(async () => {
  a = await makeCompany();
  b = await makeCompany();
  directorA = await makeUser({ companyId: a.company.id, userType: "director" });
  pendingA = await makeUser({ companyId: a.company.id, userType: null, status: "pending" });
  await makeUser({ companyId: b.company.id, userType: "director" });
  await adminDb.insert(sites).values([
    { companyId: a.company.id, name: "Helensville" },
    { companyId: b.company.id, name: "Other Yard" },
  ]);
});

describe("tenant isolation (RLS)", () => {
  it("an active user only sees their own company", async () => {
    const rows = await asUser(directorA, (tx) => tx.select({ id: companies.id }).from(companies));
    expect(rows.map((r) => r.id)).toEqual([a.company.id]);
  });

  it("cannot read another company's sites, crews or users", async () => {
    await asUser(directorA, async (tx) => {
      const s = await tx.select().from(sites);
      expect(s.every((r) => r.companyId === a.company.id)).toBe(true);
      expect(s.length).toBeGreaterThan(0);
      const c = await tx.select().from(crews);
      expect(c.every((r) => r.companyId === a.company.id)).toBe(true);
      const u = await tx.select({ id: users.id, companyId: users.companyId }).from(users);
      expect(u.every((r) => r.companyId === a.company.id)).toBe(true);
    });
  });

  it("a PENDING user sees only their own profile row and nothing else", async () => {
    await asUser(pendingA, async (tx) => {
      expect(await tx.select({ id: companies.id }).from(companies)).toEqual([]);
      expect(await tx.select().from(sites)).toEqual([]);
      expect(await tx.select().from(crews)).toEqual([]);
      const u = await tx.select({ id: users.id }).from(users);
      expect(u).toEqual([{ id: pendingA.id }]);
    });
  });

  it("cannot read the PIN hash column through the user role", async () => {
    await expectDbError(
      asUser(directorA, (tx) => tx.execute(sql`select pin_hash from public.users`)),
      /permission denied/,
    );
  });

  it("the sign-up code is not readable directly", async () => {
    await expectDbError(
      asUser(directorA, (tx) => tx.execute(sql`select signup_code from public.companies`)),
      /permission denied/,
    );
  });

  it("anon role reads nothing", async () => {
    await expectDbError(
      adminDb.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        await tx.execute(sql`select count(*) from public.companies`);
      }),
      /permission denied/,
    );
  });
});

describe("audit log is append-only", () => {
  it("blocks update and delete even for the owner role", async () => {
    const [row] = await adminDb
      .insert(auditLog)
      .values({ companyId: a.company.id, action: "test", entity: "test" })
      .returning();
    await expectDbError(adminDb.execute(sql`update public.audit_log set action='x' where id=${row.id}`), /append-only/);
    await expectDbError(adminDb.execute(sql`delete from public.audit_log where id=${row.id}`), /append-only/);
  });
});
