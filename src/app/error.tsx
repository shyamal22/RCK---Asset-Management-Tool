"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

/**
 * Backstop for errors above the screens (e.g. while checking who's signed in). Keeps the app look and
 * gives a way forward; an installed iPhone app has no reload button of its own.
 */
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="app-theme grid min-h-dvh place-items-center px-6 text-center text-white">
      <div className="grid gap-4">
        <h1 className="text-3xl font-bold">That didn&apos;t load</h1>
        <button
          type="button"
          className="press h-14 rounded-full bg-white px-8 text-lg font-bold text-[var(--onyx)]"
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          Try again
        </button>
        <Link href="/" className="py-2 text-base font-semibold text-white/80">
          Home
        </Link>
      </div>
    </main>
  );
}
