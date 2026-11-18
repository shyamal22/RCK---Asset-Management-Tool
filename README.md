# RCK Workshop & Maintenance App — Claude Code starter pack

1. Create an empty folder (or GitHub repo) and copy these files into it.
2. `git init` and commit.
3. Open the folder in Claude Code (`claude` in the terminal, or Claude Code on the web).
4. Paste `prompts/01-kickoff.md`. Claude reads the specs and builds Milestone 0, then stops.
5. For each next milestone paste `prompts/02-loop.md`, then `prompts/03-review.md`.
   Or run `./scripts/loop.sh 1` to do one milestone + review headless.
6. Answer anything under "Questions for Sam" in `docs/PROGRESS.md` before the next milestone.

You will need: a Supabase project (free tier is fine to start), a Vercel account,
Node 20+, pnpm, and later a Xero developer app (developer.xero.com).

## Running the app locally

Needs Node 20+, pnpm and Docker.

```bash
pnpm install
pnpm exec supabase start        # local Supabase (DB, auth, storage, mail catcher)
./scripts/ci-env.sh             # writes .env.local from the local stack
pnpm db:migrate && pnpm db:seed
pnpm dev                        # http://localhost:3000
```

Sign in as any seeded user (`director@rck.test`, `office@rck.test`, `workshop@rck.test`,
`supervisor@rck.test`, `crew@rck.test`), password `Workshop-Dev-2026`. Emailed codes
(sign-up, Director/Office new-device step, password reset) land in the local mail catcher at
http://127.0.0.1:54324.

Checks: `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`. CI runs all of them on every push.
