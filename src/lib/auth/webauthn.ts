import "server-only";
import { headers } from "next/headers";

/** Origin/RP ID the browser actually used (it signs the real origin into the response). */
export async function rp() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return { origin: `${proto}://${host}`, rpID: host.split(":")[0], rpName: "Workshop" };
}
