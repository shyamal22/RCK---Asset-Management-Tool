"use client";
import { useState, useTransition } from "react";
import { Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/field";
import { addItemAction, archiveItemAction, renameItemAction } from "./actions";

type Kind = "sites" | "crews" | "owner_entities";

export function ListEditor({ title, kind, items }: { title: string; kind: Kind; items: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Couldn't save");
      after?.();
    });

  return (
    <section className="grid gap-3" aria-label={title}>
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="divide-y surface">
        {items.map((i) => (
          <li key={i.id} className="flex min-h-14 items-center gap-2 px-3">
            {editing?.id === i.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => renameItemAction({ kind, id: i.id, name: editing.name }), () => setEditing(null));
                }}
              >
                <Input aria-label={`New name for ${i.name}`} className="h-11 flex-1 text-lg" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                <Button type="submit" className="h-11" disabled={pending}>
                  Save
                </Button>
              </form>
            ) : (
              <>
                <span className="flex-1 text-lg">{i.name}</span>
                <Button variant="ghost" size="icon" className="size-11" aria-label={`Rename ${i.name}`} onClick={() => setEditing(i)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`Archive ${i.name}`}
                  disabled={pending}
                  onClick={() => confirm(`Archive ${i.name}?`) && run(() => archiveItemAction({ kind, id: i.id }))}
                >
                  <Archive />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addItemAction({ kind, name }), () => setName(""));
        }}
      >
        <Input aria-label={`New ${title.toLowerCase().replace(/s$/, "")}`} className="h-12 flex-1 text-lg" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="h-12" disabled={pending || name.trim().length < 2}>
          Add
        </Button>
      </form>
      <FormError message={error} />
    </section>
  );
}
