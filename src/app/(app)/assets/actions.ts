"use server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { actAs } from "@/lib/auth/guard";
import { readingInput } from "@/lib/assets/schema";

type Result = { ok: true; lower: boolean } | { ok: false; error: string };

export async function recordReadingAction(raw: unknown): Promise<Result> {
  const p = z.object({ assetId: z.uuid(), reading: readingInput, note: z.string().trim().max(200).optional() }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the reading" };
  if (p.data.reading === undefined) return { ok: false, error: "Enter a reading" };
  try {
    const [r] = (await actAs("assets", "edit", (tx) =>
      tx.execute(sql`select * from public.record_meter_reading(${p.data.assetId}, ${p.data.reading}, ${p.data.note ?? null})`),
    )) as unknown as { lower_than_previous: boolean }[];
    revalidatePath(`/assets/${p.data.assetId}`);
    return { ok: true, lower: r.lower_than_previous };
  } catch {
    return { ok: false, error: "Couldn't save the reading. Refresh and try again." };
  }
}
