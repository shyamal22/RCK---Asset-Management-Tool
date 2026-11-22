import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { assets, assetTypes } from "@db/schema";
import { makeCompany, makeUser } from "./helpers";

vi.mock("server-only", () => ({}));
const { fleetSummary } = await import("@/lib/home/queries");

let co: Awaited<ReturnType<typeof makeCompany>>;
let director: { id: string; sessionId: string | null };

beforeAll(async () => {
  co = await makeCompany();
  const c = co.company.id;
  director = await makeUser({ companyId: c, userType: "director" });
  const [t] = await adminDb.select().from(assetTypes).where(and(eq(assetTypes.companyId, c), eq(assetTypes.name, "Roller")));
  const mk = (code: string, status: "available" | "in_use" | "unusable" | "in_workshop" | "parked") =>
    adminDb.insert(assets).values({ companyId: c, code, name: code, assetTypeId: t.id, make: "Hamm", model: "HD12", year: 2019, trackingUnit: "hours", status }).returning().then((r) => r[0].id);
  await mk("ROL-01", "available");
  await mk("ROL-02", "in_use");
  const dented = await mk("ROL-03", "in_use"); // open report, still usable
  const broken = await mk("ROL-04", "unusable"); // red report
  await mk("ROL-05", "unusable"); // marked unusable by hand, no report
  await mk("ROL-06", "in_workshop");
  await mk("ROL-07", "parked");
  const report = (asset: string, severity: "usable" | "unusable") =>
    adminDb.execute(sql`insert into public.breakdown_reports (company_id, asset_id, raised_by, title, details, severity, photo_paths)
      values (${c}, ${asset}, ${director.id}, 'x', 'x', ${severity}, ${`{${c}/x.jpg}`})`);
  await report(dented, "usable");
  await report(broken, "unusable");
});

describe("home headline tiles", () => {
  it("All working / Damaged / Unusable never count a machine twice", async () => {
    const s = await asUser(director, (tx) => fleetSummary(tx));
    expect({ allWorking: s.allWorking, damaged: s.damaged, unusable: s.unusableAny }).toEqual({ allWorking: 2, damaged: 1, unusable: 2 });
    expect(s.allWorking + s.damaged + s.unusableAny).toBeLessThanOrEqual(s.total);
  });
});
