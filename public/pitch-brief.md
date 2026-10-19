# ChargeNeighbour
## Your neighbourhood. Fully charged.

Prepared 19 October 2026. This is a proposed business and pilot plan, not a statement of operating traction.

### The 45-second pitch

An EV charger can sit unused while another driver nearby needs a planned top-up. ChargeNeighbour aims to make those spare hours bookable. Drivers find a compatible neighbourhood charger, see the price, and request a time. Hosts confirm parking and entry, then earn from the energy delivered. We would start in Bengaluru with accessible Type 2 AC car chargers and a small, reviewed host network. The proposed model takes a 15% commission on completed sessions. Our first task is to prove that access is reliable, drivers return, and both the host and platform economics work.

### Customer and use case

The first customer is a Type 2 AC car driver planning a stop of a few hours near a visit, errand or work location. This is not an emergency or highway rapid-charging proposition. Hosts are owners of existing, safely installed chargers with permission to offer their parking space to visitors. Independent driveways and suitable small commercial sites reduce gate-access friction; apartment sites require documented permission.

### Why it is plausible — and what is unproven

- Tata Motors' 19 February 2025 release describes 7.2 kW home charger installations. Home hardware exists; that does not establish how many owners want to share it.
- The Government of India's 1 August 2025 release describes EV charging standards and the September 2024 charging-infrastructure guidelines. Specific sites still require local tariff, property access and technical review.
- Marketplace settlement tools exist, but provider eligibility and onboarding must be established. Razorpay Route currently publishes financial-turnover and payer-payee transparency requirements. Do not promise instant host payouts or assume Route access.
- Driver demand at the offered time, neighbourhood density, host response times, successful entry, accurate metering and contribution margin remain hypotheses.

### Proposed business model

Hosts set an agreed per-kWh rate. A proposed 15% commission is deducted from the session revenue. Final tax treatment, payment charges, any additional driver fees, refunds and settlement timing must be disclosed before commercial launch. The platform does not need to purchase charging hardware under this pilot assumption; acquisition, installation remediation, inspection, support and payment costs still exist.

Illustrative session, before tax:

| Item | Amount |
| --- | ---: |
| 10 kWh at ₹16/kWh | ₹160 |
| Platform revenue at 15% | ₹24 |
| Host proceeds after commission | ₹136 |
| Assumed electricity cost at ₹8/kWh | ₹80 |
| Host surplus before other costs | ₹56 |

Platform revenue is not profit. Payment fees, support, refunds, incentives, acquisition and operating costs must be deducted. ₹8/kWh is an assumption, not a verified Bengaluru tariff. Demand charges, losses, parking costs, maintenance, installation changes and taxes may materially change the outcome.

The website's monthly host estimate assumes 7.2 kW × booked hours/day × booked days/month × 90% energy factor. At two hours on twenty days: 259.2 kWh, ₹4,147.20 customer payments, ₹622.08 commission, ₹2,073.60 electricity, ₹1,451.52 host surplus before other costs and tax. Actual vehicle limits and energy delivery vary. No earnings are guaranteed.

### Pilot plan and proposed decision gates

Accept applications nationwide, then select a concentrated first cohort based on demand and accessible supply. Indiranagar, HSR Layout and Whitefield are possible Bengaluru pilot areas, not claimed live host coverage. Public station discovery is separate from the participating host network.

1. Interview at least 20 prospective hosts and 30 drivers before committing to density targets.
2. Target 20 approved, accessible hosts across the candidate areas; revise the geography if demand is too scattered.
3. Operate a supervised first cohort and record every request, host response, arrival, meter reading and completion.
4. Evaluate at least 100 paid sessions once commercial readiness is complete. These are targets, not results.
5. Proposed expansion gates: at least 95% successful entry among confirmed arrivals, at least 90% completed confirmed sessions, at least 25% driver repeat usage within 30 days, and non-negative session contribution after variable costs. Thresholds are management assumptions to validate; cohort size and measurement definitions must accompany reported results.

Host surplus, affordable acquisition, and useful booking density matter as much as registrations. Do not report sample requests or withdrawn interest as customers, live chargers or completed sessions.

### Differentiation to validate

The idea is not simply another charger map. The intended value is host-confirmed access, understandable connector information, useful bookable hours and metered session records at neighbourhood sites. Existing charging operators and sharing networks already serve parts of this market. The moat must be earned through local supply density, reliable operations and repeat usage; the basic idea is not proprietary.

### Current website capability

The public website supports real Google Maps location searches across India, host economics estimates, authenticated host applications and pilot interest, and private account activity with withdrawal. New applications use one Supabase database for all locations; historical Sites records remain with their original identities. The Vercel deployment uses Supabase email sign-in. Direct Google Places results are implemented but await billing and API activation. No commercial charging session, charger telemetry, payment, automatic email or host verification is active.

### A credible ask

“We are looking for founding charger hosts, neighbourhood community partners, and a pilot operations/payment partner. Help us test whether existing home chargers can provide reliable, bookable local access. We will share measured pilot results before expanding.”

Do not claim a funding valuation, guaranteed returns, approved payment partnership, insurance cover, national market size, signed hosts or live traction without evidence.

### Sources

- [Tata Motors, 19 February 2025](https://www.tatamotors.com/press-releases/tata-ev-celebrates-2-lakh-evs-on-the-road/)
- [Government of India — Standardization of EV Manufacturing and Charging, 1 August 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2151393&lang=2&reg=48)
- [Razorpay Route documentation and eligibility](https://razorpay.com/docs/payments/route/)

Sources reviewed 19 October 2026. References do not imply endorsement or partnership.


## Map and station explorer update

The site now includes an interactive Google map with real station markers and satellite controls. Optional browser geolocation shows a captured position and accuracy; coordinates are sent in a POST body for nearby search, kept in page memory and excluded from the application database. The customer can clear or refresh the position. Google maps and directions receive coordinates only after the customer chooses location use.

Detailed station cards and the photo gallery require the private GOOGLE_PLACES_API_KEY and Google billing/API activation, which remain pending. The integration supports connector type, maximum kW, connector counts, opening hours, contact details, Google ratings, attributed Google photos and directions. Availability is labelled recent only for explicit counts updated within 15 minutes. Nearest recommendations apply to returned compatible stations with recent reported availability, not a guaranteed free charger. Driving distance and time are provided by Google directions; displayed card distances are straight-line estimates.

Google search and photo API calls share the global 100-request daily allowance. API data and photos are not persisted or cached by this app. Run scripts/check-stations.mjs to verify geographic validation, matching, stale availability, photo attribution and direction links.
