/** Setup pages each check their own permission (requirePermission); the Setup menu itself is Director-only. */
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
