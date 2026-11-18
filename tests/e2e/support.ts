import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });
export const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 2, onnotice: () => {} });

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export async function makeE2ECompany(name = `E2E Co ${Date.now()}`, opts: { setupDone?: boolean } = {}) {
  const done = opts.setupDone ?? true;
  const [c] = await sql<{ id: string; signup_code: string }[]>`
    insert into public.companies (name, setup_completed_at) values (${name}, ${done ? sql`now()` : null}) returning id, signup_code`;
  const [crew] = await sql<{ id: string }[]>`insert into public.crews (company_id, name) values (${c.id}, 'Green') returning id`;
  await syncPermissions(c.id);
  return { id: c.id, code: c.signup_code, name, crewId: crew.id };
}

/** Latest 6-digit code emailed to `to` (local Supabase sends mail to Mailpit). */
export async function latestCode(to: string, after = 0): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const msg = body.messages?.find((m) => Date.parse(m.Created) >= after);
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string; Text: string };
      const m = (full.Text || full.HTML).match(/\b(\d{6})\b/);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No code emailed to ${to}`);
}

export async function emailBody(to: string) {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const body = (await res.json()) as { messages: { ID: string }[] };
  const full = (await (await fetch(`${MAILPIT}/api/v1/message/${body.messages[0].ID}`)).json()) as { HTML: string; From: { Name: string; Address: string } };
  return full;
}


export const PASSWORD = "Paver-Roller-42";

export async function makeE2EUser(
  companyId: string,
  userType: "director" | "office" | "workshop" | "supervisor" | "crew",
  opts: { name?: string; crewId?: string; lead?: boolean } = {},
) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const email = `${userType}-${crypto.randomUUID().slice(0, 8)}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const name = opts.name ?? `${userType[0].toUpperCase()}${userType.slice(1)} Person`;
  await sql`insert into public.users (id, company_id, name, email, status, user_type, crew_id)
    values (${data.user.id}, ${companyId}, ${name}, ${email}, 'active', ${userType}, ${opts.crewId ?? null})`;
  if (opts.lead) {
    await sql`insert into public.user_flags (company_id, user_id, flag) values (${companyId}, ${data.user.id}, 'workshop_lead')`;
  }
  return { id: data.user.id, email, name };
}

export async function syncPermissions(companyId: string) {
  // Same rows the app writes from src/lib/permissions/map.ts
  const { permissionRows } = await import("../../src/lib/permissions/check");
  await sql`delete from public.user_type_permissions where company_id = ${companyId}`;
  for (const r of permissionRows()) {
    await sql`insert into public.user_type_permissions (company_id, user_type, area, action, scope, required_flag)
      values (${companyId}, ${r.userType}, ${r.area}, ${r.action}, ${r.scope}, ${r.requiredFlag})`;
  }
}

/** Signs in; completes the Director/Office new-device code step if asked. */
export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  await page.waitForLoadState("networkidle");
  if (new URL(page.url()).pathname === "/verify-device") {
    const t0 = Date.now() - 1000;
    await page.getByRole("button", { name: "Send code" }).click();
    await page.getByLabel("6-digit code").fill(await latestCode(email, t0));
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL((u) => u.pathname !== "/verify-device");
  }
}

/** Our form error box (Next adds its own empty role=alert route announcer). */
export const formError = (page: Page) => page.locator('p[role="alert"]');
