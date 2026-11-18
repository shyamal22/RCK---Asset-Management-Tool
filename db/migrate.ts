import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { adminDb, closeDb } from "./client";

async function main() {
  await migrate(adminDb, { migrationsFolder: "db/migrations" });
  console.log("Migrations applied");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
