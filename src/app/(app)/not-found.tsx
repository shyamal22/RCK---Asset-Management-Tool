import Link from "next/link";
import { Button } from "@/components/ui/button";

/** A machine, report or person that doesn't exist (or was archived): stay in the app. */
export default function AppNotFound() {
  return (
    <div className="mx-auto grid max-w-md gap-4 py-10 text-center">
      <h1 className="text-title2 font-bold">Not found</h1>
      <Button asChild size="xl">
        <Link href="/">Home</Link>
      </Button>
    </div>
  );
}
