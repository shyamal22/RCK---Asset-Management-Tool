import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { assets, assetTypes, crews } from "@db/schema";
import { expectDbError, makeCompany, makeUser } from "./helpers";

type U = { id: string; sessionId: string | null };
const run = <T>(u: U, q: ReturnType<typeof sql>) => asUser(u, (tx) => tx.execute(q)).then((r) => r as unknown as T[]);

let co: Awaited<ReturnType<typeof makeCompany>>;
let rollerType: string;
let roller: string; // Green crew
let truck: string; // Yellow crew
const p = {} as Record<"director" | "workshop" | "office" | "crewGreen" | "crewGreen2" | "crewYellow" | "supGreen", U>;
const photo = () => `${co.company.id}/prechecks/x/${crypto.randomUUID()}.jpg`;

const ITEMS = [
  { question: "Tyres and tracks", answer_type: "condition" },
  { question: "Any hydraulic leaks?", answer_type: "yes_no", problem_answer: "yes", photo_required: false },
  { question: "Hours on the clock match?", answer_type: "text", photo_required: false, help: "Write the hours you see" },
];

const saveTemplate = (u: U, items: unknown, opts: { type?: string; asset?: string } = { type: rollerType }) =>
  run<{ id: string }>(u, sql`select public.save_precheck_template(${opts.type ?? null}::uuid, ${opts.asset ?? null}::uuid, ${JSON.stringify(items)}::jsonb) as id`).then((r) => r[0].id);

const itemsOf = (template: string) =>
  adminDb.execute(sql`select id, position from public.precheck_template_items where template_id = ${template} order by position`) as unknown as Promise<{ id: string }[]>;

const submit = (u: U, id: string, asset: string, answers: unknown, reading = 1200) =>
  run<{ id: string }>(u, sql`select public.submit_precheck(${id}::uuid, ${asset}::uuid, ${reading}, ${JSON.stringify(answers)}::jsonb) as id`).then((r) => r[0].id);

beforeAll(async () => {
  co = await makeCompany();
  const c = co.company.id;
  const [yellow] = await adminDb.insert(crews).values({ companyId: c, name: "Yellow" }).returning();
  const [t] = await adminDb.select().from(assetTypes).where(and(eq(assetTypes.companyId, c), eq(assetTypes.name, "Roller")));
  rollerType = t.id;
  [{ id: roller }] = await adminDb.insert(assets).values({ companyId: c, code: "ROL-01", name: "Roller", assetTypeId: t.id, make: "Hamm", model: "HD12", year: 2019, trackingUnit: "hours", crewId: co.crew.id, currentReading: 1000 }).returning();
  [{ id: truck }] = await adminDb.insert(assets).values({ companyId: c, code: "ROL-02", name: "Roller 2", assetTypeId: t.id, make: "Hamm", model: "HD12", year: 2019, trackingUnit: "hours", crewId: yellow.id }).returning();
  p.director = await makeUser({ companyId: c, userType: "director" });
  p.workshop = await makeUser({ companyId: c, userType: "workshop" });
  p.office = await makeUser({ companyId: c, userType: "office" });
  p.crewGreen = await makeUser({ companyId: c, userType: "crew", crewId: co.crew.id });
  p.crewGreen2 = await makeUser({ companyId: c, userType: "crew", crewId: co.crew.id });
  p.crewYellow = await makeUser({ companyId: c, userType: "crew", crewId: yellow.id });
  p.supGreen = await makeUser({ companyId: c, userType: "supervisor", crewId: co.crew.id });
});

describe("pre-check templates", () => {
  it("Workshop and Director build them; Crew and Office can't", async () => {
    await expectDbError(saveTemplate(p.crewGreen, ITEMS), /Not permitted/);
    await expectDbError(saveTemplate(p.office, ITEMS), /Not permitted/);
    await expectDbError(saveTemplate(p.workshop, [{ question: "Leaks?", answer_type: "yes_no" }]), /which answer is the problem/);
    await expectDbError(saveTemplate(p.workshop, []), /at least one/);
    const v1 = await saveTemplate(p.workshop, ITEMS);
    expect((await itemsOf(v1)).length).toBe(3);
  });

  it("saving makes a new version; the machine uses the current one; everyone in the company can read it", async () => {
    const v2 = await saveTemplate(p.director, ITEMS.slice(0, 2));
    const rows = (await adminDb.execute(sql`select id, version, is_current from public.precheck_templates where asset_type_id = ${rollerType} order by version`)) as unknown as { id: string; version: number; is_current: boolean }[];
    expect(rows.map((r) => [r.version, r.is_current])).toEqual([[1, false], [2, true]]);
    const [{ t }] = await run<{ t: string }>(p.crewGreen, sql`select public.precheck_template_for(${roller}::uuid) as t`);
    expect(t).toBe(v2);
    expect((await run(p.crewGreen, sql`select id from public.precheck_template_items where template_id = ${v2}`)).length).toBe(2);
  });
});

