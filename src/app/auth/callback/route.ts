import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { adminDb } from "@db/client";
import { companies, users } from "@db/schema";
import { supabaseServer } from "@/lib/supabase/server";

/** OAuth (Microsoft/Google) return. New people become PENDING in the company whose link they used. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await supabaseServer();
  if (!code) return NextResponse.redirect(new URL("/sign-in", url.origin));
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/sign-in", url.origin));

  const [existing] = await adminDb.select({ id: users.id }).from(users).where(eq(users.id, data.user.id));
  if (!existing) {
    const signupCode = request.cookies.get("signup_code")?.value;
    const [company] = signupCode
      ? await adminDb
          .select({ id: companies.id })
          .from(companies)
          .where(sql`${companies.signupCode} = ${signupCode} and ${companies.signupEnabled} and ${companies.deletedAt} is null`)
      : [];
    if (!company) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/sign-in?state=no-account", url.origin));
    }
    const meta = data.user.user_metadata as { full_name?: string; name?: string };
    await adminDb.insert(users).values({
      id: data.user.id,
      companyId: company.id,
      name: meta.full_name ?? meta.name ?? data.user.email ?? "New user",
      email: data.user.email,
      status: "pending",
    });
    await adminDb.execute(sql`insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
      values (${company.id}, ${data.user.id}, 'sign_up', 'user', ${data.user.id}, ${JSON.stringify({ via: data.user.app_metadata.provider })}::jsonb)`);
  } else {
    await adminDb.execute(sql`insert into public.audit_log (company_id, actor_user_id, action, entity, entity_id, after)
      select company_id, id, 'sign_in', 'user', id::text, ${JSON.stringify({ via: data.user.app_metadata.provider })}::jsonb
      from public.users where id = ${data.user.id}`);
  }
  const res = NextResponse.redirect(new URL("/", url.origin));
  res.cookies.delete("signup_code");
  return res;
}
