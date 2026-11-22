export type ClientRow = {
  id: string;
  name: string;
  setup_completed_at: string | null;
  suspended_at: string | null;
  active_users: number;
  pending_users: number;
  invite_email: string | null;
  invite_accepted: boolean | null;
  support_ends_at: string | null;
};

/** One status per client, most important first. Colour only for status (docs/10). */
export function clientStatus(c: Pick<ClientRow, "suspended_at" | "invite_accepted" | "setup_completed_at">) {
  if (c.suspended_at) return { label: "On hold", tone: "red" as const };
  if (!c.invite_accepted) return { label: "Director invited", tone: "yellow" as const };
  if (!c.setup_completed_at) return { label: "Setting up", tone: "yellow" as const };
  return { label: "Active", tone: "green" as const };
}
