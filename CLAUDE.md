# CLAUDE.md — Workshop & Maintenance Tracking App

Read this file at the start of every session. It is the project's standing brief.

## What we are building
A web app (mobile-first, works as a PWA on phones) that tracks plant and vehicle
maintenance for RCK Group (Auckland/Northland asphalt, concrete and civil contractor),
and later for other contractors as a multi-company product.

Core idea: pre-checks and breakdown reports raise yellow/red **flags** on an asset
(never work orders automatically). The workshop turns flags, and due services, into
**work orders**, and every work order ends as a **cost against one asset**
(labour + parts issued + subcontractor invoices).

Full specs live in `docs/`:
- `docs/01-summary.md` — problem, modules, users, phasing
- `docs/02-workflow.md` — how work moves through the app, statuses
- `docs/03-data-model.md` — records and fields
- `docs/04-integrations.md` — Xero, M365, telematics etc.
- `docs/05-users-and-access.md` — user types, permission matrix, logins, audit, data storage
- `docs/06-asset-setup.md` — asset fixed details, hours vs km tracking, user-defined service intervals
- `docs/07-checks-and-faults.md` — pre-check templates, pre-check flags, breakdown reports (no auto work orders)
- `docs/08-work-orders-and-costs.md` — WO path, subcontractor PO + PDF job pack, close-out, days to fix, asset history
- `docs/09-precheck-history-and-notifications.md` — week view, missed pre-check report, notifications
- `docs/10-design-direction.md` — minimal UI rules, 3-colour palette, asset card ticker
- `docs/PLAN.md` — the build checklist. Work it top to bottom.
- `docs/PROGRESS.md` — running log. Append one entry per task finished.

## Tech stack (do not change without asking)
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui; font: Carlito/Calibri-style sans; clean, flat, no gradients
- PostgreSQL via Supabase (auth, storage for photos/docs, Row Level Security)
- Drizzle ORM + SQL migrations in `db/migrations`
- Zod for validation; React Hook Form for forms
- Vitest for unit tests, Playwright for end-to-end tests
- PWA with offline queue for pre-start checks (yards and sites have poor signal)
- Hosting: Vercel (app) + Supabase (DB). Region: Sydney (closest to NZ).

## Rules
1. **Multi-tenant from day one.** Every table has `company_id`; RLS policies enforce it.
   RCK is just the first company.
2. **Money:** store cents as integers, NZD, ex GST. Show GST separately where relevant.
3. **Never delete cost records.** Corrections are reversing entries. Soft-delete everything else.
4. **Audit log** on create/update/delete of assets, work orders and costs.
5. **Dates:** store UTC, display Pacific/Auckland. NZ date format dd/mm/yyyy.
6. **Spelling:** NZ English in the UI (e.g. "colour", "authorise", "tyre").
7. **Phone first** for operator and mechanic screens: big tap targets, works with gloves,
   one task per screen. Desktop first for office and dashboards.
8. Keep files small and modules separated by domain: `assets`, `prechecks`, `breakdowns`, `flags`,
   `workorders`, `parts`, `suppliers`, `integrations/xero`, `dashboard`.
9. Secrets only in env vars. Never commit `.env*`.
10. **Five user types** — Director, Office, Workshop, Supervisor, Crew (+ Subcontractor
    guest later) — exactly as in `docs/05-users-and-access.md`. Permissions live in one
    central permission map (user type × area × action), checked on the server AND enforced
    by RLS. Hiding a button is never the only control. Extra rights (e.g. Workshop lead)
    are named flags; acting access has an end date.
11. **Everyone has their own login.** No shared accounts. Users are deactivated, never deleted.
    Accounts are self-created from the company sign-up link, verified by a 6-digit code
    typed in the app (no magic links or confirmation emails), and stay PENDING with zero
    data access until the Director assigns a user type. Supabase is the backend only —
    users must never see Supabase-branded emails, links or screens.
12. **Audit everything:** every create/edit/status change/approval/sign-in/export writes
    an append-only audit row (who, what, when, device, before/after; GPS for pre-starts).
    Work orders keep an event timeline (raised, triaged, assigned, labour sessions with
    pause reasons, parts issued, completed, signed off, costed).
13. Each user type gets its own home screen (see docs/05).
14. **Minimal UI** (docs/10): no unnecessary subtext or minor headings; three-colour
    palette; green/yellow/red only for status. All configuration lives behind the Setup
    button; everyday screens never show setup controls.
15. **Closed work orders are read-only forever.** A fix that didn't hold gets a linked
    follow-up work order. A WO cannot be signed off without cause, work done, ≥1 fix
    photo, cost(s) and sign-off (docs/08).
16. Seed data: realistic NZ civil-contractor fleet (trucks, rollers, pavers, excavators,
    skid steers, trailers) for two yards: Helensville and Westgate.

## How to work (every task)
1. Read `docs/PLAN.md`, pick the **first unchecked task**.
2. Read the relevant spec section in `docs/`.
3. Write or update tests first where practical.
4. Implement the smallest change that completes the task.
5. Run: `pnpm typecheck && pnpm lint && pnpm test` (and `pnpm e2e` when UI flows change).
6. Fix until green. Do not skip or delete failing tests to get green.
7. Tick the task in `docs/PLAN.md`, append a 2–3 line entry to `docs/PROGRESS.md`.
8. Commit with a clear message: `feat(workorders): ...`.
9. If a spec is unclear or a decision is needed, write it under "Questions for Sam" in
   `docs/PROGRESS.md`, choose the simplest sensible default, and carry on.

## Done means
Types pass, lint passes, tests pass, the feature works on a phone-sized screen, and
PLAN.md + PROGRESS.md are updated.
