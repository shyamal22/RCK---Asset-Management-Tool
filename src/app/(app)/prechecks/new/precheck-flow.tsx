"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { shrinkPhoto } from "@/lib/assets/shrink";
import { locate } from "@/lib/geo/locate";
import { safeAction } from "@/lib/safe-action";
import { CONDITION_OPTIONS, answerLabel, flagFor, worst, type PrecheckFlag } from "@/lib/prechecks/labels";
import type { TemplateItem } from "@/lib/prechecks/queries";
import { submitPrecheckAction } from "../actions";

type Answer = { value: string; note: string; photo?: { file: File; url: string } };

const TONE: Record<PrecheckFlag, string> = {
  green: "border-status-green bg-status-green text-white",
  yellow: "border-status-yellow bg-status-yellow text-[var(--onyx)]",
  red: "border-status-red bg-status-red text-white",
};

/**
 * One task per screen (CLAUDE.md rule 7): reading → each check → review → send.
 * Big status-coloured answers for gloves; photo where the template asks; a note only when something's wrong.
 */
export function PrecheckFlow({ asset, items }: { asset: { id: string; code: string; unit: "hours" | "km"; reading: number | null }; items: TemplateItem[] }) {
  const router = useRouter();
  const [checkId] = useState(() => crypto.randomUUID()); // a resend can't record it twice
  const [startedAt] = useState(() => new Date().toISOString());
  const [step, setStep] = useState(0); // 0 reading, 1..n items, n+1 review
  const [reading, setReading] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const n = items.length;
  const item = step >= 1 && step <= n ? items[step - 1] : null;
  const a = item ? answers[item.id] : undefined;
  const flag = item && a?.value ? flagFor(item.answer_type, a.value, item.problem_answer) : null;
  const unit = asset.unit === "km" ? "km" : "hours";

  useEffect(() => () => Object.values(answers).forEach((x) => x.photo && URL.revokeObjectURL(x.photo.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (id: string, patch: Partial<Answer>) =>
    setAnswers((s) => {
      const prev: Answer = s[id] ?? { value: "", note: "" };
      return { ...s, [id]: { ...prev, ...patch } };
    });
  const readingOk = reading.replace(/[,\s]/g, "") !== "" && Number.isFinite(Number(reading.replace(/[,\s]/g, "")));
  const itemOk = !!item && !!a?.value.trim() && (!item.photo_required || !!a.photo);
  const canNext = step === 0 ? readingOk : itemOk;
  const go = (d: number) => {
    setError(null);
    setStep((s) => Math.max(0, Math.min(n + 1, s + d)));
    window.scrollTo({ top: 0 });
  };
  const overall = useMemo(() => worst(items.map((i) => (answers[i.id]?.value ? flagFor(i.answer_type, answers[i.id].value, i.problem_answer) : "green"))), [answers, items]);

  const send = () =>
    start(async () => {
      setError(null);
      const where = await locate();
      const fd = new FormData();
      fd.set(
        "data",
        JSON.stringify({
          id: checkId,
          assetId: asset.id,
          reading,
          answers: items.map((i) => ({ item: i.id, answer: answers[i.id]?.value ?? "", note: answers[i.id]?.note || undefined })),
          doneAt: startedAt,
          ...(where ?? {}),
        }),
      );
      for (const i of items) if (answers[i.id]?.photo) fd.append(`photo:${i.id}`, answers[i.id].photo!.file);
      const r = await safeAction(submitPrecheckAction(fd), { offline: "No signal. Tap Send again when you have signal. It won't be sent twice." });
      if (!r.ok) return setError(r.error);
      router.replace(`/prechecks/${r.id}?sent=1`);
    });

  return (
    <div className="grid gap-5">
      {/* Progress: one segment per screen */}
      <div className="flex items-center gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => go(-1)} aria-label="Previous" className="press -ml-2 flex size-11 shrink-0 items-center justify-center rounded-full">
            <ChevronLeft className="size-6" aria-hidden />
          </button>
        ) : null}
        <ol className="flex flex-1 gap-1" aria-label={`Step ${step + 1} of ${n + 2}`}>
          {Array.from({ length: n + 2 }, (_, i) => (
            <li key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-[var(--indigo)]" : "bg-[var(--input)]")} />
          ))}
        </ol>
      </div>

      <div key={step} className="step-in grid gap-5">
        {step === 0 ? (
          <>
            <h2 className="text-title1">{unit === "km" ? "Kilometres" : "Hours"} on the clock</h2>
            <input
              id="reading"
              aria-label={unit === "km" ? "Current kilometres" : "Current hours"}
              inputMode="decimal"
              autoComplete="off"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder={asset.reading != null ? asset.reading.toLocaleString("en-NZ") : "0"}
              className="h-16 w-full rounded-2xl border border-input bg-card px-5 text-3xl font-bold tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--tangerine)]/50"
              autoFocus
            />
          </>
        ) : item ? (
          <>
            <div className="grid gap-1">
              <h2 className="text-title1">{item.question}</h2>
              {item.help ? <p className="text-footnote text-muted-foreground">{item.help}</p> : null}
            </div>

            {item.answer_type === "condition" ? (
              <div role="radiogroup" aria-label={item.question} className="grid gap-3">
                {CONDITION_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={a?.value === o.value}
                    onClick={() => set(item.id, { value: o.value })}
                    className={cn(
                      "flex h-16 items-center justify-between rounded-2xl border-2 px-5 text-xl font-bold",
                      a?.value === o.value ? TONE[o.tone] : "border-input bg-card",
                    )}
                  >
                    {o.label}
                    {a?.value === o.value ? <Check className="size-6" aria-hidden /> : null}
                  </button>
                ))}
              </div>
            ) : item.answer_type === "yes_no" ? (
              <div role="radiogroup" aria-label={item.question} className="grid grid-cols-2 gap-3">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={a?.value === v}
                    onClick={() => set(item.id, { value: v })}
                    className={cn(
                      "h-16 rounded-2xl border-2 text-xl font-bold",
                      a?.value === v ? TONE[v === item.problem_answer ? "red" : "green"] : "border-input bg-card",
                    )}
                  >
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            ) : (
              <Textarea aria-label={item.question} value={a?.value ?? ""} onChange={(e) => set(item.id, { value: e.target.value })} className="min-h-28 rounded-2xl bg-card text-lg" />
            )}

            {item.photo_required || flag === "red" || flag === "yellow" ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  aria-label="Photo"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const file = await shrinkPhoto(f);
                    if (a?.photo) URL.revokeObjectURL(a.photo.url);
                    set(item.id, { photo: { file, url: URL.createObjectURL(file) } });
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className={cn(
                    "press relative flex h-28 items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 text-lg font-bold",
                    a?.photo ? "border-transparent" : "border-dashed border-input bg-card",
                  )}
                >
                  {a?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview
                    <img src={a.photo.url} alt="Photo taken" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <>
                      <Camera className="size-6" aria-hidden />
                      {item.photo_required ? "Take photo" : "Add photo"}
                    </>
                  )}
                </button>
              </>
            ) : null}

            {flag === "red" || flag === "yellow" ? (
              <Textarea aria-label="What's wrong?" placeholder="What's wrong?" value={a?.note ?? ""} onChange={(e) => set(item.id, { note: e.target.value })} className="min-h-20 rounded-2xl bg-card text-lg" />
            ) : null}
          </>
        ) : (
          <>
            <h2 className="text-title1">Ready to send</h2>
            <ul className="surface divide-y divide-border overflow-hidden" aria-label="Answers">
              {[...items]
                .sort((x, y) => rank(answers[x.id], x) - rank(answers[y.id], y))
                .map((i) => {
                  const f = flagFor(i.answer_type, answers[i.id]?.value ?? "", i.problem_answer);
                  return (
                    <li key={i.id} className="flex min-h-13 items-center gap-3 px-4 py-2.5">
                      <span className={cn("size-2.5 shrink-0 rounded-full", f === "red" ? "bg-status-red" : f === "yellow" ? "bg-status-yellow" : "bg-status-green")} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{i.question}</span>
                      <span className="shrink-0 font-bold">{answerLabel(i.answer_type, answers[i.id]?.value ?? "")}</span>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </div>

      <FormError message={error} />
      {step <= n ? (
        <Button size="xl" className="w-full" disabled={!canNext} onClick={() => go(1)}>
          Next
        </Button>
      ) : (
        <Button size="xl" variant="accent" className="w-full" disabled={pending} aria-busy={pending} onClick={send}>
          {pending ? "Sending…" : overall === "green" ? "Send" : "Send with problems"}
        </Button>
      )}
    </div>
  );

  function rank(x: Answer | undefined, i: TemplateItem) {
    const f = flagFor(i.answer_type, x?.value ?? "", i.problem_answer);
    return f === "red" ? 0 : f === "yellow" ? 1 : 2;
  }
}
