# Repository workflow

This repository is the canonical Vercel version of ChargeNeighbour. Keep application updates here and keep the README feature-status table accurate. Do not copy Sites-specific Cloudflare bindings or identity-header authentication into this app.

Validate relevant changes with TypeScript, the station checks and a production build. Before committing, verify that ignored environment files and runtime credentials are excluded. Preserve the existing main history; never force push. Push user-authorised website changes to the connected repository so Vercel can publish them.

Account ownership must come from verified Supabase identity. Never match historical users or grant access by email alone. Keep all database server keys and Google server keys out of browser code and source control.
