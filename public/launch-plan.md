# ChargeNeighbour — commercial launch plan

19 October 2026. The pitch website is not yet a commercially operating charging network.

## Built

- Responsive marketplace and business pitch with cited primary sources.
- Real Google Maps search links throughout India; direct Places results await billing and API activation.
- Supabase email sign-in, account-scoped database records and server-side authorisation.
- Host application, pilot interest, private account activity, status and withdrawal backed by Supabase in a dedicated organisation.
- Server validation, same-origin writes, bounded inputs, error states and user-level submission cooldown.
- Transparent session and host estimates; downloadable pitch brief.

## Operational decisions before real customer charging

1. Establish the operating legal entity and public support/deletion contacts. Publish final privacy notice, retention schedule, terms, cancellation/refund and dispute processes.
2. Confirm the local electricity/tariff, charging-service, tax and property requirements with appropriate professionals. The site's price examples are not tariff advice.
3. Recruit hosts and obtain property/parking permission. Review charger installation, protection, earthing, cable suitability, supply limits and metering with a qualified electrical professional. Record review evidence and remediation; do not equate identity checks with electrical certification.
4. Choose an approved payment/settlement provider after eligibility review. Set up the merchant account and host onboarding. Implement server-created orders, signed webhook verification, idempotency, payment reconciliation, refunds, settlement ledger and tax invoices. Never mark a reservation paid from a client response alone. Razorpay Route is a candidate to evaluate, not an approved or promised integration.
5. Introduce real charger records and host-approved schedules in the database. Implement atomic interval conflict prevention, expiring holds, review/approval permissions, cancellation rules and exact-address disclosure only to approved participants. Sample listings must never be converted into real inventory without host onboarding.
6. Add charger-side or supervised meter records for energy actually delivered. Integrate supported devices only after validating the equipment protocol and ownership. No battery percentage or live telemetry should be inferred from a listing.
7. Add verified contact channels and consented booking notifications. Define no-show, access failure, equipment failure and safety escalation handling. Set support coverage and incident ownership.
8. Implement an operator approval console with explicit administrator membership, auditable review actions and least-privilege access. No applicant may self-approve. Existing applications remain pending and do not create live listings.
9. Perform multi-account authorisation, payment, overlap/concurrency, refund, privacy, backup/restore, accessibility and operational acceptance tests on the completed commercial flows.
10. Rehearse supervised sessions before removing pilot/sample labels. Expand after measured reliability, repeat usage and variable-cost contribution satisfy agreed gates.

## Access and publishing

The website is intended for public browsing: visitors can explore the marketplace and pitch without signing in. Saving a request or viewing account activity still requires sign-in. Account records stay private to each signed-in user in the application; public site access does not remove API authorisation.

## Data handling

Application records include the signed-in site user ID/email, request type, input payload, status and timestamp. Cancellation/withdrawal changes status and retains the record. New records use one Supabase project across all locations. RLS is enabled and browser roles have no table access. Earlier D1 records remain readable through account-authorised routes. No identity documents, payment credentials, exact property addresses or bank account details are requested. Automatic email is not configured. Define the operator contact and retention/deletion workflow before inviting public data submissions.


## Map and station explorer update

The site now includes an interactive Google map with real station markers and satellite controls. Optional browser geolocation shows a captured position and accuracy; coordinates are sent in a POST body for nearby search, kept in page memory and excluded from the application database. The customer can clear or refresh the position. Google maps and directions receive coordinates only after the customer chooses location use.

Detailed station cards and the photo gallery require the private GOOGLE_PLACES_API_KEY and Google billing/API activation, which remain pending. The integration supports connector type, maximum kW, connector counts, opening hours, contact details, Google ratings, attributed Google photos and directions. Availability is labelled recent only for explicit counts updated within 15 minutes. Nearest recommendations apply to returned compatible stations with recent reported availability, not a guaranteed free charger. Driving distance and time are provided by Google directions; displayed card distances are straight-line estimates.

Google search and photo API calls share the global 100-request daily allowance. API data and photos are not persisted or cached by this app. Run scripts/check-stations.mjs to verify geographic validation, matching, stale availability, photo attribution and direction links.
