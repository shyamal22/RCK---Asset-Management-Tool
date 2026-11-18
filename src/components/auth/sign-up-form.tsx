"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/field";
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
  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { name: "", password: "" } });

  if (sent) return <CodeEntry contact={sent} purpose="signup" onVerified={() => router.replace("/waiting")} />;

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        const c = contactSchema.safeParse(toContact(contact));
        if (!c.success) return setContactError(c.error.issues[0]?.message);
        setContactError(undefined);
        start(async () => {
          const r = await signUpAction({ code, name: values.name, contact: c.data, password: values.password });
          if (r.ok) setSent(c.data);
          else setError(r.error);
        });
      })}
    >
      <Field id="name" label="Your name" autoComplete="name" {...form.register("name")} error={form.formState.errors.name?.message} />
      <ContactInput value={contact} onChange={setContact} error={contactError} />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        {...form.register("password")}
        error={form.formState.errors.password?.message}
      />
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-14 text-lg" disabled={pending}>
        Create account
      </Button>
    </form>
  );
}
