#!/usr/bin/env bash
# Writes .env.local from the running local Supabase stack (used in CI).
set -euo pipefail
eval "$(pnpm exec supabase status -o env 2>/dev/null)"
cat > .env.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}
SUPABASE_SECRET_KEY=${SECRET_KEY}
DATABASE_URL=${DB_URL}
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV
cp .env.local .env
echo "wrote .env.local"