describe("doing a pre-check", () => {
  it("Crew check their crew's machines only; every check must be answered, photos where required", async () => {
    const t = (await run<{ t: string }>(p.crewGreen, sql`select public.precheck_template_for(${roller}::uuid) as t`))[0].t;
    const [tyres, leaks] = await itemsOf(t);
    await expectDbError(submit(p.crewYellow, crypto.randomUUID(), roller, []), /Not permitted/);
    await expectDbError(submit(p.crewGreen, crypto.randomUUID(), roller, [{ item: tyres.id, answer: "fine", photo: photo() }]), /Answer every check/);
    await expectDbError(submit(p.crewGreen, crypto.randomUUID(), roller, [{ item: tyres.id, answer: "fine" }, { item: leaks.id, answer: "no" }]), /Add a photo/);
    await expectDbError(submit(p.crewGreen, crypto.randomUUID(), roller, [{ item: tyres.id, answer: "great", photo: photo() }, { item: leaks.id, answer: "no" }]), /Answer: Tyres/);
  });

  it("flags: usable → yellow, broken or the problem answer → red; overall = worst; reading, last check and machine flag updated", async () => {
    const t = (await run<{ t: string }>(p.crewGreen, sql`select public.precheck_template_for(${roller}::uuid) as t`))[0].t;
    const [tyres, leaks] = await itemsOf(t);
    const id = crypto.randomUUID();
    await submit(p.crewGreen, id, roller, [{ item: tyres.id, answer: "usable", photo: photo() }, { item: leaks.id, answer: "yes", note: "drip under left ram" }], 1250);
    const [pc] = (await adminDb.execute(sql`select flag from public.prechecks where id = ${id}`)) as unknown as { flag: string }[];
    expect(pc.flag).toBe("red");
    const answers = (await adminDb.execute(sql`select flag, note from public.precheck_answers where precheck_id = ${id} order by position`)) as unknown as { flag: string; note: string | null }[];
    expect(answers.map((a) => a.flag)).toEqual(["yellow", "red"]);
    const [a] = await adminDb.select().from(assets).where(eq(assets.id, roller));
    expect(a.currentReading).toBe(1250);
    expect(a.lastPrecheckBy).toBe(p.crewGreen.id);
    const [flag] = await run<{ flag: string; open_reports: number }>(p.crewGreen, sql`select * from public.asset_flags(array[${roller}]::uuid[])`);
    expect(flag).toMatchObject({ flag: "red", open_reports: 2 });
    // A resend (dropped reply / offline queue) returns the same check, nothing doubled.
    expect(await submit(p.crewGreen, id, roller, [])).toBe(id);
    const [{ n }] = (await adminDb.execute(sql`select count(*)::int as n from public.precheck_answers where precheck_id = ${id}`)) as unknown as { n: number }[];
    expect(n).toBe(2);
  });

  it("who sees which: Crew own, Supervisor their crew, Office/Workshop/Director all", async () => {
    const ids = async (u: U) => (await run<{ id: string }>(u, sql`select id from public.prechecks`)).map((r) => r.id);
    const mine = await ids(p.crewGreen);
    expect(mine.length).toBeGreaterThan(0);
    expect(await ids(p.crewGreen2)).toEqual([]);
    expect(await ids(p.supGreen)).toEqual(mine);
    for (const u of [p.office, p.workshop, p.director]) expect(await ids(u)).toEqual(expect.arrayContaining(mine));
  });

  it("Workshop dismisses a flagged item with a reason; Crew can't; the machine flag clears when nothing's open", async () => {
    const open = (await adminDb.execute(sql`select id from public.precheck_answers where asset_id = ${roller} and flag <> 'green' and status = 'open'`)) as unknown as { id: string }[];
    await expectDbError(run(p.crewGreen, sql`select public.dismiss_precheck_item(${open[0].id}::uuid, 'fine')`), /Not permitted/);
    await expectDbError(run(p.workshop, sql`select public.dismiss_precheck_item(${open[0].id}::uuid, ' ')`), /Give a reason/);
    for (const o of open) await run(p.workshop, sql`select public.dismiss_precheck_item(${o.id}::uuid, 'Already booked in')`);
    expect(await run(p.crewGreen, sql`select * from public.asset_flags(array[${roller}]::uuid[])`)).toEqual([]);
  });
});
