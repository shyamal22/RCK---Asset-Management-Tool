import { requireActive } from "@/lib/auth/session";
import { USER_TYPE_LABELS } from "@/lib/permissions/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireActive();
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">{me.name}</h1>
      <p className="text-lg">{USER_TYPE_LABELS[me.userType]}</p>
    </main>
  );
}
