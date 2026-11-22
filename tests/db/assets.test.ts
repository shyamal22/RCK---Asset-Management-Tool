import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { assets, assetTypes, crews, meterReadings } from "@db/schema";
import { expectDbError, makeCompany, makeUser } from "./helpers";

type U = { id: string; sessionId: string | null };
const run = <T>(u: U, q: ReturnType<typeof sql>) => asUser(u, (tx) => tx.execute(q)).then((r) => r as unknown as T[]);

let co: Awaited<ReturnType<typeof makeCompany>>;
let yellowCrew: string;
let roller: string;
const people = {} as Record<"director" | "office" | "workshop" | "lead" | "supervisor" | "green" | "yellow", U>;

const create = (u: U, code: string, opts: { crew?: string | null; reading?: number | null; type?: string } = {}) =>
  run<{ id: string }>(
    u,
    sql`select public.create_asset(${code}, ${`Roller ${code}`}, ${opts.type ?? roller}, 'Hamm', 'HD12', 2019, 'hours',
        ${opts.reading === undefined ? 1200 : opts.reading}, null, ${opts.crew === undefined ? co.crew.id : opts.crew}) as id`,
  ).then((r) => r[0].id);

beforeAll(async () => {
  co = await makeCompany();
  [{ id: yellowCrew }] = await adminDb.insert(crews).values({ companyId: co.company.id, name: "Yellow" }).returning();
  [{ id: roller }] = await adminDb
    .select({ id: assetTypes.id })
    .from(assetTypes)
    .where(and(eq(assetTypes.companyId, co.company.id), eq(assetTypes.name, "Roller")));
  const c = co.company.id;
  people.director = await makeUser({ companyId: c, userType: "director" });
  people.office = await makeUser({ companyId: c, userType: "office" });
  people.workshop = await makeUser({ companyId: c, userType: "workshop" });
  people.lead = await makeUser({ companyId: c, userType: "workshop", flags: ["workshop_lead"] });
  people.supervisor = await makeUser({ companyId: c, userType: "supervisor", crewId: co.crew.id });
  people.green = await makeUser({ companyId: c, userType: "crew", crewId: co.crew.id });
  people.yellow = await makeUser({ companyId: c, userType: "crew", crewId: yellowCrew });
});

describe("asset types", () => {
  it("every new company starts with RCK's types and code prefixes", async () => {
    const types = await adminDb.select().from(assetTypes).where(eq(assetTypes.companyId, co.company.id));
    expect(types.map((t) => t.name)).toEqual(expect.arrayContaining(["Miller", "Paver", "Roller", "Skid steer (bobcat)", "Truck", "Trailer", "Light vehicle"]));
    expect(types.find((t) => t.name === "Truck")).toMatchObject({ defaultUnit: "km", codePrefix: "TRK" });
    expect(types.find((t) => t.name === "Roller")).toMatchObject({ defaultUnit: "hours", codePrefix: "ROL" });
  });

  it("can be added by asset editors, not by Supervisor/Crew; names are unique per company", async () => {
    await run(people.workshop, sql`insert into public.asset_types (company_id, name, code_prefix) values (${co.company.id}, 'Water cart', 'WC')`);
    await expectDbError(run(people.workshop, sql`insert into public.asset_types (company_id, name) values (${co.company.id}, 'water CART')`), /duplicate|unique/);
    await expectDbError(run(people.supervisor, sql`insert into public.asset_types (company_id, name) values (${co.company.id}, 'Nope')`), /row-level security/);
    expect((await run(people.green, sql`select id from public.asset_types`)).length).toBeGreaterThan(5);
  });
});

describe("creating assets", () => {
  it("Workshop/Office/Director create; code is stored uppercase and unique per company", async () => {
    const id = await create(people.workshop, " rol-01 ");
    const [a] = await adminDb.select().from(assets).where(eq(assets.id, id));
    expect(a).toMatchObject({ code: "ROL-01", trackingUnit: "hours", currentReading: 1200 });
    await expectDbError(create(people.office, "ROL-01"), /already used/);
    // Same code is fine in another company.
    const other = await makeCompany();
    const [t] = await adminDb.select().from(assetTypes).where(and(eq(assetTypes.companyId, other.company.id), eq(assetTypes.name, "Roller")));
    const od = await makeUser({ companyId: other.company.id, userType: "director" });
    await create(od, "ROL-01", { crew: null, type: t.id });
    // …but not with another company's type.
    await expectDbError(create(od, "ROL-02", { crew: null, type: roller }), /Unknown asset type/);
  });

  it("Supervisor and Crew can't create", async () => {
    await expectDbError(create(people.supervisor, "ROL-90"), /Not permitted/);
    await expectDbError(create(people.green, "ROL-91"), /Not permitted/);
  });

  it("required details and year are enforced by the database", async () => {
    await expectDbError(
      run(people.director, sql`select public.create_asset('X1', ' ', ${roller}, 'Hamm', 'HD12', 2019, 'hours', null)`),
      /assets_required_text/,
    );
    await expectDbError(
      run(people.director, sql`select public.create_asset('X2', 'Roller', ${roller}, 'Hamm', 'HD12', 1850, 'hours', null)`),
      /assets_year_range/,
    );
  });

  it("suggests the next code for a type", async () => {
    await create(people.director, "ROL-07");
    const [{ code }] = await run<{ code: string }>(people.office, sql`select public.next_asset_code(${roller}) as code`);
    expect(code).toBe("ROL-08");
  });

  it("is audited", async () => {
    const id = await create(people.director, "ROL-20");
    const rows = (await adminDb.execute(sql`select action from public.audit_log where entity = 'assets' and entity_id = ${id}`)) as unknown as { action: string }[];
    expect(rows.map((r) => r.action)).toContain("insert");
  });
});

