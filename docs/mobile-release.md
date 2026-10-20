# Mobile release and remaining activation

20 October 2026. This implements the software improvements identified in the mobile review. It does not assert that provider accounts, actual host inspections or commercial acceptance have been completed.

## Delivered

- Discovery appears before the marketing hero. The phone layout starts with a compact search and optional location action.
- The mobile map uses an expandable list/detail sheet, selected-station back control and larger navigation/map touch targets.
- Filters explicitly distinguish unknown specifications and exclude named battery-swap sites by default. Unknown records never establish connector compatibility or free availability.
- Driver location stays a snapshot. A stale-location notice and fresh route capture prevent treating an old position as current. Road retry remains available after failure.
- Host upload adds image-format guidance, a decoder fallback, progress steps, request timeout/retry and a visible expiry timer. Basic form text survives closing/reopening while the page remains open. Photos/GPS are not browser drafts.
- Separate optional applicant consent and actual operator review enable publication of the sanitized photo through a matching approved listing. The bucket stays private, GPS stays private and cancelled applications/suspended listings cannot serve the photo on subsequent requests.
- Manifest/icons support installation where the browser permits it. The service worker stores only a static offline notice and never caches accounts, maps, private photos, GPS or API responses. It cannot confirm offline bookings or payments.
- A GitHub Actions health workflow checks the homepage, database health, manifest and offline page every six hours. Configure the owner's GitHub notification preferences for failure delivery. Scheduled runs are best-effort and are not continuous monitoring.
- The ten-slide editable pitch deck, public brief, README and photo/privacy documentation match the current active map and clearly labelled demo.

## External dependencies still open

| Dependency | Concrete action/evidence |
| --- | --- |
| Legal operator and contact | Supply the actual operator name and an email/domain controlled by the owner. A product brand or another business's details cannot substitute for this. |
| Public email | Configure production SMTP using that domain, then verify delivery and same-browser login return with consenting Android/iPhone test users. Setting a flag is not provider activation. |
| Host supply | Inspect and approve actual chargers, permissions, access, metering and safety, then offer real hours. No sample host is inserted into public inventory. |
| Payments and settlements | Complete merchant onboarding and supervised capture/refund/meter reconciliation. Commercial gates remain closed. |
| Hosting and route capacity | Confirm a plan permitting the intended commercial use and provision an approved routing/tile provider before broad advertising. Current public pilot route caps remain unchanged. Google billing may stay deferred. |
| Operator account | Authorize the actual verified Supabase account UUID. No operator access is granted by matching an email address. |
| Recovery and migration history | Verify Storage/Auth/provider backups and a supervised recovery. Reconcile the existing dashboard-applied SQL history before automated pushes. The connector currently exposes only the unrelated older project, so it must not be used to alter this project's migration history. |
| Physical-device acceptance | Test camera/HEIC/JPEG, GPS permission/accuracy, moving/resuming, weak network, email-browser return and actual site arrival on Android and iPhone. Browser viewport checks alone cannot establish these outcomes. |

The owner answered “recommended” to the details request. That authorizes reasonable implementation choices, but supplies no real controlled domain, provider credentials, business identity or physical host evidence. No such facts have been invented.

## Validation

TypeScript, production build, station/specification tests, bounded-request/signature checks, image/GPS/route checks, isolated PostgreSQL ownership/reservation/payment/restore checks and production HTTP checks pass. Public-photo unit cases deny missing consent, wrong owner/evidence/application, cancelled applications and suspended listings. The pitch's changed slides were visually checked, with unchanged slides pixel-identical to the previous reviewed release.

Phone-viewport and live deployment checks follow publication. Real provider activation and physical charging remain the distinct acceptance items above.
