import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { SIDE_COOKIE } from "@/lib/nav/side";
import { requireActive } from "@/lib/auth/session";
import { sharedDevice } from "@/lib/auth/device";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireActive();
  const shared = !!(await sharedDevice());
  const sideCollapsed = (await cookies()).get(SIDE_COOKIE)?.value === "collapsed";
  return (
    <AppShell me={me} shared={shared} sideCollapsed={sideCollapsed}>
      {children}
    </AppShell>
  );
}