describe("who sees which assets", () => {
  it("Crew sees only their crew's machines; Supervisor sees all; other companies see none", async () => {
    const green = await create(people.director, `G-${randomUUID().slice(0, 4)}`, { crew: co.crew.id });
    const yellow = await create(people.director, `Y-${randomUUID().slice(0, 4)}`, { crew: yellowCrew });
    const ids = async (u: U) => (await run<{ id: string }>(u, sql`select id from public.assets`)).map((r) => r.id);
    expect(await ids(people.green)).toContain(green);
    expect(await ids(people.green)).not.toContain(yellow);
    expect(await ids(people.yellow)).toContain(yellow);
    expect(await ids(people.supervisor)).toEqual(expect.arrayContaining([green, yellow]));
    const outsider = await makeUser({ companyId: (await makeCompany()).company.id, userType: "director" });
    expect(await ids(outsider)).toEqual([]);
  });

  it("Crew and Supervisor can't edit", async () => {
    const id = await create(people.director, `E-${randomUUID().slice(0, 4)}`);
    expect(await run(people.supervisor, sql`update public.assets set name = 'x' where id = ${id} returning id`)).toEqual([]);
    expect(await run(people.green, sql`update public.assets set name = 'x' where id = ${id} returning id`)).toEqual([]);
    expect((await run(people.office, sql`update public.assets set name = 'Big roller' where id = ${id} returning id`)).length).toBe(1);
  });
});

describe("meter readings", () => {
  it("a higher reading becomes current; a lower one is kept but flagged and not applied", async () => {
    const id = await create(people.director, `M-${randomUUID().slice(0, 4)}`, { reading: 1000 });
    const [up] = await run<{ lower_than_previous: boolean }>(people.workshop, sql`select * from public.record_meter_reading(${id}, 1010.5)`);
    expect(up.lower_than_previous).toBe(false);
    const [down] = await run<{ lower_than_previous: boolean }>(people.office, sql`select * from public.record_meter_reading(${id}, 900, 'typo?')`);
    expect(down.lower_than_previous).toBe(true);
    const [a] = await adminDb.select().from(assets).where(eq(assets.id, id));
    expect(a.currentReading).toBe(1010.5);
    const readings = await adminDb.select().from(meterReadings).where(eq(meterReadings.assetId, id));
    expect(readings.map((r) => [r.reading, r.lowerThanPrevious, r.unit, r.source])).toEqual(
      expect.arrayContaining([[1000, false, "hours", "manual"], [1010.5, false, "hours", "manual"], [900, true, "hours", "manual"]]),
    );
    expect(readings.every((r) => r.enteredBy)).toBe(true);
  });

  it("can only be written through the function, by people who can edit assets", async () => {
    const id = await create(people.director, `N-${randomUUID().slice(0, 4)}`);
    await expectDbError(run(people.green, sql`select * from public.record_meter_reading(${id}, 5000)`), /Not permitted/);
    await expectDbError(
      run(people.director, sql`insert into public.meter_readings (company_id, asset_id, reading, unit, source) values (${co.company.id}, ${id}, 1, 'hours', 'manual')`),
      /permission denied/,
    );
    await expectDbError(run(people.director, sql`update public.assets set current_reading = 1 where id = ${id}`), /permission denied/);
    // Crew can still see readings for their own crew's machines.
    expect((await run(people.green, sql`select id from public.meter_readings where asset_id = ${id}`)).length).toBe(1);
  });
});

describe("changing Hours ↔ Kilometres", () => {
  it("only Director or Workshop lead, with a reason; audited", async () => {
    const id = await create(people.director, `U-${randomUUID().slice(0, 4)}`);
    await expectDbError(run(people.director, sql`update public.assets set tracking_unit = 'km' where id = ${id}`), /permission denied/);
    await expectDbError(run(people.office, sql`select public.change_tracking_unit(${id}, 'km', 50000, 'wrong unit')`), /Not permitted/);
    await expectDbError(run(people.workshop, sql`select public.change_tracking_unit(${id}, 'km', 50000, 'wrong unit')`), /Not permitted/);
    await expectDbError(run(people.lead, sql`select public.change_tracking_unit(${id}, 'km', 50000, ' ')`), /reason/);
    await run(people.lead, sql`select public.change_tracking_unit(${id}, 'km', 50000, 'Truck, not a roller')`);
    const [a] = await adminDb.select().from(assets).where(eq(assets.id, id));
    expect(a).toMatchObject({ trackingUnit: "km", currentReading: 50000 });
    const audit = (await adminDb.execute(sql`select after from public.audit_log where action = 'change_tracking_unit' and entity_id = ${id}`)) as unknown as { after: { reason: string } }[];
    expect(audit[0].after.reason).toBe("Truck, not a roller");
  });
});

describe("archiving", () => {
  it("only a Director can archive; archived assets disappear from lists and free their code", async () => {
    const id = await create(people.director, "ARC-01");
    await expectDbError(run(people.director, sql`update public.assets set deleted_at = now() where id = ${id}`), /permission denied/);
    await expectDbError(run(people.workshop, sql`select public.archive_asset(${id}, 'sold')`), /Not permitted/);
    await expectDbError(run(people.director, sql`select public.archive_asset(${id}, '')`), /reason/);
    await run(people.director, sql`select public.archive_asset(${id}, 'Sold at auction')`);
    expect(await run(people.director, sql`select id from public.assets where id = ${id}`)).toEqual([]);
    await create(people.director, "ARC-01");
  });
});
