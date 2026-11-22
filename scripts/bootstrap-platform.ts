/**
 * One-off, idempotent: creates the platform company (KRE Consulting) and its first KRE admin on a
 * hosted Supabase project, over HTTPS only (Management API for SQL, Auth admin API for the login).
 * The admin gets no password: they use "Forgot password" on the sign-in page to set one by code.
 *
 *   SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *   ADMIN_EMAIL=... ADMIN_NAME=... pnpm exec tsx scripts/bootstrap-platform.ts
 */
import { createClient } from "@supabase/supabase-js";
import { permissionRows } from "../src/lib/permissions/check";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Set ${k}`);
  return v;
};
const ref = need("SUPABASE_PROJECT_REF");
const token = need("SUPABASE_ACCESS_TOKEN");
const email = need("ADMIN_EMAIL").trim().toLowerCase();
const name = need("ADMIN_NAME").trim();
const lit = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);

async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text) as T[];
}

async function main() {
  // 1. Platform company + its permission rows (same rows as every company, from the central map).
  let [kre] = await query<{ id: string }>("select id from public.companies where is_platform");
  if (!kre) {
    [kre] = await query<{ id: string }>(
      "insert into public.companies (name, is_platform, setup_completed_at) values ('KRE Consulting', true, now()) returning id",
    );
    console.log(`created platform company ${kre.id}`);
  }
  const values = permissionRows()
    .map((r) => `(${lit(kre.id)}, ${lit(r.userType)}, ${lit(r.area)}, ${lit(r.action)}, ${lit(r.scope)}, ${r.requiredFlag ? `${lit(r.requiredFlag)}::public.user_flag` : "null"})`)
    .join(",\n");
  await query(`begin;
    delete from public.user_type_permissions where company_id = ${lit(kre.id)};
    insert into public.user_type_permissions (company_id, user_type, area, action, scope, required_flag) values ${values};
    commit;`);

  // 2. Login for the admin (confirmed email, no password yet).
  let [authUser] = await query<{ id: string }>(`select id from auth.users where lower(email) = ${lit(email)}`);
  if (!authUser) {
    const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name } });
    if (error) throw error;
    authUser = { id: data.user.id };
    console.log(`created login for ${email}`);
  }

  // 3. Profile (active Director of KRE Consulting) + platform admin flag, audited.
  await query(`begin;
    insert into public.users (id, company_id, name, email, status, user_type, approved_at)
      values (${lit(authUser.id)}, ${lit(kre.id)}, ${lit(name)}, ${lit(email)}, 'active', 'director', now())
      on conflict (id) do nothing;
    insert into public.platform_admins (company_id, user_id)
      select ${lit(kre.id)}, ${lit(authUser.id)}
      where not exists (select 1 from public.platform_admins where user_id = ${lit(authUser.id)} and revoked_at is null);
    insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
      select ${lit(kre.id)}, null, 'grant_platform_admin', 'user', ${lit(authUser.id)}, jsonb_build_object('email', ${lit(email)})
      where not exists (select 1 from public.audit_log where entity_id = ${lit(authUser.id)} and action = 'grant_platform_admin');
    commit;`);
  const [check] = await query<{ ok: boolean }>(
    `select exists (select 1 from public.platform_admins pa join public.users u on u.id = pa.user_id
       where u.email = ${lit(email)} and pa.revoked_at is null and u.status = 'active') as ok`,
  );
  console.log(check.ok ? `${email} is a KRE admin of KRE Consulting` : "FAILED to grant KRE admin");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
