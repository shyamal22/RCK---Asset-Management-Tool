"use client";
import { useRef, useState, useTransition } from "react";
import { ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/field";
import { uploadLogoAction } from "./actions";

/** Logo for report headers. Shown as it will appear: on white, left-aligned, max 64px tall. */
export function LogoUpload({ url }: { url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="surface grid gap-3 p-4" aria-labelledby="logo-h">
      <h2 id="logo-h" className="text-lg font-bold">
        Logo
      </h2>
      <div className="flex min-h-20 items-center rounded-xl border border-dashed border-input bg-white px-4 py-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL
          <img src={url} alt="Company logo" className="max-h-16 w-auto max-w-full object-contain" />
        ) : (
          <span className="text-muted-foreground">No logo yet. It goes on report headers and PDFs.</span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Logo file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          start(async () => {
            setError(null);
            setMsg(null);
            const fd = new FormData();
            fd.set("logo", f);
            const r = await uploadLogoAction(fd);
            if (!r.ok) return setError(r.error);
            setMsg("Logo saved");
            router.refresh();
          });
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="lg" className="h-12 w-fit" disabled={pending} onClick={() => input.current?.click()}>
        <ImageUp aria-hidden />
        {pending ? "Uploading…" : url ? "Change logo" : "Upload logo"}
      </Button>
      <p className="text-sm text-muted-foreground">PNG with a transparent background works best. Up to 2 MB.</p>
      <FormError message={error} />
      {msg ? <p role="status">{msg}</p> : null}
    </section>
  );
}
