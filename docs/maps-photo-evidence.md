# In-site routes, Google content and host evidence

## Driving distance and map

The customer map stays inside ChargeNeighbour. The OpenStreetMap/Leaflet view displays the exact station markers used by the sidebar. A GPS search requests OSRM road distances/durations, then a selected station can display its road geometry and instructions. Sidebar and detailed metrics come from the same provider. The Bengaluru public-landmark acceptance check returned 2,443.1 metres and 208.4 seconds from both the matrix and route endpoint; the former straight-line value was about 766 metres.

Distances/times exclude live traffic. This is a route preview, not a certified turn-by-turn navigation service. It cannot guarantee entry, road conditions or arrival time. GPS remains a captured position; refresh after moving. Unavailable routes never fall back to an unlabeled straight-line value.

The FOSSGIS public OSRM service is limited to one upstream call per second across the app, 150 calls per UTC day, and 12 route requests per client per ten minutes. Requests use identifiable app headers and attribution. No routes or GPS are cached in the application database. Leaflet uses only currently viewed tiles and the browser's normal HTTP cache. Before wider advertising, use an appropriately provisioned routing/tile service; the shared pilot services provide no SLA. Configure `OSRM_BASE_URL` and `MAP_TILES_URL` when changing providers, retaining required attribution. Review [OSRM usage/privacy](https://routing.openstreetmap.de/about.html) and [tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Google activation

Google billing remains an owner/provider dependency. Enable Places API (New), Maps JavaScript API and Routes API in the existing ChargeNeighbour Maps project. Use an API-restricted private `GOOGLE_PLACES_API_KEY`, a separate API-restricted private `GOOGLE_ROUTES_API_KEY`, a referrer-restricted `GOOGLE_MAPS_BROWSER_KEY`, and an actual `GOOGLE_MAPS_ID`. Never place either private key in client code.

The app uses Google station search only with Google map configuration. Google routes are drawn on that Google map. Photos and review text come only from an exact Google place; an OpenStreetMap name is never silently matched to a different business. The gallery preserves author attribution. The API supplies a limited review sample (up to five here), not the full Google review archive. Empty ratings/specification cards are omitted. Google content is not stored as a permanent copy. Search, detail, photos and route requests share the existing 100-call daily Google allowance; route matrices may be billed by origin/destination element. Review costs before activating keys.

## Host photo and GPS

Migration `20261020051626_host_photo_gps_evidence.sql` was applied through the dashboard SQL editor, alongside the previous manual migrations. Reconcile CLI history before `db push`.

New host applications require one privately stored photo plus a fresh on-site browser GPS capture with reported accuracy within 100 m. The client resizes the photo; the server actually decodes a supported still image, caps pixel count, re-encodes JPEG and strips embedded metadata. Maximum stored upload is 3 MB. Host GPS capture is accepted within two minutes of upload. Evidence is tied to the verified Supabase UUID; authenticated clients cannot create or alter evidence metadata. Database triggers require owned evidence, fresh enough for submission, and prevent using one evidence record for multiple host applications. The form requests explicit private-storage consent.

This is self-reported evidence, not proof of physical presence, ownership, power delivery or electrical safety. GPS can be inaccurate or spoofed. Operators must inspect the photo/site, reconcile the listing point with the GPS evidence and complete every existing verification check. Legacy applications without evidence must provide it before approval. No host is automatically approved.

The `chargeneighbour-host-proof` bucket is private with JPEG-only/3 MB restrictions. No direct public object policy is created. Only a verified owner or trusted operator can request a five-minute signed review URL. The URL grants temporary access to anyone holding it. Precise GPS and private photos are not automatically published on host listings. Approved public listing photos require their own permission and suitable public URLs.

Daily cleanup removes unlinked evidence/files after two days. Evidence linked to a reviewed application is preserved; after normal withdrawn-application removal, an ensuing cleanup removes its orphaned photo. The encrypted application snapshot includes evidence metadata, but Storage bytes require provider backups. Cleanup processes a bounded 100 old evidence records per run; review the backlog as volume grows.

## Verification

Run the existing CI plus `node scripts/check-evidence-routes.mjs`. The database test covers evidence ownership, denied metadata forgery, missing-evidence rejection, successful owned submission and encrypted metadata restoration. `scripts/check-evidence-storage.mjs` uses approved private environment/hidden stdin to test a synthetic image, deny public access, retrieve a short-lived signed image, and remove only its own test object. It does not read customer records. Actual camera/GPS capture, real operator approval and Google billing acceptance still need the corresponding consenting user/provider setup.
