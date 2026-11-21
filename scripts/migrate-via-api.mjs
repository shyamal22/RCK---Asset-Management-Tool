// Applies db/migrations to a hosted Supabase project over HTTPS (Management API), for
// environments that can't open a raw Postgres connection (e.g. Claude cloud sessions).
// Records each migration in drizzle.__drizzle_migrations exactly as `pnpm db:migrate` does,
// so the two can be used interchangeably.
// Usage: SUPABASE_PROJECT_REF=<ref> SUPABASE_ACCESS_TOKEN=<sbp_...> node scripts/migrate-via-api.mjs
// (In a Claude session the proxy injects the token; use NODE_USE_ENV_PROXY=1 and any token value.)
import fs from "node:fs";
import crypto from "node:crypto";

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) throw new Error("Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN");
const dir = new URL("../db/migrations/", import.meta.url);

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 800)}`);
  return JSON.parse(text);
}

await query(
  "CREATE SCHEMA IF NOT EXISTS drizzle; CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);",
);
const [last] = await query(
  "select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1",
);
const journal = JSON.parse(fs.readFileSync(new URL("meta/_journal.json", dir), "utf8"));

for (const entry of journal.entries) {
  if (last && Number(last.created_at) >= entry.when) continue;
  const sql = fs.readFileSync(new URL(`${entry.tag}.sql`, dir), "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  const body = sql.split("--> statement-breakpoint").join("\n");
  // One transaction per migration: the file and its tracking row land together or not at all.
  await query(
    `BEGIN;\n${body}\n;\ninsert into drizzle.__drizzle_migrations ("hash","created_at") values ('${hash}', ${entry.when});\nCOMMIT;`,
  );
  console.log(`applied ${entry.tag}`);
}
console.log("Migrations up to date");
