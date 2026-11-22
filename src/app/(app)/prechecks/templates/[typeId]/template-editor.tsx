"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { SwitchRow } from "@/components/switch-row";
import { StatusNote } from "@/components/feedback/status-note";
import { safeAction } from "@/lib/safe-action";
import type { AnswerType } from "@/lib/prechecks/labels";
import type { DraftItem } from "@/lib/prechecks/starter";
import { saveTemplateAction } from "../../actions";

const TYPES: { value: AnswerType; label: string }[] = [
  { value: "condition", label: "Condition" },
  { value: "yes_no", label: "Yes / No" },
  { value: "text", label: "Write in" },
];

/** Build the checks for a machine type. Saving makes a new version; finished pre-checks keep theirs. */
export function TemplateEditor({ typeId, initial }: { typeId: string; initial: DraftItem[] }) {
  const [items, setItems] = useState<(DraftItem & { key: string })[]>(() => initial.map((i) => ({ ...i, key: crypto.randomUUID() })));
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const update = (k: string, patch: Partial<DraftItem>) => setItems((xs) => xs.map((x) => (x.key === k ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const next = [...xs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="grid gap-4">
      <ol className="grid gap-3" aria-label="Checks">
        {items.map((it, i) => (
          <li key={it.key} className="surface grid gap-3 p-4" aria-label={`Check ${i + 1}`}>
            <div className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--indigo)] text-footnote font-bold text-white">{i + 1}</span>
              <input
                aria-label={`Question ${i + 1}`}
                value={it.question}
                onChange={(e) => update(it.key, { question: e.target.value })}
                placeholder="Question"
                className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-body"
              />
            </div>
            <Segmented
              label={`Answer type ${i + 1}`}
              value={it.answer_type}
              onChange={(v) => update(it.key, { answer_type: v, problem_answer: v === "yes_no" ? (it.problem_answer ?? "yes") : null })}
              options={TYPES}
            />
            {it.answer_type === "yes_no" ? (
              <Segmented
                label={`Problem if ${i + 1}`}
                value={it.problem_answer ?? "yes"}
                onChange={(v) => update(it.key, { problem_answer: v })}
                options={[
                  { value: "yes", label: "Problem if Yes" },
                  { value: "no", label: "Problem if No" },
                ]}
              />
            ) : null}
            <SwitchRow label="Photo needed" checked={it.photo_required} onCheckedChange={(v) => update(it.key, { photo_required: v })} />
            <input
              aria-label={`Help note ${i + 1}`}
              value={it.help}
              onChange={(e) => update(it.key, { help: e.target.value })}
              placeholder="Help note (optional)"
              className="h-11 rounded-xl border border-input bg-background px-3 text-footnote"
            />
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" aria-label={`Move check ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Move check ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Remove check ${i + 1}`} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setItems((xs) => [...xs, { key: crypto.randomUUID(), question: "", answer_type: "condition", problem_answer: null, photo_required: true, help: "" }])}
      >
        <Plus aria-hidden /> Add check
      </Button>
      <FormError message={error} />
      <Button
        size="xl"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            setMsg(null);
            const r = await safeAction(
              saveTemplateAction({
                typeId,
                items: items.map(({ question, answer_type, problem_answer, photo_required, help }) => ({
                  question,
                  answer_type,
                  problem_answer: answer_type === "yes_no" ? problem_answer : null,
                  photo_required,
                  help: help.trim() || undefined,
                })),
              }),
            );
            if (!r.ok) setError(r.error);
            else setMsg("Saved");
          })
        }
      >
        Save
      </Button>
      <StatusNote message={msg} />
    </div>
  );
}
