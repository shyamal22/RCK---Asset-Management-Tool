import { AppShell } from "@/components/shell/app-shell";
import { requireActive } from "@/lib/auth/session";
import { sharedDevice } from "@/lib/auth/device";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireActive();
  const shared = !!(await sharedDevice());
  return (
    <AppShell me={me} shared={shared}>
      {children}
    </AppShell>
  );
}
