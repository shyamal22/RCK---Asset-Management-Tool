import { eq } from "drizzle-orm";
import { permissionRows } from "../src/lib/permissions/check";
import { userTypePermissions } from "./schema";
import type { Tx } from "./client";
import type { adminDb } from "./client";

type Db = typeof adminDb | Tx;

/** (Re)write a company's permission rows from the central map. */
export async function syncCompanyPermissions(db: Db, companyId: string) {
  await db.delete(userTypePermissions).where(eq(userTypePermissions.companyId, companyId));
  await db.insert(userTypePermissions).values(permissionRows().map((r) => ({ ...r, companyId })));
}
