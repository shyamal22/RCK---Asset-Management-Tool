# Asset setup

Each asset is set up once with six fixed details, plus one user choice that drives all proactive servicing: tracked by **hours** or **kilometres**. The app never guesses this.

Two main parts hang off each asset: **proactive maintenance** (this file) and **on-site pre-checks** (spec to follow).

## Fixed details
| Field | What it is | Input | Rules |
| --- | --- | --- | --- |
| Asset name | Whatever the user calls it; title on asset page and in search | Free text | Required. Doubles as nickname — no separate nickname field. |
| Asset code | Company's own code, e.g. T11, T5, LV09, LV04 | Free text, user-defined | Required. Unique per company. Stored uppercase. Printed on QR label. Searchable. |
| Asset type | Paver, miller, skid steer (bobcat), roller, excavator, truck, transporter, trailer, light vehicle… | Pick list | Required. Company can add/rename types. Used for grouping and pre-check checklist. |
| Make | e.g. Caterpillar, Isuzu | Free text | Required. Not a grouping. |
| Model | e.g. AP555F | Free text | Required. Not a grouping. |
| Year | Year of manufacture | 4-digit number | Required. |

Search matches name OR code.

## Tracking unit
Two-way segmented switch on the asset form: **Track servicing by: [ Hours | Kilometres ]**
- Asset type may suggest a default; user must confirm.
- All readings, intervals and due calculations for the asset use that unit only.
- Changing it later: Director or Workshop lead only, reason required, audited, user re-enters current reading and intervals.

## Readings
- Current reading entered at each pre-check, manually (workshop/office), or from tracking software (later build).
- Every reading stored with date, source, entered by. A reading lower than the previous one is flagged.
- Reading saved on each service work order.

## Service intervals (user-defined, none assumed)
Per interval: service name, interval (in asset's unit), warn before due, optional service kit, last done at.
An asset can have several intervals (e.g. 250 / 500 / 1,000 hr).

next_due = last_done_at + interval
- **OK** — current reading < next_due − warn
- **Due soon** — within warn amount → auto-create planned work order (one open WO per interval max)
- **Overdue** — current reading ≥ next_due → red on dashboard, notify Workshop lead + Director

On service WO sign-off: last_done_at = reading on the WO; next_due moves forward.

## Add asset flow
1. Office, Workshop or Director taps Add asset.
2. Name, code, type, make, model, year.
3. Hours or Kilometres + current reading.
4. One or more service intervals (optional; asset shows "No service plan" until set).
5. Save → QR label generated.
Bulk import from spreadsheet with the same columns.

## Open questions
- Assets needing both units (e.g. truck with crane/PTO/pump on hours)?
- Calendar backstop (e.g. 250 hrs or 6 months, whichever first)?
- Which other details (serial/VIN, rego, owner entity, crew, yard) are required at setup?
