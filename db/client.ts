import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// prepare:false keeps us compatible with Supabase's transaction pooler.
const client = postgres(url, { prepare: false, max: 10, onnotice: () => {} });

/**
 * Privileged connection (bypasses RLS). Use only for system jobs: migrations, seed,
 * sign-up processing, audit writes. Never for reads on behalf of a user.
 */
export const adminDb = drizzle(client, { schema });

export type Tx = Parameters<Parameters<typeof adminDb.transaction>[0]>[0];

export type DbUser = { id: string; device?: string; ip?: string };

/**
 * Run queries as a signed-in user. Switches to the `authenticated` role and sets the
 * same JWT claims Supabase's API would, so every RLS policy applies exactly as it does
 * for requests through the Supabase API.
 */
export function asUser<T>(user: DbUser, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return adminDb.transaction(async (tx) => {
    const claims = JSON.stringify({ sub: user.id, role: "authenticated" });
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`select set_config('app.device', ${user.device ?? ""}, true)`);
    await tx.execute(sql`select set_config('app.ip', ${user.ip ?? ""}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}

export async function closeDb() {
  await client.end();
}
