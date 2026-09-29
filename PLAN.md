# PLAN.md — retroica-backend (Medusa)
Lean status doc; full history is in HISTORY.md.

## Current status
Proof of concept, not live for orders. Target role: one sales channel fed from `retroica-admin` (the master catalog). Medusa 2.10.1 on Railway with Postgres and Redis (event bus + cache module). Stripe payments with automatic payment methods (Apple Pay / Google Pay). Custom fulfillment provider `my-fulfillment` prices shipping by destination region and the largest item size (small/medium/large, bumped up by total weight), plus a flat surcharge when there is more than one item. Admin extension page "Update Currency Prices" runs a workflow that rewrites every variant's prices from EUR using typed-in rates (AUD, CAD, CZK, GBP, USD).
Last code change: 2025-12-05 (Railway builder config).

## Data model
Medusa core. Product `metadata.shipping_size` and `product.weight` (grams) drive shipping. Regions, shipping options and currencies exist only in the production DB.

## Auth / access control summary
Medusa admin users (at `/dashboard`). Store API behind a publishable key. Custom routes: `POST /admin/workflows/update-currency-prices` (admin-authenticated by Medusa's `/admin` prefix), plus two starter `custom` routes that do nothing.

## Open/Next
- [ ] Change the currency workflow and admin page base from EUR to CZK.
- [ ] Define how admin products arrive in Medusa (admin pushes via the Medusa admin API, keyed by admin product id in `metadata`) and how Medusa orders flow back.
- [ ] Compute shipping size/weight from cart items server-side; ignore client `data`.
- [ ] Remove `"supersecret"` fallbacks for JWT/cookie secrets.
- [ ] Replace the demo `seed.ts` with a script that recreates Retroica's regions, currencies, shipping options and sales channel.
- [ ] Currency workflow: confirm whole-unit rounding (`Math.round`) is intended, keep non-currency price rules, log the rates used.
- [ ] Decide whether shipping rates should differ per currency.
- [ ] Fix `docker-compose.yml` env names (`CORS_ORIGIN`/`MEDUSA_ADMIN_CORS` vs `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS`) and `start-dev.sh` admin path.
- [ ] Confirm `railyway.toml` vs `railway.toml` on Railway.
- [ ] Delete the starter `src/api/*/custom` routes.
- [ ] Unit tests for `calculatePrice` (each region, size bump by weight, multi-item surcharge) and the currency workflow.

## Future ideas
- Auto-fetch exchange rates on a schedule (Medusa scheduled job).
- Carrier labels on `createFulfillment` (currently a no-op).
- Webhook to the storefront and admin when an item sells.

## Environment notes
- Local: `docker compose up`; the backend container mounts the repo and runs `npm run dev`.
- Medusa admin is at `/dashboard`.

## Deployment
Railway, nixpacks, build = `npm run build && cd .medusa/server && npm ci --omit=dev`. Migrations run in `predeploy`.

## Verification plan
Integration tests via `@medusajs/test-utils` against a throwaway DB; manual check of shipping options on a test cart per region.
