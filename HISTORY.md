# HISTORY.md — retroica-backend
Append-only. One section per session, newest at the bottom. Never rewrite past entries.

## Pre-history (2025-09-07 to 2025-12-05), reconstructed from git log on 2026-09-29
Reconstructed from commit messages only; "verified" is unknown for all of it.
- 2025-09-07/08: Medusa v2 starter, docker-compose (Postgres + Redis), first Railway deploy.
- 2025-11-02: Redis cache module.
- 2025-11-16: Stripe payment provider, custom fulfillment provider, EUR-to-other-currencies price workflow and admin page. Several Dockerfile/package reverts the same day.
- 2025-11-23: shipping calculator fix (paired with the storefront fix).
- 2025-12-03/05: about fifteen commits switching the Railway build between Docker, Railpack and Nixpacks; settled on Nixpacks with `railyway.toml`. Why Docker and Railpack were dropped is not recorded; worth one line here if B remembers.
