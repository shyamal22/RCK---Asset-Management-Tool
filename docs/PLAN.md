# Build plan

Work top to bottom. Tick each box when done (see CLAUDE.md "Done means").

## Milestone 0 — Foundation
- [x] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui; pnpm scripts: dev, build, typecheck, lint, test, e2e
- [x] Supabase project wiring (env vars, client/server helpers); Drizzle set up with first migration
- [x] Tables: companies, users, crews, sites, owner_entities, user_type_permissions, user_flags, temp_access, audit_log — all with company_id + RLS
- [x] Central permission map (user type × area × action) from docs/05, with unit tests for every cell of the matrix
- [x] RLS policies generated from the permission map; tests prove Crew cannot read workshop documents or costs via the API
- [x] Self sign-up via company sign-up link (+ QR): name, mobile or email, password; Microsoft/Google one-tap option; Director can disable/regenerate link
- [x] Verification by 6-digit code (SMS/email) entered in-app — no magic links, no confirmation-link emails; all messages branded, custom templates
- [x] Pending state: no data access (RLS), waiting screen; Director notified; Setup → Users approve (type, crew, flags) or reject
- [x] Passkeys (Face ID / fingerprint) and PIN unlock on phones; second step for Director/Office on new devices; lockout on repeated failures; reset by code
- [x] Shared workshop tablet: quick user switch by personal PIN
- [x] User admin: change user type, move crew, Workshop lead flag, acting access with end date (auto-expires), deactivate (never delete)
- [ ] Append-only audit log for all writes, sign-ins and exports; audit viewer for Director
- [ ] App shell: phone layout (bottom nav) and desktop layout (side nav); a different home screen per user type; RCK branding placeholder
- [ ] Setup area behind a single Setup (gear) button, visible per docs/10; no setup controls anywhere in everyday screens
- [ ] First-run guided setup for a new company (company → yards/crews → assets → templates → sign-up link)
- [ ] Seed script: RCK company, Helensville + Westgate yards, Jacks Bobcats Ltd + RCK owner entities, Green and Yellow crews, one sample user of each user type
- [ ] CI: GitHub Actions running typecheck, lint, test on every push

