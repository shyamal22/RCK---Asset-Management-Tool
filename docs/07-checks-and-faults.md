# Checks and faults

Two ways a problem gets reported: the **pre-check** (routine, before use) and the **breakdown report** (fault found on site, any time). **Neither creates a work order automatically.** They flag the asset yellow or red; a Workshop user (or Director) reviews each flag and creates a work order or dismisses it.

## 1. Pre-checks

### Templates
- No fixed list. Workshop and Director build templates after assets are loaded.
- Template per **asset type**, optional override per **specific asset**.
- Crew complete templates; cannot edit them.
- Versioned: editing doesn't alter completed pre-checks (each pre-check stores template version).

Every item has the same layout:
| Part | Options |
| --- | --- |
| Question | Free text written by template builder |
| Answer type | Condition: Fine / Usable / Broken · Yes / No (builder marks which answer is the problem) · Free text |
| Photo | Required (default) or not required, per item |
| Help note | Optional guidance under the question |

### Doing a pre-check (Crew)
1. Scan QR (or pick from "My machines").
2. Enter current hours or km (asset's unit).
3. Answer each item; photo where required (camera capture on phone).
4. Submit. Auto-save: user, date/time, GPS. Works offline, syncs later.

### Flags
| Answer | Flag | Result |
| --- | --- | --- |
| Fine / good Yes-No answer | Green | Record only |
| Usable | Yellow | On report + asset as "check soon" |
| Broken / problem Yes-No answer | Red | On report + asset; notify Workshop lead |

Pre-check overall flag = worst item.

### Pre-check report
Header: asset, who, when, where, reading. Items listed with answer + photo, red/yellow first.
Per flagged item, Workshop/Director can:
- **Create work order** — one tap, pre-filled (asset, item, photo, notes), linked to the pre-check item.
- **Dismiss** — reason required (e.g. not a fault, already booked in).
- **Leave open** — stays on the asset.
All decisions audited.

Store last pre-check date and user per asset from day one (missed-check reporting spec to follow).

## 2. Breakdown reports
Fault found on site affecting machine, work quality or productivity. Separate from pre-checks.
**Any user type** can raise.

| Field | Rules |
| --- | --- |
| Asset | Required; QR or search by name/code |
| Title | Required |
| Details / comments | Required |
| Photos | At least 1 required; multiple allowed |
| Status | Still usable (yellow) or Unusable (red) |
| Auto | Raised by, date/time, GPS, optional current reading |

- Yellow: asset flagged yellow; notify Workshop lead + crew's Supervisor.
- Red: asset flagged red, status → Unusable; notify Workshop lead, Supervisor, Director immediately.
- Workshop creates WO from it (pre-filled, linked) or dismisses with reason.

## Asset overall flag
- Green: no open yellow/red items
- Yellow: ≥1 open Usable pre-check item or Still-usable breakdown
- Red: ≥1 open Broken pre-check item or Unusable breakdown
Clears when every open item is dismissed or its WO is signed off.

## Later (spec to follow)
- Work order tracking and visual view of asset with faults marked (desktop).
- Work order PDF.
- Missed pre-check reporting.

## Open questions
- Can Supervisors build/edit templates?
- Pre-check frequency: per day of use, per shift, or per operator?
- Should an Unusable asset block pre-checks until cleared?
