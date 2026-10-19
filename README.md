# ChargeNeighbour

## Find EV charging. Share your home charger.

**ChargeNeighbour helps drivers discover real EV charging stations across India and lets home charger owners apply to share their unused charging hours with nearby drivers.**

[Open the website](https://chargeneighbour-theta.vercel.app) · [Explore the real map](https://chargeneighbour-theta.vercel.app/#explore) · [Read the pitch brief](public/pitch-brief.md)

| For EV drivers | For charger owners | The business idea |
| --- | --- | --- |
| Find stations, explore the place and get directions before travelling. | Apply to offer an existing home charger and suitable parking space. | Build a reviewed charger-sharing network, with a proposed fee on completed sessions. |

![ChargeNeighbour concept: an EV charging in a neighbourhood driveway](public/images/neighbourhood-hero.webp)
*AI-generated concept artwork. It does not represent an onboarded host or an operating partnership.*

### What works today

- Interactive Google map with real charging-station markers, pan, zoom and satellite imagery.
- Optional **Use my location**, with captured coordinates and accuracy. Location can be refreshed or cleared; it is not stored in the application database.
- Google Maps links to explore station photos, reviews and driving directions.
- Supabase email sign-in, private account activity, host applications, pilot interest and withdrawal.
- Clear host economics assumptions and a downloadable pitch brief. No invented traction or guaranteed earnings.

### What still needs activation

| Capability | Status |
| --- | --- |
| Embedded Google map and external place exploration | Live |
| In-site connector specifications, maximum kW, Google photo gallery and ratings | Implemented; Google billing, Places API activation and server key are pending |
| Nearest compatible station with recently reported connector availability | Implemented; depends on the Google data above. Missing or stale information is shown as unconfirmed |
| Public email sign-in delivery | Requires suitable Supabase SMTP setup; the default service restricts recipients and volume |
| Host reservations, payments and payouts | Not enabled; host approval, operations and payment-provider onboarding are required |

A station being **open** does not mean a connector is free. Availability is only labelled recently reported when Google provides an explicit connector count and an update within 15 minutes. Distances on cards are straight-line estimates; Google directions provide the road route. A Google listing is not automatically a ChargeNeighbour partner.

### How the proposed marketplace works

1. Drivers discover nearby charging options and confirm compatibility, opening hours, entry and pricing.
2. Owners apply with charger power, neighbourhood and parking-access information.
3. Hosts must complete equipment, permission, access, pricing and operational review before offering reservations.
4. A future commercial service would record delivered energy and arrange payments and settlement through an approved provider.

The proposed 15% commission and earnings illustrations are hypotheses, not active charges or promises. See [the pitch brief](public/pitch-brief.md) and [launch plan](public/launch-plan.md) for assumptions, evidence and operational requirements.

### Technology

**Next.js 16 · React 19 · TypeScript · Vercel · Supabase · Google Maps / Places**

The app uses Supabase for email authentication and persistent application records. Identity is verified server-side with getUser; incoming identity headers are never trusted. Session cookies are HTTP-only. Server-only database credentials never enter the browser bundle.

The original Sites deployment uses a separate identity system. Vercel account IDs are prefixed with `supabase:`; historical records are not reassigned by email address.

### Local development

Use Node.js 24.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The development server runs at http://localhost:5180. Supply your own values in the ignored local environment file.

| Variable | Purpose |
| --- | --- |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_PUBLISHABLE_KEY | Supabase public authentication key |
| SUPABASE_SECRET_KEY | Private server database credential; never use a NEXT_PUBLIC prefix |
| APP_URL | Canonical site URL, used for authentication callbacks |
| GOOGLE_PLACES_API_KEY | Optional private key after Google activation |

Apply the SQL in `supabase/migrations/` for a new database. The quota function enforces an atomic **100-request daily allowance**, shared by station search and photo calls for this deployment. Browser roles have no access to this table or function. API data and photo content are not persisted by this app.

In Supabase Auth, set the production Site URL and allow `https://chargeneighbour-theta.vercel.app/auth/callback**`. Use a separate local redirect when developing. Email links should be opened in the same browser to preserve the PKCE verifier.

### Checks and publishing

```bash
npm run check
node scripts/check-stations.mjs
npm run build
```

This repository is connected to the **chargeneighbour** Vercel project. Push reviewed updates to **main** to trigger a production build. Feature branches receive Vercel previews according to the project's protection settings. Maintain this README and the feature-status table when capabilities change.

Never commit `.env.local`, `.vercel/`, authentication tokens or server API keys. Runtime secrets belong in Vercel's environment settings.

### Before commercial charging

Identify the operating entity and support contacts, publish final privacy and retention terms, review each host's equipment and property permissions, establish payment and settlement eligibility, and test booking conflicts, refunds and incident handling. These steps are tracked in [the launch plan](public/launch-plan.md).
