# Account setup — where we are (21/11/2026)

## Status
- GitHub: done — github.com/shyamal22/RCK---Asset-Management-Tool, CI green.
- Supabase: project created (Sydney), env vars set, personal access token saved, migrations applied (21/11/2026).
- Still to do: fix NEXT_PUBLIC_SUPABASE_URL, Resend, DNS, auth config, Vercel.

## To do next (Sam), in order
1. ~~**GitHub**~~ — done.
2. ~~**Supabase**~~ — done, except `NEXT_PUBLIC_SUPABASE_URL` is empty in the environment: set it to
   `https://fraxahglookmhracfqgd.supabase.co`. Previously: sign up at supabase.com. Make a personal access token at
   supabase.com/dashboard/account/tokens. Claude will create the project (Sydney region),
   fetch keys and configure auth. Give the token through Claude's secure form, never in chat.
3. ~~**Resend**~~ — done 22/11/2026 (kreconsulting.co.nz, sender Login Team). Previously: sign up at resend.com, create an API key with Full access. Claude adds the
   sending domain and gives you the DNS records to add.
4. ~~**DNS**~~ — done (records in Netlify DNS, not Crazy Domains). Previously: add the records Claude gives you at your domain host.
5. **Environment variables** — Claude gives you a ready-to-paste block; add it under the
   cloud environment menu (session title bar) → Edit → Environment variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, `DATABASE_URL` (Session pooler string), `NEXT_PUBLIC_APP_URL`.
   Optional switches: `NEXT_PUBLIC_SMS_ENABLED=true` (after Twilio), `NEXT_PUBLIC_SSO_MICROSOFT=true`,
   `NEXT_PUBLIC_SSO_GOOGLE=true` (after the provider is set up in Supabase).
6. **Later / optional** — Microsoft (Entra ID app registration) and Google OAuth sign-in.
   Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`. On Supabase Free these
   screens show `xxxx.supabase.co`; hiding that needs Supabase Pro + custom domain.

## Meanwhile
Building continues on the local Supabase stack; the real project is plugged in when ready.
Next build step: Milestone 1 (asset register).
