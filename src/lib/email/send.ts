import "server-only";
import { serverEnv } from "@/lib/env";

/** Sends a branded email through Resend. Returns false (never throws) when email isn't configured or fails. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Invite for a client company's first Director: the link opens the sign-up page; no sign-in token in it. */
export function directorInviteEmail(o: { name: string; company: string; url: string }) {
  return `<!doctype html><html lang="en-NZ"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Calibri,Carlito,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:8px">
<tr><td style="padding:28px 28px 0;font-size:18px;font-weight:bold">KRE Asset Management Tool</td></tr>
<tr><td style="padding:2px 28px 8px;font-size:14px;color:#6b7280">${esc(o.company)}</td></tr>
<tr><td style="padding:8px 28px;font-size:15px">Kia ora ${esc(o.name)}, you've been set up as the Director for ${esc(o.company)}.</td></tr>
<tr><td style="padding:8px 28px;font-size:15px">Open the link below and sign up with this email address. We'll send you a 6-digit code to confirm it.</td></tr>
<tr><td style="padding:12px 28px 20px"><a href="${esc(o.url)}" style="display:inline-block;background:#2f5d8a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">Set up ${esc(o.company)}</a></td></tr>
<tr><td style="padding:0 28px 28px;font-size:13px;color:#6b7280;word-break:break-all">${esc(o.url)}</td></tr>
</table></body></html>`;
}
