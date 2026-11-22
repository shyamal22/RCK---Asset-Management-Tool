import Link from "next/link";

/** Unknown address: same onyx → indigo look as the app, one way home. */
export default function NotFound() {
  return (
    <main className="app-theme grid min-h-dvh place-items-center px-6 text-center text-white">
      <div className="grid gap-4">
        <h1 className="text-title1 font-bold">Not found</h1>
        <Link href="/" className="press inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-body font-bold text-[var(--onyx)]">
          Home
        </Link>
      </div>
    </main>
  );
}
