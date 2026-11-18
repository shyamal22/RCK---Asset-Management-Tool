import { z } from "zod";

const email = z.email("Enter a valid email").transform((s) => s.trim().toLowerCase());
/** NZ mobile, normalised to E.164 (+64…). Accepts 021 123 4567, +64 21 123 4567. */
export const nzMobile = z
  .string()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .transform((s) => (s.startsWith("0") ? `+64${s.slice(1)}` : s))
  .pipe(z.string().regex(/^\+64(2\d{7,9})$/, "Enter an NZ mobile number"));

export const contactSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("email"), email }),
  z.object({ method: z.literal("mobile"), mobile: nzMobile }),
]);

export const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

export const signUpSchema = z.object({
  code: z.string().min(6).max(64),
  name: z.string().trim().min(2, "Enter your name").max(80),
  contact: contactSchema,
  password: passwordSchema,
});
export type SignUpInput = z.input<typeof signUpSchema>;

export const verifySchema = z.object({
  contact: contactSchema,
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  purpose: z.enum(["signup", "recovery"]),
});

export const signInSchema = z.object({
  contact: contactSchema,
  password: z.string().min(1, "Enter your password"),
});
