import { expect } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { adminDb } from "@db/client";
import { companies, crews, userFlags, users, verifiedSessions } from "@db/schema";
import { syncCompanyPermissions } from "@db/permissions";
import type { UserFlag, UserType } from "@/lib/permissions/types";

export async function makeCompany(name = `Test Co ${randomUUID().slice(0, 8)}`) {
  const [company] = await adminDb.insert(companies).values({ name }).returning();
  await syncCompanyPermissions(adminDb, company.id);
  const [crew] = await adminDb.insert(crews).values({ companyId: company.id, name: "Green" }).returning();
  return { company, crew };
}

export async function makeAuthUser(email = `${randomUUID()}@test.local`) {
  const id = randomUUID();
  await adminDb.execute(sql`
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email},
            '{}'::jsonb, '{}'::jsonb, now(), now())`);
  return { id, email };
}

export async function makeUser(opts: {
  companyId: string;
  userType?: UserType | null;
  status?: "pending" | "active" | "rejected" | "deactivated";
  crewId?: string | null;
  flags?: UserFlag[];
  name?: string;
}) {
  const auth = await makeAuthUser();
  const [user] = await adminDb
    .insert(users)
    .values({
      id: auth.id,
      companyId: opts.companyId,
      name: opts.name ?? "Test User",
      email: auth.email,
      status: opts.status ?? "active",
      userType: opts.userType === undefined ? "crew" : opts.userType,
      crewId: opts.crewId ?? null,
    })
    .returning();
  // Every test user gets a verified session (as after a completed sign-in + second step).
  const sessionId = randomUUID();
  await adminDb.insert(verifiedSessions).values({ sessionId, companyId: opts.companyId, userId: user.id });
  for (const flag of opts.flags ?? []) {
    await adminDb.insert(userFlags).values({ companyId: opts.companyId, userId: user.id, flag });
  }
  return { ...user, sessionId };
}

/** Drizzle wraps Postgres errors; match against the underlying message. */
export async function expectDbError(p: Promise<unknown>, re: RegExp) {
  try {
    await p;
  } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    expect(`${err.message} ${err.cause?.message ?? ""}`).toMatch(re);
    return;
  }
  throw new Error(`Expected query to fail with ${re}`);
}
