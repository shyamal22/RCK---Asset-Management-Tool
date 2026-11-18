"use server";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { actAs } from "@/lib/auth/guard";

export async function finishSetupAction() {
  await actAs("settings", "edit", (tx) =>
    tx.execute(sql`update public.companies set setup_completed_at = now() where id = app.current_company_id()`),
  );
  redirect("/");
}
