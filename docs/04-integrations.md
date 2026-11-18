# Integrations

Xero is the only must-have connection for the MVP; the app works without the rest.

| Connection | Phase | Direction | What it does | Notes |
| --- | --- | --- | --- | --- |
| Xero | 2 | Two-way | Pull supplier bills, contacts, POs; push POs; match bills to work orders | OAuth 2.0. WO/asset no. in bill reference. Keep per-asset costing in the app, not Xero tracking categories (limited). |
| Microsoft 365 / Entra ID | 1 | In | SSO for office and workshop staff | Operators can use mobile + PIN |
| Email | 1 | Out | Critical defect, service due, expiry, PO to subcontractor | Daily manager digest |
| SMS / push | 2 | Out | Alert mechanics and crew leaders | e.g. Twilio or app push |
| Telematics — trucks | 3 | In | Auto km, engine hours, location, RUC | e.g. EROAD, Teletrac Navman |
| Telematics — plant (OEM) | 3 | In | Engine hours, fault codes, fuel | ISO 15143-3 (AEMP) API: Cat VisionLink, Komatsu Komtrax etc. |
| Fuel cards | 3 | In | Fuel cost and litres per asset | CSV first |
| RCK timesheets | 2 | In | Cross-check mechanic labour | Fortnightly hours sheet / payroll |
| RCK job cost tracker | 2 | Out | Breakdown and hire-in costs against a job | Monthly export |
| SharePoint / OneDrive | 2 | Two-way | Manuals, CoF certificates, invoices | Or app storage |
| Billing (e.g. Stripe) | 4 | — | Subscriptions for other companies | Commercial only |
| Public API + CSV | 4 | Two-way | Onboarding other companies' asset lists | |

## Principles
- The app owns asset and maintenance data; Xero owns the accounts. No double entry.
- Every integration optional per company.
- Sync jobs log every run and failure.
- API tokens encrypted, per company.
