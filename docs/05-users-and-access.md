# Users and access

Five user types, each seeing only what their job needs. Every action is logged against a named person.

## User types
| User type | Who | Main job | Device |
| --- | --- | --- | --- |
| Director | Owner/director + admin (e.g. Commercial Manager) | Everything: costs, dashboards, settings, users, audit log | PC, phone |
| Office | Office and accounts | Purchasing, supplier invoices, Xero, compliance dates, seeing pending accounts | PC |
| Workshop | Workshop manager + mechanics | Work orders, servicing, parts, repair documents | Tablet, phone, PC |
| Supervisor | Crew supervisors / foremen | Their crew's machines, pre-start compliance, chasing faults | Phone |
| Crew | Operators, drivers, labourers | Pre-starts, reporting faults, logging hours/km | Phone |
| Subcontractor (later) | External guest | One work order via expiring link | Web link |

**Workshop lead** flag (workshop manager): assign jobs, sign off work orders, edit others' labour, see workshop budget.

## Permission matrix
Full = create/edit/approve/delete · Edit = create/edit · View = read · Own = own records or own crew's · — = hidden

| Area | Director | Office | Workshop | Supervisor | Crew |
| --- | --- | --- | --- | --- | --- |
| Overall dashboard and cost reports | Full | View | Workshop budget only (lead) | — | — |
| Asset register (basic details) | Full | Edit | Edit | View | View (own machines) |
| Asset value, lease, cost history | Full | View | — | — | — |
| Workshop documents (repair manuals, wiring, procedures) | View | View | Full | — | — |
| Operator documents (manual, SOP) | Full | View | Full | View | View |
| Compliance documents (CoF, rego, RUC, insurance) | Full | Full | View | View | — |
| Pre-start checks | View all | View all | View all | Do + view crew | Do + view own |
| Defects and breakdowns | Full | View | Full (triage) | Raise + view crew | Raise + view own |
| Work orders | Full | View + costing | Full (lead assigns, signs off) | View status (crew's machines) | View status (own reports) |
| Labour time | View | View | Log own (lead edits all) | — | — |
| Parts and stock | Full | Full | Issue + request | — | — |
| POs and supplier invoices | Approve | Create + match | Request | — | — |
| Xero and company settings | Full | Use | — | — | — |
| Approving accounts, user types, logins | Full | See pending accounts | — | — | — |
| Audit log | Full | — | Own work orders | — | — |

Permissions are data (user type × area × action), editable per company later — not hard-coded in screens.

## Home screen per user type
- **Crew:** big "Scan machine" button, today's pre-start status, "Report a fault", my faults and their status.
- **Supervisor:** crew's machines by status, who has/hasn't done today's pre-start, open faults on crew machines.
- **Workshop:** job board (New · Scheduled · In progress · Waiting parts · Done), My jobs with start/stop timer, services due this week, low stock. Asset page shows workshop documents.
- **Office:** bills to match, POs awaiting approval, compliance expiring in 30 days, users.
- **Director:** overall dashboard (spend vs budget, cost per asset, downtime, overdue services, critical defects) with drill-down.

Phone: large glove-friendly buttons, one task per screen, offline save.

## Accounts and logins (self sign-up, Director approves)
No invite emails and no confirmation links.
1. Each company has its own sign-up link (+ QR code). Director can disable or regenerate it.
2. User creates account: name, mobile or email, password — or one tap Microsoft / Google sign-in.
3. Verify with a 6-digit code (SMS or email) typed into the app. No links to click.
4. Account is PENDING: sees only "waiting for approval"; no data access (enforced by RLS, not just UI).
5. Director gets a notification; Setup → Users → approve with one tap: user type, crew, extra flags. Or reject.
6. Approved user lands on their home screen immediately.

After first login:
- Phones stay signed in; unlock with Face ID / fingerprint (passkey) or PIN.
- Director/Office: second step (code or passkey) on new devices.
- Shared workshop tablet: switch user by personal PIN.
- Reset password by 6-digit code, or Director resets.
- Leavers deactivated same day; never deleted.
- No shared logins.
Security: lockout after repeated wrong codes/passwords; every sign-up, approval, login logged; all SMS/email branded from the app (never generic provider templates).

## Role changes
- Director changes user type; effective next screen load; audited.
- Acting access with end date, auto-reverts.
- Changing crew changes what a Supervisor sees from that date; past records stay with original crew.
- One user type per person; extra rights as named flags.

## Activity tracking
Every create, edit, approval, status change, sign-in and export logged: who, what, when, device, before/after; GPS on pre-starts and breakdowns. Append-only — nobody can edit or delete it.

Work order timeline:
| Step | Recorded |
| --- | --- |
| Raised | Who, when, source pre-start/report |
| Triaged | Who set priority and internal vs subcontract |
| Assigned | Mechanic or subcontractor, by whom |
| Started / paused / resumed | Each labour session per mechanic, pause reason (waiting parts, waiting approval, other job) |
| Parts issued | Parts, qty, by whom |
| Completed | Who, when, notes, photos |
| Signed off | Workshop lead, when; asset back in service |
| Costed | Labour, parts, subcontract; who approved invoice match |

Metrics: time to triage, time to start, wrench time, waiting time, downtime per WO and per asset.

## Data storage and sharing
- Cloud database + file store in Sydney region. Photos/docs as files linked to asset or WO.
- Company ID on every record; database blocks cross-company access (RLS).
- Access enforced on the server, not just hidden in the UI; file links are signed and expiring.
- Daily backups, point-in-time restore. Encrypted in transit and at rest; integration keys encrypted per company.
- Cost and WO records kept at least 7 years.
- Subcontractor link scoped to one WO, expires on close. Exports (PDF/CSV) only for permitted user types; every export logged.
- Each company owns and can export its data. Personal info (names, phones, GPS) handled under the NZ Privacy Act 2020.
