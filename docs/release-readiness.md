# Release readiness — 20 October 2026

This release improves the public pilot and implements the operational foundation. It does not open commercial charging.

## Completed

- Applied the consolidated database schema and encrypted application-snapshot migration to the ChargeNeighbour Supabase project.
- Verified live anonymous access denial for private tables and privileged functions, server database connectivity, and atomic request allowances without reading customer records.
- Implemented owned applications, duplicate protection, paginated activity, support receipts, operator review, reviewed host inventory, offered hours, conflicting-reservation protection, metering, signed payment events, ledger records and external-settlement references.
- Added privacy/terms/status pages, retention, encrypted small application backups, health checks, sanitised errors, consent-based campaign counts, canonical sharing metadata and readable public typography.
- Configured private production retention and rate-limiting secrets. No credential values are committed.
- Added a ten-slide editable pitch deck and synchronized the proposed first cohort to 5–10 hosts and 30–50 supervised sessions.
- Passed TypeScript, station, bounded-input/signature, isolated PostgreSQL/RLS/payment replay/backup restore, production build and HTTP/security checks. Database overlap checks are isolated tests, not production multi-connection acceptance.

## Owner/provider activation still required

| Dependency       | Required evidence or action                                                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real operator    | Owner's legal operating identity, controlled public contact and first operating area. Another business's identity cannot be substituted.                                                                                                                 |
| Production email | A controlled sending domain and custom SMTP provider in Supabase, followed by real sign-in delivery checks. Built-in delivery is not a public launch solution.                                                                                           |
| Google           | Billing linked to ChargeNeighbour Maps, Places API enabled, restricted server key, separate referrer-restricted Maps JavaScript key and actual map ID. OpenStreetMap/OSRM remains active for the limited pilot. Google is optional for the current demo. |
| Merchant         | Approved business account, private Razorpay live credentials, final fee/refund/tax/settlement policy, and supervised capture/refund reconciliation. No live payment has been tested.                                                                     |
| Hosts            | Actual permission, electrical, metering, access and support reviews with supervised session acceptance. No host has been invented or automatically approved.                                                                                             |
| Operator access  | An actual signed-in owner's verified account UUID or trusted app metadata. Never grant operator access by matching an email address.                                                                                                                     |
| Hosting          | A Vercel plan that permits the intended commercial use. Current project is Hobby; review the current plan terms before selling services.                                                                                                                 |
| Operations       | GitHub scheduled health checks are implemented; confirm a controlled notification recipient, appropriately scoped provider backups and a supervised recovery exercise. Application snapshots exclude Auth, Storage and provider configuration.           |

Do not set `COMMERCIAL_LAUNCH_APPROVED=true` until all launch dependencies and the manual acceptance checks in `operations.md` are complete. Pilot outreach must accurately describe activation status and proposed targets. This release does not certify legal, electrical, insurance or payment-provider eligibility.

## Database release history

The two executable SQL migrations were applied through the dashboard SQL editor. Reconcile CLI migration history before the first `supabase db push`; do not blindly replay the consolidated baseline. Archived intermediate SQL is reference material only. See `operations.md`.

## Mobile release follow-up

Implemented direct discovery before the marketing hero, mobile station sheets with expand/back controls, larger touch controls, explicit unknown specifications, separate battery-swap filtering, stale GPS prompts, route retries, upload timeout/expiry and safe in-memory basic host drafts. Added a permissioned public host-photo path that retains private Storage and GPS controls, install metadata, a static-only offline fallback and a six-hour production health workflow. Updated the ten-slide deck and public brief to reflect the active alternative map.

Owner/provider dependencies remain open. No operator identity, real approved host, SMTP account, payment acceptance or larger routing allowance has been invented. Existing SQL migration history remains a manual dashboard history that must be reconciled before automated pushes.
