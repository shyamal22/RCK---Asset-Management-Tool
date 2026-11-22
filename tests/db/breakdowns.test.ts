import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { assets, assetTypes, crews } from "@db/schema";
import { and } from "drizzle-orm";
import { expectDbError, makeCompany, makeUser } from "./helpers";

type U = { id: string; sessionId: string | null };
const run = <T>(u: U, q: ReturnType<typeof sql>) => asUser(u, (tx) => tx.execute(q)).then((r) => r as unknown as T[]);

let co: Awaited<ReturnType<typeof makeCompany>>;
let yellow: string;
let roller: string; // Green crew machine
let truck: string; // Yellow crew machine
const p = {} as Record<"director" | "office" | "workshop" | "supGreen" | "supYellow" | "green1" | "green2" | "yellow1", U>;
const photo = () => [`${co.company.id}/assets/x/${crypto.randomUUID()}.jpg`];

/** Postgres array literal for a text[] parameter. */
const pgArray = (xs: string[]) => `{${xs.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(",")}}`;

const raise = (u: U, asset: string, severity: "usable" | "unusable", opts: { photos?: string[]; title?: string; reading?: number } = {}) =>
  run<{ id: string }>(
    u,
    sql`select public.raise_breakdown(${asset}, ${opts.title ?? "Hydraulic leak"}, 'Dripping from the left ram',
        ${severity}, ${pgArray(opts.photos ?? photo())}::text[], ${opts.reading ?? null}) as id`,
  ).then((r) => r[0].id);

beforeAll(async () => {
  co = await makeCompany();
  const c = co.company.id;
  [{ id: yellow }] = await adminDb.insert(crews).values({ companyId: c, name: "Yellow" }).returning();
  const [t] = await adminDb.select().from(assetTypes).where(and(eq(assetTypes.companyId, c), eq(assetTypes.name, "Roller")));
  [{ id: roller }] = await adminDb.insert(assets).values({ companyId: c, code: "ROL-01", name: "Roller", assetTypeId: t.id, make: "Hamm", model: "HD12", year: 2019, trackingUnit: "hours", crewId: co.crew.id, currentReading: 100 }).returning();
  [{ id: truck }] = await adminDb.insert(assets).values({ companyId: c, code: "TRK-01", name: "Truck", assetTypeId: t.id, make: "Isuzu", model: "FVZ", year: 2020, trackingUnit: "km", crewId: yellow }).returning();
  p.director = await makeUser({ companyId: c, userType: "director" });
  p.office = await makeUser({ companyId: c, userType: "office" });
  p.workshop = await makeUser({ companyId: c, userType: "workshop" });
  p.supGreen = await makeUser({ companyId: c, userType: "supervisor", crewId: co.crew.id });
  p.supYellow = await makeUser({ companyId: c, userType: "supervisor", crewId: yellow });
  p.green1 = await makeUser({ companyId: c, userType: "crew", crewId: co.crew.id });
  p.green2 = await makeUser({ companyId: c, userType: "crew", crewId: co.crew.id });
  p.yellow1 = await makeUser({ companyId: c, userType: "crew", crewId: yellow });
});

describe("raising a damage report", () => {
  it("needs a title, details and at least one photo of our own company", async () => {
    await expectDbError(raise(p.green1, roller, "usable", { photos: [] }), /at least one photo/);
    await expectDbError(raise(p.green1, roller, "usable", { title: " " }), /few words/);
    await expectDbError(raise(p.green1, roller, "usable", { photos: ["someone-else/x.jpg"] }), /Bad photo/);
    await expectDbError(
      run(p.director, sql`insert into public.breakdown_reports (company_id, asset_id, raised_by, title, details, severity, photo_paths) values (${co.company.id}, ${roller}, ${p.director.id}, 't', 'd', 'usable', '{x}')`),
      /permission denied/,
    );
  });

  it("Unusable makes the machine Unusable and records the reading; it's audited", async () => {
    const id = await raise(p.green1, roller, "unusable", { reading: 120 });
    const [a] = await adminDb.select().from(assets).where(eq(assets.id, roller));
    expect(a).toMatchObject({ status: "unusable", currentReading: 120 });
    const audit = (await adminDb.execute(sql`select action from public.audit_log where entity = 'breakdown_reports' and entity_id = ${id}`)) as unknown as unknown[];
    expect(audit.length).toBe(1);
    const flags = await run<{ flag: string; open_reports: number }>(p.green2, sql`select * from public.asset_flags(array[${roller}]::uuid[])`);
    expect(flags[0]).toMatchObject({ flag: "red", open_reports: 1 });
  });
});

