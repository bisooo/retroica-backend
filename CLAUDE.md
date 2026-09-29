# CLAUDE.md — retroica-backend (Medusa)

Medusa 2.10.1 commerce backend for the Retroica storefront. Proof of concept, not live for orders. In the target design Medusa is one sales channel fed by `retroica-admin`, which is the master catalog. Postgres + Redis, Stripe payment provider, a custom fulfillment provider for shipping rates, and an admin workflow that converts EUR prices to other currencies.
Cross-repo map and decisions: `retroica-admin/docs/SYSTEM.md`. Status and roadmap: `PLAN.md`. Session log: `HISTORY.md`.

## Hard rules: do not violate these while moving fast
1. **Shipping is computed from the cart, not from client data.** `calculatePrice` in `src/modules/my-fulfillment/service.ts` must derive size and weight from the cart's items (product metadata and weight) in `context`, never from the `data` the storefront sends. It currently reads `data.shipping_size` and `data.weight`; that is the first fix.
2. **CZK is the business base currency.** The `update-currency-prices` workflow and its admin page still use EUR as the base; switching to CZK is on the plan. Other currencies are always derived, never hand-edited, and running the workflow overwrites every variant's price list.
2a. **Products come from the admin.** Once the admin sync exists, don't create or edit products in the Medusa admin; changes go through `retroica-admin` so the two can't drift.
3. **No default secrets in production.** `medusa-config.ts` falls back to `"supersecret"` for `JWT_SECRET` and `COOKIE_SECRET`; production must fail to boot without them.
4. **Store config belongs in code.** Regions, shipping options, currencies and the sales channel must be reproducible from a script in this repo, not only from clicks in the admin. Any change made in the Medusa admin gets mirrored into the seed/config script in the same session.
5. **One-of-a-kind stock.** Every variant has inventory 1 with inventory management on. Don't enable backorders.
6. **Production database is off limits from cloud sessions.** Use the local docker-compose stack for anything that writes.

## Commands
- Local stack: `docker compose up` (Postgres 17 + Redis + backend on :9000). `start-dev.sh` also starts the storefront from `../retroica`.
- `npm run dev`, `npm run build`, `npm run seed` (still the Medusa demo seed; to be replaced)
- Tests: `npm run test:integration:http` (only the starter health check exists), `test:unit`, `test:integration:modules`.
- Medusa admin UI is served at `/dashboard` (not `/app`; `start-dev.sh` prints the old path).

## Framework notes
- Medusa v2 amounts are in major units (24.99, not 2499).
- Fulfillment provider id `my-fulfillment`, option id `standard-shipping`. Rates are in `prices.ts` per shipping region, with country-to-region mapping in `countries.ts`. The same number is charged whatever the cart currency is (to confirm with B).
- Check the installed Medusa docs for 2.10 before using workflow or module APIs; the storefront's `@medusajs/js-sdk` is on ^2.11, so keep an eye on version skew.

## Deployment
Railway, nixpacks builder. Config file is committed as `railyway.toml` (typo: Railway looks for `railway.toml` unless a custom path is set in the service settings; confirm which one is live before editing it). `predeploy` runs `medusa db:migrate`.

## Git
- Commit as B: author and committer `Basel <baselsamy1999@gmail.com>`. No Claude author, no `Co-Authored-By` or "Generated with Claude Code" trailers.
- No branches or PRs. Push small commits straight to `main` once the work is planned, reviewed and verified. Rebase onto `origin/main` first.
- One-line imperative commit messages under ~60 chars.
- Pushing `main` may deploy to Railway.
