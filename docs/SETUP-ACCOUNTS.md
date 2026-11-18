# Account setup — where we are (18/11/2026)

## Status
- Specs read; gaps and defaults recorded in `docs/PROGRESS.md` ("Questions for Sam").
- Milestone 0 NOT started.
- Nothing pushed to GitHub yet — no repo exists. This zip is the only copy.

## To do next (Sam), in order
1. **GitHub** — create an empty private repo (e.g. `rck-maintenance`, no README),
   then connect it at https://claude.ai/connect-github and give the Claude GitHub App access.
   Start the next Claude session with that repo selected, upload this zip, and ask Claude
   to commit it and carry on.
2. **Supabase** — sign up at supabase.com. Make a personal access token at
   supabase.com/dashboard/account/tokens. Claude will create the project (Sydney region),
   fetch keys and configure auth. Give the token through Claude's secure form, never in chat.
3. **Resend** — sign up at resend.com, create an API key with Full access. Claude adds the
   sending domain and gives you the DNS records to add.
4. **DNS** — add the records Claude gives you at your domain host.
5. **Environment variables** — Claude gives you a ready-to-paste block; add it under the
   cloud environment menu (session title bar) → Edit → Environment variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, `DATABASE_URL` (Session pooler string).
6. **Later / optional** — Microsoft (Entra ID app registration) and Google OAuth sign-in.
   Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`. On Supabase Free these
   screens show `xxxx.supabase.co`; hiding that needs Supabase Pro + custom domain.

## Claude can start meanwhile
Milestone 0 can begin on a local Postgres without waiting for Supabase. Say "start Milestone 0".
