"use client";
import { safeAction } from "@/lib/safe-action";
import { useMachineFeedback } from "@/components/auth/machine-state";
import { SubmitButton } from "@/components/auth/submit-button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, FormError } from "@/components/field";
import { PasswordField } from "./password-field";
import { ContactInput, toContact, type ContactValue } from "./contact-input";
import { CodeEntry } from "./code-entry";
import { signUpAction } from "@/app/(auth)/actions";
import { contactSchema, passwordSchema } from "@/lib/auth/schemas";

const formSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  password: passwordSchema,
});

export function SignUpForm({ code }: { code: string }) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactValue>({ method: "email", email: "", mobile: "" });
  const [contactError, setContactError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<ReturnType<typeof toContact> | null>(null);
  const [pending, start] = useTransition();
  useMachineFeedback(pending, error);
  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { name: "", password: "" } });

  if (sent) return <CodeEntry contact={sent} purpose="signup" onVerified={() => router.replace("/waiting")} onBack={() => setSent(null)} />;

  return (
    <form
      className="auth-rise grid gap-6"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        const c = contactSchema.safeParse(toContact(contact));
        if (!c.success) return setContactError(c.error.issues[0]?.message);
        setContactError(undefined);
        start(async () => {
          const r = await safeAction(signUpAction({ code, name: values.name, contact: c.data, password: values.password }));
          if (r.ok) setSent(c.data);
          else setError(r.error);
        });
      })}
    >
      <div className="auth-card">
      <Field id="name" label="Your name" placeholder="Your name" autoComplete="name" {...form.register("name")} error={form.formState.errors.name?.message} />
      <ContactInput value={contact} onChange={setContact} error={contactError} />
      <PasswordField
        id="password"
        label="Password"
        placeholder="Password"
        autoComplete="new-password"
        meter
        onSuggest={(pw) => form.setValue("password", pw, { shouldValidate: true })}
        {...form.register("password")}
        error={form.formState.errors.password?.message}
      />
      </div>
      <FormError message={error} />
      <SubmitButton pending={pending} disabled={false}>
        {pending ? "Creating account…" : "Create account"}
      </SubmitButton>
    </form>
  );
}
