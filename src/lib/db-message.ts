/** Turns a Postgres error from our functions/constraints into a message safe to show people. */
export function dbMessage(e: unknown, fallback = "Something went wrong. Try again."): string {
  const err = e as { message?: string; cause?: { message?: string; constraint_name?: string; detail?: string } };
  const msg = err.cause?.message ?? err.message ?? "";
  const constraint = err.cause?.constraint_name ?? "";
  if (constraint === "assets_company_code") {
    const code = /\(company_id, code\)=\([^,]+, ([^)]+)\)/.exec(err.cause?.detail ?? "")?.[1];
    return code ? `Code ${code} is already used` : "That code is already used";
  }
  if (constraint === "asset_types_company_name") return "That type already exists";
  if (/^[A-Z][^\n]{2,80}$/.test(msg) && !/^Failed query|violates|syntax|column|relation|permission denied/i.test(msg)) return msg;
  return fallback;
}
