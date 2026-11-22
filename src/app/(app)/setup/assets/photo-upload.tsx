"use client";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/field";
import { uploadPhotoAction } from "./actions";

/** Shrinks a camera photo to ≤1600px JPEG on the phone before upload (yards have poor signal). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize"))), "image/jpeg", 0.82));
}

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
            let blob: Blob = file;
            try {
              blob = await shrink(file);
            } catch {
              /* unsupported format for canvas: send as-is, the server checks type/size */
            }
            const fd = new FormData();
            fd.set("assetId", assetId);
            fd.set("photo", new File([blob], "photo.jpg", { type: blob.type || file.type }));
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
      {msg ? <p role="status">{msg}</p> : null}
    </div>
  );
}