## Milestone 1 — Asset register
- [ ] Tables: asset_types (company-editable list), assets, compliance_items, meter_readings — per docs/06-asset-setup.md
- [ ] Asset fixed details: name, code (unique per company, uppercase), type, make, model, year — all required
- [ ] Tracking unit segmented switch (Hours | Kilometres), type suggests default, user confirms; unit change restricted, reasoned, audited
- [ ] Meter readings with source and entered-by; flag readings lower than the last
- [ ] Asset list (search by name OR code, filter by type/status/site/crew) and asset detail page
- [ ] Create/edit asset form with validation; photo upload
- [ ] QR code per asset (generate + printable label sheet, A4)
- [ ] Compliance items (CoF, WoF, RUC, rego, insurance) with expiry and document upload
- [ ] Asset documents with access category: workshop (repair manuals, wiring, procedures), operator (manual, SOP), compliance, commercial (value, lease); visibility per docs/05
- [ ] Signed, expiring file links; every document download logged
- [ ] CSV import of asset list (for RCK's existing spreadsheet)
- [ ] Seed ~40 realistic assets

## Milestone 2 — Pre-checks and breakdown reports (docs/07-checks-and-faults.md)
- [ ] Tables: precheck_templates (asset type or asset, versioned), precheck_items, prechecks, precheck_answers, breakdown_reports, flags
- [ ] Template builder (Workshop + Director): question, answer type (Fine/Usable/Broken, Yes/No with problem answer, free text), photo required toggle, help note; reorder items; per-type with per-asset override; versioning
- [ ] Crew flow: scan QR → enter reading → answer items → photos → submit; auto user/time/GPS
- [ ] Offline support: queue submissions and photos, sync when back online
- [ ] Flags: Usable → yellow, Broken/problem answer → red; pre-check overall flag = worst item; NO automatic work orders
- [ ] Pre-check report view (red/yellow first) with per-item actions: create WO (pre-filled, linked), dismiss with reason, leave open
- [ ] Breakdown report (any user type): asset, title, details, 1+ photos, Still usable (yellow) / Unusable (red); notifications; Unusable sets asset status
- [ ] Asset overall flag (green/yellow/red) from open items; clears when dismissed or WO signed off
- [ ] Store last pre-check date and user per asset; pre-check history per asset
- [ ] Asset status Parked / not in use (excluded from missed-check rules)
- [ ] Pre-check week view (Director + Workshop): assets × last 7 days, colour per day, days since last check, filters (docs/09)
- [ ] Missed pre-check rule: alert when active asset passes 7 days; weekly Monday report (email + PDF)

## Milestone 2b — Notifications (docs/09)
- [ ] Tables: notifications, notification_rules, notification_recipients, acknowledgements
- [ ] In-app bell with unread count; each notification links to its record
- [ ] Automatic rules from docs/09 with Director on/off and recipient settings
- [ ] Director messages to user(s), crew or user type; optional must-acknowledge with read tracking
- [ ] Channels: push (PWA), SMS for red/Unusable only, email for reports and digests; all sends logged

## Milestone 3 — Work orders
- [ ] Tables: work_orders, labour_entries (WOs link to the flag/pre-check item/breakdown they came from)
- [ ] Flag inbox for Workshop lead: all open red/yellow items across assets; create WO (priority, internal vs subcontract) or dismiss
- [ ] Downtime: time down from breakdown report to WO sign-off
- [ ] Work order lifecycle with statuses from docs/02-workflow.md; status changes audited
- [ ] Work order event timeline (raised, triaged, assigned, labour sessions with pause reasons, parts, completed, signed off, costed)
- [ ] Timing metrics per work order: time to triage, time to start, wrench time, waiting time, downtime
- [ ] Crew/Supervisor see status of faults they raised / their crew's machines (no costs)
- [ ] WO fields per docs/08: type, priority, complaint (carried from report), cause + system tag, correction; target date; estimate with Director approval over limit
- [ ] Mechanic phone view: my jobs, start/stop labour timer, on-hold with reason, notes, photos
- [ ] Tables: suppliers, purchase_orders (basic; extended in Milestone 4)
- [ ] Subcontractor assignment: choose supplier, raise PO (auto number), generate PDF job pack (WO, PO, asset, original report + photos, history, comments), email from app, log send
- [ ] Close-out form (all required): cause, work done, ≥1 fix photo, internal cost (one box), subcontractor cost + invoice no. + file (required if PO), reading at close, back in service, sign-off by PIN/signature
- [ ] On close: days_to_fix, downtime_days, clear flags, roll service interval, notify reporter, post costs; invoice vs PO variance flag
- [ ] Closed WOs read-only; follow-up WO linked to original
- [ ] Asset history timeline: WOs, pre-checks, breakdowns; filters; cost per year + lifetime; repeat-fault warning (same system ≥3 in 90 days)

## Milestone 4 — Parts, stock and suppliers
- [ ] Tables: parts, service_kits, kit_items, stock_movements, suppliers, purchase_orders, po_lines
- [ ] Receive bulk purchases into stock at unit cost (weighted average costing)
- [ ] Issue parts / whole service kits to a work order
- [ ] Low-stock list and reorder suggestions
- [ ] Purchase orders to suppliers and subcontractors (PDF + email)
- [ ] Subcontract costs on work orders

## Milestone 5 — Planned maintenance
- [ ] Tables: service_plans
- [ ] Service intervals per asset (user-defined, in the asset's unit): name, interval, warn before due, kit, last done at; multiple per asset
- [ ] Status per interval: OK / Due soon / Overdue, recalculated on every new reading
- [ ] Due soon → auto-create planned work order (max one open per interval); Overdue → red + notify Workshop lead and Director
- [ ] On service WO sign-off, update last done at and roll next due forward
- [ ] Compliance reminders 30 days before expiry
- [ ] Email notifications (critical defect, service due, expiry); daily manager digest

## Milestone 6 — Xero integration
- [ ] Xero OAuth 2.0 connect per company; tokens encrypted
- [ ] Sync suppliers ↔ Xero contacts
- [ ] Pull supplier bills; match to POs / work orders by reference; review screen for unmatched
- [ ] Push POs to Xero
- [ ] Sync log screen (runs, errors)

## Milestone 7 — Dashboard and reports
- [ ] Tables: budgets
- [ ] Dashboard: spend this month vs workshop budget; planned vs reactive vs breakdown split
- [ ] Cost per asset, cost per hour, downtime per asset (month / FY to date, NZ FY Apr–Mar)
- [ ] Overdue services, expiring compliance, open defects by priority
- [ ] Repair-or-replace view: lifetime cost vs value per asset
- [ ] Export any report to CSV and PDF

## Milestone 8 — Commercial version (later)
- [ ] Company sign-up and onboarding wizard (import assets, set rates, invite users)
- [ ] Subscription billing
- [ ] Subcontractor portal (view job, upload invoice)
- [ ] Telematics import (ISO 15143-3 / AEMP; EROAD or similar for trucks)
- [ ] Public API + webhooks
