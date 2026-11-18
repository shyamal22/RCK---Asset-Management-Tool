# Workshop & Maintenance Tracking App — Project Summary

## The problem
RCK has no single record of what its plant and vehicles cost to run, what condition they are in, or what maintenance is due. Pre-start checks, servicing, repairs and breakdowns are tracked in different places, or not at all.

- **Pre-start checks** — operators should check machines before use, but results are not captured in a way that triggers action.
- **Internal workshop** — the Helensville workshop does most fixes and has to plan all servicing, but has no live job list or history per asset.
- **External subcontractors** — some work (e.g. specialist hydraulics, auto-electrical, tyres, CoF/WoF) goes out, and those invoices are hard to tie back to the asset.
- **Parts and stock** — parts, filters and service kits are bought in bulk, so the cost of what each machine actually used is lost.
- **Planned vs reactive** — no clear split between proactive servicing, reactive repairs and breakdowns, so the true cost of running (or keeping) an asset is unknown.
- **Ownership** — plant and trucks are leased from Jacks Bobcats Limited, so costs need to be reportable by asset and by entity.

## The opportunity
Build one maintenance and asset-cost tool, prove it at RCK, then offer it to other contractors.
- **Stage 1 — RCK:** built around RCK's real assets, crews, workshop and Xero.
- **Stage 2 — other companies:** multi-company (multi-tenant) service for civil, earthworks, haulage and plant-hire firms. Each company sees only its own data.

## Modules
| Module | What it does |
| --- | --- |
| Asset register | Every machine, truck, trailer and attachment: ID, make/model, owner entity, hours/km, documents (CoF, RUC, insurance). QR code on each asset. |
| Pre-start checks | Phone checklist per asset type, done by scanning the QR. Photos for faults. A failed critical item locks the asset out and raises a defect. |
| Defects & breakdowns | Faults from pre-starts, operators or the workshop, with priority and status. Breakdowns record downtime and location. |
| Planned maintenance | Service schedules by hours, km or calendar (e.g. 250/500/1000 hr). Auto-creates work orders when due; flags overdue. |
| Work orders | The workshop job card: tasks, labour hours by mechanic, parts used, photos, sign-off. Internal or sent to a subcontractor. |
| Parts & stock | Bulk purchases, service kits and stock on hand. Parts issued to a work order are costed to that asset. |
| Subcontractors & invoices | Supplier list, POs, and supplier invoices (from Xero) matched to work orders and assets. |
| Dashboard & reports | Cost per asset (planned / reactive / breakdown), cost per hour, downtime, overdue services, workshop spend vs monthly budget, repair-or-replace view. |

## Users
| User | Main device | What they do |
| --- | --- | --- |
| Operators / drivers | Phone | Pre-start checks, report faults, log hours/km |
| Crew leaders | Phone | See which assets are available, chase defects |
| Workshop manager | Tablet / PC | Plan servicing, assign jobs, order parts, track budget |
| Mechanics | Tablet / phone | Work job cards, log hours and parts, close out |
| Office / accounts | PC | Match supplier invoices, code costs, sync with Xero |
| Management | PC / phone | Cost, downtime and compliance dashboards; repair-or-replace calls |
| Subcontractors (later) | Web link | Receive a job, upload invoice and notes |

## Success measures
- % of maintenance spend assigned to an asset (target 90%+)
- Planned vs reactive/breakdown cost ratio, monthly
- Breakdown hours per asset per month
- Overdue services and expired CoF/WoF: zero
- % of asset-days with a completed pre-start
- Workshop spend vs monthly budget
- Cost per hour per asset for repair-or-replace decisions

## Phasing
1. **MVP (RCK only)** — asset register, QR pre-starts, defects, work orders, basic cost per asset.
2. **Cost control** — parts and stock, service kits, subcontractor POs, Xero bill matching, budget dashboard.
3. **Planning** — service schedules by hours/km, auto work orders, CoF/RUC/WoF reminders, downtime reporting.
4. **Commercial version** — multi-company setup, onboarding, billing, subcontractor portal, telematics.
