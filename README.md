# ChargeNeighbour

## Find a charge. Share your charger.

ChargeNeighbour helps EV drivers discover real public charging stations and invites owners to share accessible home chargers through a verified neighbourhood pilot.

**Website:** https://chargeneighbour-theta.vercel.app

**Repository:** https://github.com/siddarthabm123/chargeneighbour

**Pitch deck:** [Download the editable ten-slide presentation](https://chargeneighbour-theta.vercel.app/ChargeNeighbour-pilot-pitch.pptx). Pilot targets and economics are clearly labelled assumptions; no operating traction is claimed.

Drivers can explore the in-site station map and apply for the pilot. Hosts can submit an application for review. The proposed business earns a 15% commission on metered sessions after operational approval. Commercial charging is **not currently open**.

![AI-generated concept image, not a real participating host](public/images/neighbourhood-hero.webp)

### Current capabilities

The mobile homepage opens directly on discovery. An expandable station sheet, larger touch controls, unknown-specification labels, separate battery-swap filtering and the clearly labelled station demo work without Google billing. Install metadata and a static offline notice are included. The app does not cache private accounts, GPS, photos or live availability for offline use.

Hosts may separately consent to publication of their reviewed photo. Operators can publish that photo through an approved host listing without entering a manual image URL. Private evidence and exact GPS stay protected. A scheduled GitHub production health workflow checks the public service every six hours; notification delivery follows the repository owner’s GitHub settings.

| Capability                           | Implementation and activation                                                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public charging map                  | Interactive map with synchronized station markers; Leaflet/OpenStreetMap while Google is inactive, Google Maps when configured                                                                                                                  |
| Nearby sidebar and readable address  | Real mapped stations, road driving-distance/time estimates from GPS, readable address copying; no straight-line distance labelled as driving                                                                                                    |
| Google photos, ratings and reviews   | In-site photo gallery and attributed Google-supplied review sample implemented; Google billing, Places key and Maps configuration still required                                                                                                |
| Billing-free station demo            | “Try station demo” opens AI concept image views, example charger details and explicitly fictional reviews; also offered separately when a real station has no photos. No sample records, ratings or locations are added to real search results. |
| Synchronized filtered markers        | Active with Leaflet/OpenStreetMap; Google mode requires its separate restricted browser key and map ID                                                                                                                                          |
| Host applications and pilot interest | Verified account ownership, mandatory private charger photo + fresh on-site GPS evidence for new hosts, database enforcement, manual review and withdrawal                                                                                      |
| Email sign-in                        | Supabase callback configured; **custom production SMTP remains required** for general-public delivery                                                                                                                                           |
| Private support                      | No sign-in required; private receipt token, protected queue and operator responses                                                                                                                                                              |
| Operator workspace                   | Host approvals, offered schedules, sessions, support, campaign counts and settlement records; requires an explicitly trusted account UUID                                                                                                       |
| Participating host inventory         | Real approved records only; exact residential locations remain private                                                                                                                                                                          |
| Reservations                         | Transactional conflict checks, expiring requests, confirmation/cancellation and participant-only records; **commercial activation gated**                                                                                                       |
| Session metering                     | Supervised start/end readings calculate the actual energy charge                                                                                                                                                                                |
| Payments                             | Server-created Razorpay orders, signed captured-payment/full-refund webhooks and replay-safe ledger; **merchant approval, credentials and acceptance testing remain required**                                                                  |
| Host settlements                     | Records externally completed payouts and references; automatic transfers and partial refunds are not implemented                                                                                                                                |
| Privacy and terms                    | Public pilot notices, support/deletion request channel and retention process; actual operator details and final commercial terms remain required                                                                                                |
| Campaign measurement                 | Optional consent, aggregate counts and idempotent saved-application conversion counts                                                                                                                                                           |
| Maintenance and recovery             | Private daily retention cron, sanitized logs, health endpoint and encrypted small application-data snapshots with isolated restore checks                                                                                                       |
| Sharing and indexing                 | Canonical metadata, share image, robots and sitemap                                                                                                                                                                                             |

No public Google station is automatically a ChargeNeighbour partner. No fabricated homes, bookings, customer traction, delivered energy or earnings are presented as real.

### Public and private pages

- Public: `/`, `/hosts`, `/pilot`, `/privacy`, `/terms`, `/support`, `/status`
- Account applications: homepage → My activity
- Operator workspace: `/operator`, restricted to trusted Supabase app metadata or the private `ADMIN_USER_IDS` UUID allow-list
- Health: `/api/health`
- Payment webhook: `/api/payments/webhook`
- Private retention cron: `/api/maintenance`

### Stack and security

Next.js 16, React 19, TypeScript, Supabase Auth/Postgres and Vercel. Application ownership comes from verified Supabase user IDs, never identity headers or email matching. User application reads/writes use the signed-in user's database session and RLS. Privileged inventory, support and payment operations use private server credentials behind explicit application authorization.

Writes check origin and bounded JSON. Database transactions serialize submissions and competing reservation requests. API protection uses daily keyed network hashes and database-enforced allowances. Google search, detail and photo calls share a hard **100-call UTC-day cap**, plus per-client limits. Photo links are signed and expire. No Google station/photo content or GPS snapshots are persisted in the application database.

The public map falls back transparently when controlled-map configuration is absent. Road estimates exclude live traffic and do not guarantee site access or a free connector.

### Local development

Use Node.js 24.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The development server uses port 5180. The ignored local environment must contain your own configuration. Never commit credentials or put server credentials in a NEXT_PUBLIC variable.

Apply the executable files in `supabase/migrations/` in timestamp order to a new database. Legacy source files under `docs/migration-history/` are references only. For this existing project the launch schemas were applied in the SQL editor; reconcile migration history before adopting automated CLI pushes. Do not blindly rerun the full schema on an upgraded project.

### Validation

```bash
npm run check
node scripts/check-stations.mjs
node scripts/check-safety.mjs
node scripts/check-database.mjs
npm run build
node scripts/check-http.mjs
```

CI performs these checks on Node 24, including starting a local production server for HTTP checks. Database tests use isolated PostgreSQL and synthetic fixtures. They cover RLS isolation, application retries, quotas, host review, overlapping reservations, measured billing, payment/refund replay, withdrawal and encrypted application-data restoration. They do not certify provider activation, electrical safety or production multi-connection concurrency.

### Publishing and commercial activation

Main-branch pushes trigger the connected Vercel project. Feature branches can use Vercel previews according to project settings. Keep this feature table and the [operator runbook](docs/operations.md) current.

Before advertising or collecting money, finish the provider and business gates in the [operator runbook](docs/operations.md) and [public launch plan](public/launch-plan.md). Choose hosting that permits commercial use. Supply your actual operator identity/contact, activate and test Google/SMTP, approve real hosts, establish merchant/settlement eligibility, publish final commercial policies and run supervised acceptance sessions.

Keep `COMMERCIAL_LAUNCH_APPROVED=false` until those checks pass. Configuration flags are release controls, not legal approval, electrical certification, merchant approval or proof of customer traction.
