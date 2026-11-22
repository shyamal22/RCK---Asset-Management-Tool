/**
 * Seed RCK Group for local dev / demos. Idempotent: safe to run again.
 *   pnpm db:seed
 * Refuses to run against a non-local database unless SEED_ALLOW_REMOTE=1 (and then sets no
 * passwords: people use "Forgot password" to set their own).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { adminDb, closeDb } from "./client";
import { companies, platformAdmins, sites, userFlags, users } from "./schema";
import { syncCompanyPermissions } from "./permissions";
import type { UserType } from "../src/lib/permissions/types";

const LOCAL = /127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "");
const REMOTE_OK = process.env.SEED_ALLOW_REMOTE === "1";
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Workshop-Dev-2026";

export const SEED_USERS: { name: string; email: string; type: UserType; crew?: "Green" | "Yellow"; lead?: boolean }[] = [
  { name: "Sam Director", email: "director@rck.test", type: "director" },
  { name: "Olivia Office", email: "office@rck.test", type: "office" },
  { name: "Wayne Workshop", email: "workshop@rck.test", type: "workshop", lead: true },
  { name: "Steve Supervisor", email: "supervisor@rck.test", type: "supervisor", crew: "Green" },
  { name: "Mere Crew", email: "crew@rck.test", type: "crew", crew: "Green" },
];

/** KRE Consulting: the platform company. Its KRE admin manages client companies at /kre. */
export const SEED_KRE_ADMIN = { name: "Kiri KRE Admin", email: "admin@kre.test" };

async function findOrCreate<T extends { id: string }>(find: () => Promise<T[]>, create: () => Promise<T[]>) {
  const [hit] = await find();
  return hit ?? (await create())[0];
}

async function main() {
  if (!LOCAL && !REMOTE_OK) throw new Error("Not a local database. Set SEED_ALLOW_REMOTE=1 if you really mean it.");

  const company = await findOrCreate(
    () => adminDb.select().from(companies).where(eq(companies.name, "RCK Group")),
    () => adminDb.insert(companies).values({ name: "RCK Group", setupCompletedAt: new Date(), approvalLimitCents: 200000 }).returning(),
  );
  const companyId = company.id;
  await syncCompanyPermissions(adminDb, companyId);

  /** Find a live row by name in a reference table, or create it. Table names are fixed here. */
  const named = async (table: "sites" | "crews" | "owner_entities", name: string) => {
    const t = sql.raw(`public.${table}`);
    const found = (await adminDb.execute(
      sql`select id from ${t} where company_id = ${companyId} and name = ${name} and deleted_at is null limit 1`,
    )) as unknown as { id: string }[];
    if (found[0]) return found[0];
    return ((await adminDb.execute(
      sql`insert into ${t} (company_id, name) values (${companyId}, ${name}) returning id`,
    )) as unknown as { id: string }[])[0];
  };

  for (const y of ["Helensville", "Westgate"]) await named("sites", y);
  for (const o of ["Jacks Bobcats Ltd", "RCK Group"]) await named("owner_entities", o);
  const crewIds = { Green: (await named("crews", "Green")).id, Yellow: (await named("crews", "Yellow")).id };
  const [helensville] = await adminDb.select().from(sites).where(and(eq(sites.companyId, companyId), eq(sites.name, "Helensville")));

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  for (const u of SEED_USERS) {
    const found = (await adminDb.execute(sql`select id from auth.users where email = ${u.email}`)) as unknown as { id: string }[];
    let id = found[0]?.id;
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        email_confirm: true,
        ...(LOCAL ? { password: SEED_PASSWORD } : {}),
      });
      if (error) throw error;
      id = data.user.id;
    }
    await adminDb
      .insert(users)
      .values({
        id,
        companyId,
        name: u.name,
        email: u.email,
        status: "active",
        userType: u.type,
        crewId: u.crew ? crewIds[u.crew] : null,
        siteId: helensville.id,
        approvedAt: new Date(),
      })
      .onConflictDoNothing();
    if (u.lead) {
      const [flag] = await adminDb
        .select()
        .from(userFlags)
        .where(and(eq(userFlags.userId, id), eq(userFlags.flag, "workshop_lead"), isNull(userFlags.revokedAt)));
      if (!flag) await adminDb.insert(userFlags).values({ companyId, userId: id, flag: "workshop_lead" });
    }
  }

  // Platform company + one KRE admin (a Director of KRE Consulting with the platform admin flag).
  const kre = await findOrCreate(
    () => adminDb.select().from(companies).where(eq(companies.isPlatform, true)),
    () => adminDb.insert(companies).values({ name: "KRE Consulting", isPlatform: true, setupCompletedAt: new Date() }).returning(),
  );
  await syncCompanyPermissions(adminDb, kre.id);
  const foundKre = (await adminDb.execute(sql`select id from auth.users where email = ${SEED_KRE_ADMIN.email}`)) as unknown as { id: string }[];
  let kreId = foundKre[0]?.id;
  if (!kreId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SEED_KRE_ADMIN.email,
      email_confirm: true,
      ...(LOCAL ? { password: SEED_PASSWORD } : {}),
    });
    if (error) throw error;
    kreId = data.user.id;
  }
  await adminDb
    .insert(users)
    .values({ id: kreId, companyId: kre.id, name: SEED_KRE_ADMIN.name, email: SEED_KRE_ADMIN.email, status: "active", userType: "director", approvedAt: new Date() })
    .onConflictDoNothing();
  const [pa] = await adminDb.select().from(platformAdmins).where(and(eq(platformAdmins.userId, kreId), isNull(platformAdmins.revokedAt)));
  if (!pa) await adminDb.insert(platformAdmins).values({ companyId: kre.id, userId: kreId });

  console.log(`Seeded RCK Group (${companyId}) and KRE Consulting (${kre.id}); KRE admin: ${SEED_KRE_ADMIN.email}`);
  console.table(SEED_USERS.map((u) => ({ name: u.name, email: u.email, type: u.type, crew: u.crew ?? "", lead: u.lead ? "yes" : "" })));
  if (LOCAL) console.log(`Password for all: ${SEED_PASSWORD}  ·  Director/Office codes: http://127.0.0.1:54324`);
  await closeDb();
}

main().catch(async (e) => {
  console.error(e);
  await closeDb();
  process.exit(1);
});
