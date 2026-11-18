"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";

const input = z.object({ enabled: z.boolean(), regenerate: z.boolean().default(false) });

export async function setSignupLinkAction(raw: unknown) {
  const { enabled, regenerate } = input.parse(raw);
  await actAs("settings", "edit", (tx) =>
    tx.execute(sql`select public.set_signup_link(${enabled}, ${regenerate})`),
  );
  revalidatePath("/setup/signup-link");
}
