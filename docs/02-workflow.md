# Workflow

Everything feeds one record — the work order — and every work order ends as a cost against one asset.

```
Pre-check (QR) → Pass? ─yes→ Asset in use → Hours/km logged → Service due ─┐
                   │no                                                      │
Breakdown report → Red/yellow flag ───────────────→ WORK ORDER ←───────────────┘
                                                   │
                                  ┌────────────────┴───────────────┐
                           Internal workshop                 Subcontractor
                                  └──────→ Labour + parts + invoice ←┘
                                                   │
                                     Cost to asset + dashboard
```

## 1. Pre-check (detail in 07-checks-and-faults.md)
1. Crew scans the asset's QR code.
2. App shows that asset's pre-check template (built by Workshop or Director).
3. Crew enters hours/km and answers each item (Fine / Usable / Broken, Yes / No, or text), photos where required.
4. Saved as a report: green if all fine, yellow if any Usable, red if any Broken.
5. No work order is created automatically. Red/yellow items show on the asset for the workshop to review.

## 2. Flag or breakdown to work order
1. Flags come from pre-check items or breakdown reports (any user; Still usable = yellow, Unusable = red).
2. Workshop lead reviews each flag: create work order (pre-filled, linked), dismiss with reason, or leave open.
3. When creating the WO: priority (critical / high / normal), internal or subcontractor.
4. Breakdowns also log location, time down and job affected (downtime).

## 3. Planned servicing
1. Each asset has service intervals (hours, km or calendar) and a service kit.
2. At the trigger (e.g. 90% of interval) the app creates a planned work order.
3. CoF, WoF, RUC and registration raise reminders 30 days out.
4. Overdue services show red on the dashboard.

## 4. Internal workshop job
1. Work order assigned to a mechanic.
2. Mechanic logs labour time, parts issued from stock (or service kit), notes, photos.
3. Mechanic completes; workshop manager signs off.
4. Asset returns to **Available**; labour (hours × internal rate) and parts post to the asset.

## 5. Subcontractor job
1. Work order sent to a subcontractor with a PO number.
2. Subcontractor invoices RCK quoting the PO.
3. Bill arrives in Xero; app matches it by PO/supplier to the work order.
4. Office approves the match; cost posts to the asset.

## 6. Parts and bulk purchases
1. Bulk orders (filters, oils, service kits, wear parts) received into stock at unit cost.
2. Parts are issued to work orders, not expensed straight to "maintenance".
3. Low stock triggers a reorder list.
4. Month-end: stock on hand valued; anything not issued stays in stock.

## 7. Month-end
1. All closed work orders costed (labour, parts, subcontractor).
2. Unmatched Xero maintenance bills flagged for coding.
3. Dashboard: spend vs monthly workshop budget, cost per asset, planned vs reactive split.

## Statuses
| Record | Statuses |
| --- | --- |
| Asset | Available · In use · Out of service · In workshop · At subcontractor · Disposed |
| Defect | Open · Triaged · On work order · Closed |
| Work order | Draft · Scheduled · In progress · Waiting parts · At subcontractor · Complete · Signed off · Costed |
