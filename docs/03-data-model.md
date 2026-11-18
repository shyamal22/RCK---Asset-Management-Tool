# Data model

The asset is the centre; every cost record carries an asset ID and a company ID.

## Core records
| Record | Key fields | Links to |
| --- | --- | --- |
| Company (tenant) | Name, NZBN, logo, Xero org ID, labour rates, currency (NZD), time zone | Everything |
| Site / yard | Name, address (e.g. Helensville, Westgate) | Assets, stock |
| Owner entity | Name (e.g. Jacks Bobcats Ltd, RCK), lease rate | Assets |
| Asset | Asset no., QR code, category, make, model, year, serial/VIN, rego, owner entity, home site, crew, status, current hours, current km, purchase/lease date, value, disposal date | Everything below |
| Asset category | Name (truck, roller, paver, excavator, skid steer, trailer, attachment, light vehicle), checklist template, default service plan | Assets |
| Compliance item | Asset, type (CoF, WoF, RUC, rego, insurance, crane cert), expiry date / km, document | Asset |
| Meter reading | Asset, date, hours, km, source (pre-start, manual, telematics) | Asset |

## Checks and faults
| Record | Key fields | Links to |
| --- | --- | --- |
| Checklist template | Category, items (text, critical yes/no, needs photo) | Category |
| Pre-start | Asset, operator, date/time, GPS, hours/km, result, signature | Asset, user |
| Pre-start item result | Item, pass/fail/NA, note, photo | Pre-start |
| Defect | Asset, source, description, photos, priority, status, raised by, date | Asset, work order |
| Breakdown | Asset, time down, time back, location, job affected, cause | Defect, work order |

## Maintenance work
| Record | Key fields | Links to |
| --- | --- | --- |
| Service plan | Asset or category, interval type (hours/km/days), interval, warn at %, service kit, tasks | Asset, kit |
| Work order | WO no., asset, type (planned/reactive/breakdown/compliance/modification), priority, status, assigned to, internal or subcontract, PO no., opened, completed, signed off by, hours/km at job | Asset, defect, plan |
| Labour entry | Work order, mechanic, date, hours, rate | Work order, user |
| Parts issue | Work order, part, qty, unit cost (from stock) | Work order, part |
| Subcontract cost | Work order, supplier, PO, Xero bill ID, amount ex GST, approved | Work order, supplier |

## Parts and suppliers
| Record | Key fields | Links to |
| --- | --- | --- |
| Part | Part no., description, supplier, unit, average cost, min stock, reorder qty, bin | Stock |
| Service kit | Name, parts and qty, fits which models | Parts, plans |
| Stock movement | Part, site, qty in/out, unit cost, type (purchase/issue/adjust/transfer), ref | Part, WO, PO |
| Supplier / subcontractor | Name, trade, contact, Xero contact ID, rates | POs, costs |
| Purchase order | PO no., supplier, lines, status, Xero PO/bill ID | Supplier, WO |

## People and budget
| Record | Key fields | Links to |
| --- | --- | --- |
| User | Name, mobile, email, role, crew, hourly cost rate, licence classes | Company |
| Role | Operator, crew leader, mechanic, workshop manager, office, manager, admin, subcontractor | Users |
| Budget | Month, category (workshop, parts, subcontract), amount | Company |
| Audit log | Who, what, when, before/after | Everything |

## Rules
- Every record has `company_id` from day one.
- Work order cost = labour (hours × rate) + parts issued + subcontract costs.
- Costs are never deleted; corrections are reversing entries.
- Photos and documents stored as files, linked by ID.
