"use client";
import { StatusNote } from "@/components/feedback/status-note";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/field";
import { shrinkPhoto } from "@/lib/assets/shrink";
import { uploadPhotoAction } from "./actions";

export function PhotoUpload({ assetId, hasPhoto }: { assetId: string; hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Asset photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          start(async () => {
            setError(null);
            setMsg(null);
            const fd = new FormData();
            fd.set("assetId", assetId);
            fd.set("photo", await shrinkPhoto(file));
            const r = await uploadPhotoAction(fd);
            if (!r.ok) return setError(r.error);
            setMsg("Photo saved");
            if (input.current) input.current.value = "";
          });
        }}
      />
      <Button type="button" variant="outline" size="lg" className="h-12" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "Uploading…" : hasPhoto ? "Change photo" : "Add photo"}
      </Button>
      <FormError message={error} />
      <StatusNote message={msg} />
    </div>
  );
}
