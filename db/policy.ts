// Print generated RLS SQL for a table: pnpm db:policy <table> <area> [crewCol] [ownerCol] [--soft-delete]
import { policySql } from "../src/lib/permissions/policy-sql";
import { AREAS, type Area } from "../src/lib/permissions/map";

const args = process.argv.slice(2).filter((a) => a !== "--soft-delete");
const [table, area, crewColumn, ownerColumn] = args;
if (!table || !(area in AREAS)) {
  console.error(`Usage: pnpm db:policy <table> <${Object.keys(AREAS).join("|")}> [crewCol] [ownerCol] [--soft-delete]`);
  process.exit(1);
}
console.log(
  policySql({
    table,
    area: area as Area,
    crewColumn: crewColumn || undefined,
    ownerColumn: ownerColumn || undefined,
    softDelete: process.argv.includes("--soft-delete"),
  }),
);
