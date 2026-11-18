# Work orders and costs

Same path for internal and subcontractor jobs. Cannot close without sign-off + cost + work done + photos. Closed WOs are permanent on the asset record.

## Sources
| Source | Created by |
| --- | --- |
| Red/yellow pre-check item | Workshop lead or Director from the pre-check report |
| Breakdown report | Workshop lead or Director from the report |
| Service due (hours/km) | Automatic at "Due soon" |
| Compliance due (CoF, WoF, RUC) | Automatic 30 days before expiry |
| Other | Workshop or Director by hand |

## Fields
WO number (WO-00124, auto) · asset · type (Breakdown, Repair, Planned service, Compliance, Modification, Inspection) · priority (Critical = down/unsafe, High = affecting work, Normal, Low) · complaint (carried from report, with photos) · linked reports · assigned to (staff member or subcontractor) · target date · optional estimate (over Director approval limit → needs approval before work starts).

Record jobs as **Complaint → Cause → Correction**. Cause tagged by system: engine, hydraulics, electrical, brakes, tyres/tracks, body/structure, attachment/screed, other.

## Statuses
Open → Assigned → (Awaiting approval) → In progress / At subcontractor → On hold (reason: waiting parts, waiting approval, waiting subcontractor, machine needed on site) → Completed → Signed off.
Every step, comment, photo logged with who/when (WO history timeline).

## Subcontractor jobs
1. Workshop lead picks Subcontractor + supplier.
2. PO raised: auto number (PO-00089), description, estimate ex GST, linked to WO.
3. PDF job pack generated: WO + PO details; asset details (code, name, make, model, year, reading, location); original pre-check/breakdown report with photos; WO history; all comments; "quote PO number on invoice".
4. Emailed from the app (also downloadable); sending logged.
5. Status "At subcontractor" until reported back.

## Close-out (required)
| Field | Rule |
| --- | --- |
| Cause found | Text + system tag |
| Work done | Text |
| Photos of fix | ≥1 |
| Internal cost | One box, NZD ex GST |
| Subcontractor cost | One box, NZD ex GST + invoice no. + invoice file; required if a PO exists |
| Reading at close | Hours or km |
| Back in service? | Yes / No + reason |
| Sign-off | Auto name + timestamp, confirmed by PIN or signature |

Total = internal + subcontractor. Invoice vs PO variance over a set amount → flag to Director. Xero (when connected) matches invoice to PO.

## On close (automatic)
- days_to_fix = signed_off_at − opened_at (days), shown on WO and asset.
- downtime_days = days asset was Unusable.
- Linked flags clear; asset flag recalculated.
- Service WO: interval last_done_at updated, next due rolled forward.
- Original reporter notified.
- Costs post to asset and month's workshop spend.

## Asset history
- Closed WOs read-only forever. Fix didn't hold → follow-up WO linked to original (no reopening).
- Asset history timeline: all WOs, pre-checks, breakdowns; filters by type/system/year; cost per year + lifetime; repeat-fault warning (same system fixed ≥3 times in 90 days).

## Open questions
- Director approval limit (e.g. $2,000 ex GST)?
- Who signs off subcontractor jobs: Workshop lead only, or Office too?
- Internal cost one box, or labour + parts once stock tracking exists?