describe("who sees which reports", () => {
  it("Crew: own; Supervisor: their crew's; Office/Workshop/Director: all", async () => {
    const g = await raise(p.green2, roller, "usable");
    const y = await raise(p.yellow1, truck, "usable");
    const ids = async (u: U) => (await run<{ id: string }>(u, sql`select id from public.breakdown_reports`)).map((r) => r.id);
    expect(await ids(p.green2)).toContain(g);
    expect(await ids(p.green1)).not.toContain(g); // same crew, but Crew see only their own
    expect(await ids(p.supGreen)).toEqual(expect.arrayContaining([g]));
    expect(await ids(p.supGreen)).not.toContain(y);
    expect(await ids(p.supYellow)).toContain(y);
    for (const u of [p.office, p.workshop, p.director]) expect(await ids(u)).toEqual(expect.arrayContaining([g, y]));
    const outsider = await makeUser({ companyId: (await makeCompany()).company.id, userType: "director" });
    expect(await ids(outsider)).toEqual([]);
    expect(await run(outsider, sql`select * from public.asset_flags(array[${roller}]::uuid[])`)).toEqual([]);
  });
});

describe("closing reports", () => {
  it("Workshop/Director close with a note; Crew/Office/Supervisor can't", async () => {
    const id = await raise(p.green1, roller, "usable");
    for (const u of [p.green1, p.office, p.supGreen]) {
      await expectDbError(run(u, sql`select public.close_breakdown(${id}, 'fixed', 'done')`), /Not permitted/);
    }
    await expectDbError(run(p.workshop, sql`select public.close_breakdown(${id}, 'fixed', ' ')`), /what was done/);
    await expectDbError(run(p.workshop, sql`select public.close_breakdown(${id}, 'dismissed', '')`), /reason/);
    await run(p.workshop, sql`select public.close_breakdown(${id}, 'dismissed', 'Not a fault: condensation')`);
    await expectDbError(run(p.director, sql`select public.close_breakdown(${id}, 'fixed', 'again')`), /already closed/);
  });

  it("the machine goes back to Available only when its last Unusable report closes", async () => {
    const [t] = await adminDb.select().from(assetTypes).where(and(eq(assetTypes.companyId, co.company.id), eq(assetTypes.name, "Paver")));
    const [{ id: paver }] = await adminDb.insert(assets).values({ companyId: co.company.id, code: "PAV-01", name: "Paver", assetTypeId: t.id, make: "V", model: "S", year: 2018, trackingUnit: "hours", crewId: co.crew.id }).returning();
    const a = await raise(p.green1, paver, "unusable");
    const b = await raise(p.green2, paver, "unusable");
    await run(p.workshop, sql`select public.close_breakdown(${a}, 'fixed', 'Replaced hose')`);
    expect((await adminDb.select().from(assets).where(eq(assets.id, paver)))[0].status).toBe("unusable");
    await run(p.director, sql`select public.close_breakdown(${b}, 'fixed', 'Replaced pump')`);
    expect((await adminDb.select().from(assets).where(eq(assets.id, paver)))[0].status).toBe("available");
    expect(await run(p.green1, sql`select * from public.asset_flags(array[${paver}]::uuid[])`)).toEqual([]);
  });
});
