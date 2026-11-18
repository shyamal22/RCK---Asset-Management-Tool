# Progress

## Log
- 18/11/2026 — Starter pack committed. Specs read end to end; gaps and contradictions recorded below with the default chosen for each. Milestone 0 not started.
- 18/11/2026 — Account setup steps written to docs/SETUP-ACCOUNTS.md. Waiting on GitHub repo, Supabase token and Resend key. Next: start Milestone 0.
- 19/11/2026 — M0 scaffold: Next.js 15 (App Router, strict TS), Tailwind 4 + shadcn/ui, Carlito font, Vitest, Playwright (phone + desktop projects). Scripts: dev, build, typecheck, lint, test, e2e, db:*. Local Postgres 16 used for dev/test until Supabase keys arrive.
- 19/11/2026 — M0 Supabase wiring: local Supabase stack via CLI (Docker) for dev/test; env validated with Zod; browser/server/admin Supabase clients; Drizzle client with asUser() that runs queries as the 'authenticated' role with JWT claims so RLS always applies; db:migrate script.
- 19/11/2026 — M0 tables: companies, sites, crews, owner_entities, users, user_type_permissions, user_flags, temp_access, audit_log. RLS on all; pending users see only their own profile; PIN hash column not readable via API; audit_log append-only (trigger + revokes). DB tests prove cross-company isolation.
- 19/11/2026 — M0 permission map: src/lib/permissions/map.ts is the single source (17 areas × 5 user types, scopes all/crew/own, Workshop lead flag). Tests compare every cell against an independent transcription of docs/05 (176 tests). Areas added beyond docs/05: precheck_templates (Workshop + Director per docs/07).
- 19/11/2026 — M0 RLS from the map: app.allows(area, action, company, crew, owner) + policy generator (pnpm db:policy) for every domain table; my_permissions() RPC for the UI. API tests (real Supabase sign-in) prove Crew can't read workshop docs, costs, audit log or PIN hashes, can't self-promote, and nobody can hard-delete. Stand-in tables used until docs/costs tables land in M1/M3.
- 19/11/2026 — M0 sign-up: /join/<code> (name, email or mobile, password); new auth users become PENDING via DB trigger. Setup → Sign-up link shows URL + QR, turn off/on, regenerate (old link dies). Microsoft/Google buttons hidden until NEXT_PUBLIC_SSO_* set; OAuth callback creates pending user from the link cookie. Mobile sign-up hidden until NEXT_PUBLIC_SMS_ENABLED.

## Questions for Sam
Each has a default that will be used unless you say otherwise.

### Spec contradictions (default: the more detailed, later doc wins)
1. **Roles** — 03 lists 8 roles (operator, crew leader, mechanic…); 05 has 5 user types + Workshop lead flag. *Default: 05.*
2. **Work order statuses** — 02 (Draft · Scheduled · In progress · Waiting parts · At subcontractor · Complete · Signed off · Costed) vs 08 (Open → Assigned → Awaiting approval → In progress / At subcontractor → On hold(reason) → Completed → Signed off). *Default: 08; "Waiting parts" is On hold with reason; "Costed" is a flag on the WO, not a status. Workshop job board columns map onto these.*
3. **Asset statuses** — 02 has Available · In use · Out of service · In workshop · At subcontractor · Disposed; 07 adds Unusable; PLAN adds Parked. *Default: Available, In use, Unusable, In workshop, At subcontractor, Parked, Disposed (Out of service = Unusable).*
4. **Defects vs flags** — 01/03 have a "Defect" record with critical items that lock the asset out; 07 replaces this with flags (Fine/Usable/Broken) and no auto work orders. *Default: 07 — `flags` table, no lockout, no auto WOs.*
5. **Service trigger** — 02 says create WO at 90% of interval; 06 says a user-set "warn before due" amount. *Default: 06.*
6. **Calendar intervals** — 01/02/03 mention hours/km/calendar; 06 says hours OR km only. *Default: hours/km only now; calendar backstop ("250 hr or 6 months") parked until answered.*
7. **Internal cost at close-out** — 08 says one box; 02/03 say labour hours × rate + parts, and Milestone 3 already records labour sessions. *Default: one box, pre-filled with logged labour × rate; split into labour + parts lines once stock lands in Milestone 4.*
8. **Labour rate** — company "labour rates" (03 Company) vs user "hourly cost rate" (03 User). *Default: company internal rate, optional per-user override.*
9. **Asset types vs categories** — 03 "category", 06 "type". *Default: `asset_types`.*
10. **Required asset fields** — 06 requires six; 03 lists owner entity, rego, VIN, site, crew etc.; 01 needs cost by owner entity. *Default: six required; owner entity optional, defaults to RCK; rest optional.*

### Decisions needed before / during Milestone 0
11. **Email + SMS provider** — "6-digit codes, never Supabase-branded" needs our own email sender and SMS sender, but 04 puts SMS in phase 2. *Default: email codes via Resend (custom templates) now; SMS via Twilio wired but switched off until you have an account.*
12. **Microsoft / Google sign-in** — needs an Entra ID app registration and a Google OAuth client. *Default: build the buttons behind a setting, off until credentials exist.*
13. **Shared tablet PIN switch + passkeys** — Supabase doesn't do PIN user-switching natively; needs our own device-trust layer. *Default: per-device trusted session + personal PIN, built on top of Supabase sessions.*
14. **Drizzle + RLS** — Drizzle connects as a role that bypasses RLS. *Default: every app query runs in a transaction that sets the `authenticated` role and the user's JWT claims, so RLS always applies; tests prove it.*
15. **Hosting region** — Supabase ap-southeast-2 (Sydney); Vercel functions pinned to `syd1`.

### Open questions already in the specs (defaults)
16. Assets needing both units (truck + crane/PTO on hours)? *Default: one unit per asset for now.*
17. Supervisors build/edit pre-check templates? *Default: no.*
18. Pre-check frequency — per day, shift or operator? *Default: one per asset per day counts as "done".*
19. Unusable asset blocks pre-checks? *Default: no, but the pre-check screen shows the red flag.*
20. Director approval limit? *Default: $2,000 ex GST, editable in Setup.*
21. Who signs off subcontractor jobs? *Default: Workshop lead or Director.*
22. Weekly missed pre-check report — Monday 7:00 am NZ? *Default: yes.*
23. Supervisors get the missed report for their crew? *Default: yes, own crew only.*
