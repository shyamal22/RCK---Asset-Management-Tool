"use client";
import { Field } from "@/components/field";
import { Segmented } from "@/components/segmented";

export type ContactValue = { method: "email" | "mobile"; email: string; mobile: string };

export const smsEnabled = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";

export function toContact(v: ContactValue) {
  return v.method === "email" ? { method: "email" as const, email: v.email } : { method: "mobile" as const, mobile: v.mobile };
}

export function ContactInput({
  value,
  onChange,
  error,
}: {
  value: ContactValue;
  onChange: (v: ContactValue) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-3">
      {smsEnabled ? (
        <Segmented
          label="Sign in with"
          value={value.method}
          onChange={(method) => onChange({ ...value, method })}
          options={[
            { value: "email", label: "Email" },
            { value: "mobile", label: "Mobile" },
          ]}
        />
      ) : null}
      {value.method === "email" ? (
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          error={error}
        />
      ) : (
        <Field
          id="mobile"
          label="Mobile"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="Mobile (021 123 4567)"
          value={value.mobile}
          onChange={(e) => onChange({ ...value, mobile: e.target.value })}
          error={error}
        />
      )}
    </div>
  );
}
