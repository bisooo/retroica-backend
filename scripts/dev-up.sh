#!/usr/bin/env bash
# Bring up the Retroica dev stack inside a Claude Code cloud session.
# Called from the Claude Code cloud environment setup script; also runnable by hand.
# Idempotent: safe to run on every session start. Local services only; never production data.
#
#   dev-up.sh            install deps, start Postgres + Redis, migrate, seed once, write env files
#   dev-up.sh --serve    same, then start backend (:9000), storefront (:3000) and admin (:3001) in the background
#
# Optional environment variables (set in the cloud environment settings; test/dev values only):
#   STRIPE_TEST_SECRET_KEY, STRIPE_TEST_PUBLISHABLE_KEY          Stripe test mode keys
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   copied from the admin's Vercel project
#   (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY are accepted instead of anon / service role)
#   POSTGRES_URL_NON_POOLING   Supabase Postgres, for running admin migrations
# Only point these at a Supabase with no production data you'd mind a dev session writing to.
set -euo pipefail

SB_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SB_ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}}"
SB_SERVICE="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SECRET_KEY:-}}"

ROOT="${RETROICA_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
BE="$ROOT/retroica-backend"; SF="$ROOT/retroica"; AD="$ROOT/retroica-admin"
LOGS="${RETROICA_LOGS:-/tmp/retroica-logs}"; mkdir -p "$LOGS"
DB_URL="postgres://retroica:retroica@localhost:5432/retroica_store"
log() { printf '\033[1m[dev-up]\033[0m %s\n' "$*"; }

# Guard: refuse live keys.
for v in STRIPE_TEST_SECRET_KEY STRIPE_TEST_PUBLISHABLE_KEY; do
  case "${!v:-}" in sk_live_*|pk_live_*|rk_live_*) echo "$v is a live key; refusing." >&2; exit 1;; esac
done

# 1. Postgres + Redis (system packages, no Docker: Docker Hub rate-limits the shared egress IP).
log "starting Postgres and Redis"
service postgresql start >/dev/null
service redis-server start >/dev/null 2>&1 || true
for _ in $(seq 1 30); do pg_isready -q && break; sleep 1; done
redis-cli ping >/dev/null
su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='retroica'\"" | grep -q 1 \
  || su postgres -c "psql -qc \"CREATE ROLE retroica LOGIN SUPERUSER PASSWORD 'retroica'\""
su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='retroica_store'\"" | grep -q 1 \
  || su postgres -c "createdb -O retroica retroica_store"

# 2. Dependencies (skipped when already installed).
[ -d "$BE/node_modules" ] || { log "npm ci (backend)";    (cd "$BE" && npm ci --no-audit --no-fund --loglevel=error); }
[ -d "$SF/node_modules" ] || { log "npm ci (storefront)"; (cd "$SF" && npm ci --no-audit --no-fund --loglevel=error); }
[ -d "$AD/node_modules" ] || { log "pnpm install (admin)"; (cd "$AD" && pnpm install --frozen-lockfile --silent); }

# 3. Backend env (dev-only values; .env is gitignored).
if [ ! -f "$BE/.env" ]; then
  log "writing retroica-backend/.env"
  cat > "$BE/.env" <<EOF
DATABASE_URL=$DB_URL
REDIS_URL=redis://localhost:6379
CACHE_REDIS_URL=redis://localhost:6379
MEDUSA_WORKER_MODE=shared
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000,http://localhost:3000
JWT_SECRET=dev-only-$(openssl rand -hex 8)
COOKIE_SECRET=dev-only-$(openssl rand -hex 8)
STRIPE_API_KEY=${STRIPE_TEST_SECRET_KEY:-sk_test_missing}
EOF
fi

# 4. Migrate, and seed once (seed needs the admin UI disabled or it looks for a production admin build).
log "medusa db:migrate"
(cd "$BE" && npx medusa db:migrate >"$LOGS/migrate.log" 2>&1)
if [ -z "$(psql -tAq "$DB_URL" -c "SELECT 1 FROM api_key WHERE type='publishable' LIMIT 1")" ]; then
  log "seeding (demo seed until the Retroica seed replaces it)"
  (cd "$BE" && DISABLE_MEDUSA_ADMIN=true npm run seed >"$LOGS/seed.log" 2>&1)
  (cd "$BE" && npx medusa user -e dev@retroica.local -p devpassword >>"$LOGS/seed.log" 2>&1) || true
fi
PK="$(psql -tAq "$DB_URL" -c "SELECT token FROM api_key WHERE type='publishable' ORDER BY created_at LIMIT 1")"

# 5. Storefront env.
log "writing retroica/.env.local"
cat > "$SF/.env.local" <<EOF
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$PK
NEXT_PUBLIC_STRIPE_KEY=${STRIPE_TEST_PUBLISHABLE_KEY:-pk_test_missing}
NEXT_PUBLIC_SUPABASE_URL=${SB_URL:-http://localhost:54321}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SB_ANON:-missing}
EOF

# 6. Admin env (only useful with a Supabase dev project; Etsy stays unset in the cloud).
if [ -n "$SB_URL" ]; then
  log "writing retroica-admin/.env.local"
  cat > "$AD/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SB_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SB_ANON
SUPABASE_SERVICE_ROLE_KEY=$SB_SERVICE
EOF
else
  log "NEXT_PUBLIC_SUPABASE_URL not set: admin and storefront reviews will not have a database"
fi

# 7. Optionally start the apps.
if [ "${1:-}" = "--serve" ]; then
  up() { curl -s -m 5 -o /dev/null "http://localhost:$1${2:-}"; }
  bg() { (cd "$1" && exec setsid nohup "${@:3}" >"$LOGS/$2.log" 2>&1 </dev/null) & }
  up 9000 /health || { log "starting backend :9000";   bg "$BE" backend npm run dev; }
  for _ in $(seq 1 90); do up 9000 /health && break; sleep 2; done
  up 3000 || { log "starting storefront :3000"; bg "$SF" storefront npm run dev; }
  for _ in $(seq 1 60); do up 3000 && break; sleep 2; done
  if [ -n "$SB_URL" ]; then
    up 3001 || { log "starting admin :3001"; bg "$AD" admin pnpm dev -p 3001; }
  fi
fi
log "ready. Logs in $LOGS. Medusa admin: http://localhost:9000/dashboard (dev@retroica.local / devpassword)"
