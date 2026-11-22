"use client";
import { useEffect, useState, type ComponentProps } from "react";
import { Eye, EyeOff, WandSparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { passwordStrength, suggestPassword } from "@/lib/auth/password-strength";
import { useMachineState } from "./machine-state";

const BAR = ["bg-[var(--tangerine)]", "bg-[var(--tangerine)]", "bg-[color-mix(in_srgb,var(--indigo)_55%,white)]", "bg-[var(--indigo)]", "bg-[var(--indigo)]"];

/**
 * Password box: show/hide (the cab operator looks away), optional live strength + hint for new
 * passwords, and an optional "Suggest one" that fills in a memorable passphrase.
 * The toggle's name is text content (not aria-label) so the "Password" label stays unique.
 */
export function PasswordField({
  label,
  error,
  id,
  className,
  meter,
  onSuggest,
  onChange,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string; id: string; meter?: boolean; onSuggest?: (pw: string) => void }) {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState(typeof props.value === "string" ? props.value : "");
  const { setReveal } = useMachineState();
  useEffect(() => setReveal(show), [show, setReveal]);
  useEffect(() => () => setReveal(false), [setReveal]);
  useEffect(() => {
    if (typeof props.value === "string") setCurrent(props.value);
  }, [props.value]);
  const s = meter ? passwordStrength(current) : null;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-callout">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          data-pulse
          aria-invalid={!!error || (s ? !!current && !s.ok : false)}
          aria-describedby={meter ? `${id}-strength` : undefined}
          className={cn("h-12 pr-14 text-body", show && "pw-revealed", className)}
          onChange={(e) => {
            setCurrent(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          className="absolute inset-y-0 right-1 my-auto flex size-12 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        >
          {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          <span className="sr-only">{show ? "Hide" : "Show"} characters</span>
        </button>
      </div>
      {s ? (
        <div id={`${id}-strength`} className="pw-meter grid gap-1.5" aria-live="polite">
          <div className="grid grid-cols-4 gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1.5 rounded-full bg-[var(--muted)] transition-colors", current && i <= Math.max(1, s.score) && BAR[s.score])} />
            ))}
          </div>
          {current ? (
            <p className="flex justify-between gap-3 text-footnote">
              <span className={s.ok ? "text-muted-foreground" : "text-destructive"}>{s.hint ?? ""}</span>
              {s.ok ? <span className={cn("font-bold", s.score >= 3 && "text-[var(--indigo)]")}>{s.label}</span> : null}
            </p>
          ) : null}
        </div>
      ) : null}
      {onSuggest ? (
        <button
          type="button"
          className="pw-suggest flex w-fit items-center gap-2 rounded-full px-1 py-2 text-callout text-[var(--indigo)] hover:underline"
          onClick={() => {
            const pw = suggestPassword();
            setCurrent(pw);
            setShow(true);
            onSuggest(pw);
          }}
        >
          <WandSparkles className="size-4" aria-hidden />
          Suggest one
        </button>
      ) : null}
      {error ? <p className="text-footnote text-destructive">{error}</p> : null}
    </div>
  );
}
