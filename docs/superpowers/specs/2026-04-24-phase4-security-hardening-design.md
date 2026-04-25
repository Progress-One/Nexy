---
date: 2026-04-24
status: approved
phase: 4 of 4 (tests → Chrome (skipped) → Kysely → security hardening)
---

# Design: Phase 4 — Security Hardening Pre-Deploy

## Context

Phase 3 migrated the DB layer to Kysely and produced a deployable build. An external code review (recorded in conversation 2026-04-24) flagged a series of P0/P1 issues that make the current state **unsafe for production**:

- `/api/db` accepts table+filter+op from any client without auth/ownership checks
- `/api/admin/*` routes call `getCurrentUser()` but never check role; `/admin/*` pages aren't gated by middleware
- `JWT_SECRET || 'nexy-jwt-secret'` fallback in `lib/auth.ts` allows forgeable sessions if env missing
- Password hashing is unsalted SHA-256 (held over from Supabase-Auth migration)
- `isPremium = false` hardcode blocks proposal creation entirely
- `createClient()` from browser shim returns a new object every call → infinite re-render in components that put it in `useEffect` deps
- Several dead-code references (`/api/storage/upload`, `/api/storage/list` routes don't exist; legacy `/onboarding` analytics path is no longer in flow)

Most of these are **pre-existing** (Supabase migration era) but Phase 3 didn't audit security and shipped them forward. This spec closes those gaps before the DNS flip.

This is Phase 4 of stabilization:
1. ~~Phase 1: Pure-function unit tests~~ ✓
2. ~~Phase 2: Chrome E2E baseline~~ (skipped)
3. ~~Phase 3: Supabase shim → Kysely~~ ✓
4. **Phase 4: Security hardening (this spec)**

## Goals

- Close the open `/api/db` proxy entirely (no client can read/write arbitrary tables)
- Gate `/admin/*` pages and all `/api/admin/*` routes by an admin role check
- Eliminate weak-secret fallbacks (JWT) and weak password hashing (SHA-256)
- Fix the broken proposals flow so partners can actually create proposals
- Eliminate React re-render thrash from non-memoized client factories
- Remove dead route references that confuse and add false attack surface

After this phase: `nexy.life` is safe to deploy publicly.

## Non-Goals

- Comprehensive security audit (OWASP top 10 sweep, threat modeling, pen testing) — out of scope; this targets the specific findings.
- Rate limiting (separate concern; can ship after launch with Caddy rate-limit module).
- 2FA / passkeys (future enhancement).
- Switching back to Supabase Auth (deliberate: VPS + jose JWT is the chosen stack).
- Migrating client pages from generic `/api/db` to fully typed endpoints **beyond what's needed to remove `/api/db`** — i.e., we replace each existing call with a per-feature route, but we don't refactor every page's data layer top-to-bottom.

## Phasing

Three sub-phases. Each is independently shippable; landing 4a alone is already a meaningful improvement.

### Phase 4a — Emergency hardening (~3 hours)

**Critical fixes that take minimal time but block deploy.**

1. **JWT secret hardening** (`src/lib/auth.ts`)
   - Replace `process.env['JWT_SECRET'] || 'nexy-jwt-secret'` with `process.env['JWT_SECRET'] ?? throwError('Missing JWT_SECRET')`
   - Same fix in any other place the fallback exists (search: `'nexy-jwt-secret'`).

2. **Admin role check**
   - Add helper `isAdmin(user: CurrentUser | null): boolean` in `src/lib/auth.ts` reading `process.env['ADMIN_EMAILS']` (comma-separated list).
   - Add `requireAdmin()` helper that returns 401/403 if not admin.
   - Apply `requireAdmin()` to every route under `src/app/api/admin/**`.
   - Add `/admin` to the matcher in `src/lib/http-client/middleware.ts` so unauthenticated users redirect to `/login`. Inside admin pages, use a server component that calls `getCurrentUser()` + `isAdmin()` and redirects non-admins to `/`.

3. **Password hashing → argon2id**
   - `npm install argon2` (native binding for Node).
   - In `src/app/api/auth/signup/route.ts`: replace `crypto.subtle.digest('SHA-256', ...)` with `argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })`.
   - In `src/app/api/auth/login/route.ts`: detect format by hash prefix:
     - `$argon2id$...` → `argon2.verify(stored, password)`
     - else (legacy SHA-256 hex) → compare digest, on success rewrite as argon2 (lazy migration).
   - Document the migration window: any user who logs in once gets re-hashed; remaining SHA-256 users keep working until they log in.

### Phase 4b — Close `/api/db` (~1 day)

**Replace generic DB proxy with typed per-feature endpoints.**

1. **Inventory current `/api/db` consumers.**
   Grep for `from('` calls in client code (`src/app/(app)/**`, `src/app/(auth)/**`, `src/components/**`, `src/hooks/**`). Each unique pattern = one new API route.

2. **Create per-feature API routes.** For each consumer, write a typed route handler at `src/app/api/<feature>/<action>/route.ts` that:
   - Calls `getCurrentUser()`; returns 401 if missing
   - Performs the specific DB op via Kysely
   - Enforces ownership: queries scoped by `user_id = current_user.id` where applicable
   - Returns shaped JSON (not raw row dump)

3. **Migrate client callers.** Replace each `supabase.from('x').select(...)` with `fetch('/api/<feature>/<action>')`.

4. **Delete `/api/db`.**
   - `git rm src/app/api/db/route.ts`
   - In `src/lib/http-client/client.ts`: remove `BrowserQueryBuilder` class entirely. Replace with thin wrappers that hit the new typed endpoints, OR delete the `.from()` method and require callers to use API routes directly. Recommend: delete `.from()` to force discipline.
   - `auth` and `storage` blocks in client.ts stay (they already proxy to specific routes).

5. **Verify:** `grep -rn "supabase\.from\|createClient.*\.from" src/app src/components src/hooks` → 0 hits in client code.

### Phase 4c — Quality cleanup (~3 hours)

**Smaller fixes that ship the product to its actual functional spec.**

1. **`isPremium` for proposals** (`src/app/(app)/partners/[partnerId]/propose/page.tsx`)
   - Replace `isPremium = false` hardcode with read from `subscriptions` table via new `/api/subscription/status` route.
   - Cache result in component state; refresh on mount.

2. **`createClient()` memoization**
   - Replace `createClient()` with a module-level singleton: in `src/lib/http-client/client.ts`, add `let _client: ReturnType<typeof _createClient> | null = null; export function createClient() { return _client ??= _createClient(); }`.
   - This makes useEffect deps stable; no need to wrap in useMemo at every call site.
   - If a test ever needs a fresh client, expose `__resetClientForTests()` (test-only).

3. **Remove dead storage routes**
   - In `src/lib/http-client/client.ts`: delete the `storage.list(...)` stub and `storage.from().upload(...)` if `/api/storage/upload` doesn't exist.
   - Or: create stubs that return a clear error. Goal is no false API surface.
   - Audit: `grep -rn "storage\.\(list\|upload\)" src/` — replace each with explicit "not implemented" or proper API call if endpoint will be added.

4. **Deprecate legacy onboarding analytics path**
   - File `src/app/(app)/onboarding/page.tsx` still emits `EVENTS.ONBOARDING_*` but actual onboarding lives in `/discover`. Move analytics events into `useDiscovery` at the relevant stage transitions.
   - Or: if the legacy `/onboarding` page is unused, delete it and remove its EVENTS imports. Decide based on whether the page is currently linked from anywhere.

5. **Connect `generateQuestion()` (deferred — flagged for clarity, not in 4c)**
   - The AI question generator in `src/lib/ai.ts` has an exported `generateQuestion()` that's never called.
   - **Decision: out of Phase 4 scope.** This is a feature gap, not a security issue. Track separately. CLAUDE.md still lists it as P0 for current-stage scope.

## Architecture & Components

### New files

- `src/lib/auth.ts` — extended with `isAdmin`, `requireAdmin` helpers
- `src/app/api/subscription/status/route.ts` — used by proposals page
- `src/app/api/<feature>/...` — N new typed routes (count determined by Phase 4b inventory)

### Modified files

- `src/lib/auth.ts` — JWT secret throw, admin helpers
- `src/lib/http-client/client.ts` — singleton, drop `.from()`, audit storage stubs
- `src/lib/http-client/middleware.ts` — add `/admin` to matcher
- `src/app/api/auth/signup/route.ts` — argon2id
- `src/app/api/auth/login/route.ts` — argon2id + lazy SHA-256 migration
- `src/app/api/admin/**/route.ts` — `requireAdmin` at top of each handler
- `src/app/admin/**/page.tsx` — server-side admin gate
- `src/app/(app)/partners/[partnerId]/propose/page.tsx` — real isPremium
- `src/hooks/useDiscovery.ts` — relocated analytics events (if Phase 4c #4 picks "move not delete")

### Deleted files

- `src/app/api/db/route.ts` (after 4b)

### Dependencies added

- `argon2` (native binding via N-API)

No other dependency churn.

## Data Flow Examples

**Before (4b):**
```
useDiscovery
  → supabase.from('tag_preferences').select('*').eq('user_id', userId)
  → BrowserQueryBuilder serializes to JSON
  → POST /api/db?table=tag_preferences&filters=[...]
  → /api/db handler runs query (NO AUTH CHECK)
  → returns data to client
```

**After (4b):**
```
useDiscovery
  → fetch('/api/discovery/tag-preferences')  (existing route from Task 14 in Phase 3)
  → handler: getCurrentUser() → 401 if missing
  → db.selectFrom('tag_preferences').where('user_id', '=', user.id).execute()
  → returns shaped JSON
```

The user's own data is the only thing they can read. Privacy-first restored.

## Testing Strategy

- **Unit tests for new helpers:**
  - `isAdmin(user)` — empty env, single email, multiple, mixed case, etc.
  - Argon2 hash/verify roundtrip
  - Legacy-SHA256 detection logic
- **Integration smoke (manual via curl):**
  - `GET /api/db` → expect 410 Gone or 404 (after deletion)
  - `GET /api/admin/users` without auth → 401
  - `GET /api/admin/users` with regular-user JWT → 403
  - `GET /api/admin/users` with admin JWT → 200
  - Login with legacy SHA-256 hash → success + DB row's `password_hash` now starts with `$argon2id$`
- **Build + tsc:** must pass.
- **Existing 146 unit tests:** must remain green.

No new comprehensive E2E suite in this phase. Manual smoke per critical flow before DNS flip.

## Success Criteria

- [ ] `JWT_SECRET` missing → process throws on first request, no fallback session creation
- [ ] `grep -rn "supabase\.from" src/app src/components src/hooks` returns 0 hits
- [ ] `src/app/api/db/route.ts` does not exist (or returns HTTP 410 Gone)
- [ ] `/api/admin/users` with non-admin token returns 403
- [ ] `/admin` page with non-admin user redirects to `/`
- [ ] New signups produce `$argon2id$...` hash in DB
- [ ] Existing user with legacy SHA-256 hash can log in successfully; their hash gets rewritten on success
- [ ] Proposals page on Premium subscription renders the propose form (no paywall)
- [ ] `npm test` → 146+ passing
- [ ] `npm run build` → green

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| argon2 native binding doesn't build on alpine in Docker | Test build in container before commit; use `node-bcrypt` as fallback if alpine compatibility fails |
| Killing `/api/db` breaks unmigrated client calls discovered late | Phase 4b step 1 is full inventory before any deletion; final grep check before merging |
| Lazy SHA-256 migration leaves users in mixed state forever | Acceptable — `password_hash` column type stays `text`; both formats coexist until users log in. Track count of legacy hashes; force reset after N days if needed (out of scope here). |
| Admin email list drift (someone needs admin access, not configured) | Document `ADMIN_EMAILS` in CLAUDE.md and `.env.example`; first-deploy checklist includes adding the operator email |
| `requireAdmin` added to admin routes but missed somewhere | Add a global lint check / grep verification: every file under `src/app/api/admin/**/route.ts` must contain `requireAdmin(`. Verify in final pass. |

## Out-of-Scope Findings (tracked for follow-up)

These were flagged in the code review but defer:

- **Date Night `single()` returns array, not object** — symptom of /api/db shim quirk. Will be naturally fixed when /api/db dies in 4b and the page migrates to a typed endpoint that returns a single object.
- **`scenes(*)` join select unsupported** — same: dies with /api/db.
- **Invite expires_at not checked at accept time** — `partnerships.expires_at` column doesn't exist in DB anyway. Either add the column + check, or remove all expiry logic. Pick one in a separate ticket.
- **Onboarding analytics on legacy flow** — see 4c #4. May or may not be addressed depending on inventory.
- **`generateQuestion()` not wired** — feature gap, not security. CLAUDE.md tracks as P0 for product, not for deploy.

## Commit Strategy

- Per-issue commits within each sub-phase
- Phase boundary commit (e.g., `chore(security): phase 4a emergency hardening complete`)
- No squashing
- Final commit when /api/db deleted: `feat(security): close /api/db privacy gap`

## Open Questions

None. Scope, approach, and phasing all approved.
