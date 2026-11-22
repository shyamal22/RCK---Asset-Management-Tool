"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Something went wrong on a screen: stay inside the app (tabs still there), offer Try again and Home. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto grid max-w-md gap-4 py-10 text-center">
      <h1 className="text-title2 font-bold">That didn&apos;t load</h1>
      <Button
        size="xl"
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        <RotateCw aria-hidden /> Try again
      </Button>
      <Button asChild variant="ghost" size="lg">
        <Link href="/">Home</Link>
      </Button>
    </div>
  );
}
