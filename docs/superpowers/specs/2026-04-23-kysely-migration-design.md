---
date: 2026-04-23
status: approved
phase: 3 of 3 (tests → Chrome baseline (skipped) → Kysely migration)
---

# Design: Migrate Server Supabase Shim to Kysely

## Context

Nexy moved from Supabase to VPS PostgreSQL. The migration left a **compat-shim** at `src/lib/supabase/` that emulates the Supabase API on top of `pg.Pool`:

- `src/lib/supabase/server.ts` — async `createClient()` returning `{ from, rpc, auth, storage }`
- `src/lib/supabase/pg-query-builder.ts` — `QueryBuilder` class (~185 LOC) emulating `.from().select().eq()...`
- `src/lib/supabase/client.ts` — browser HTTP wrapper, calls `/api/db`, `/api/auth/*`, `/api/storage/*`
- `src/lib/supabase/compat-types.ts` — `SupabaseClient` type alias so consumers keep working
- `src/lib/supabase/middleware.ts` — Next.js middleware adapter (auth session check)

The shim is **incomplete and drifting**:
- 150 TypeScript errors in production code (`npx tsc --noEmit`)
- ~74 errors are missing `await` on `createClient()` (it was made async)
- ~15 errors are shim methods not implemented (`.overlaps`, `.or`, `.not`, `.contains`, `.range`)
- Rest are miscellaneous type-shape issues (unknown `variants` on rows, `storage.list` missing, etc.)

`npm run build` fails. `sync/april-2026` branch cannot currently deploy to Vercel (would fail type-check). Broken since commit `5d0df70` ("Discovery v1 complete implementation") when the shim gained new consumers without being extended.

This spec covers **Phase 3** of a three-phase stabilization project. Phase 1 (pure-function unit tests) is complete. Phase 2 (Chrome E2E baseline) was skipped by agreement — this migration produces its own verification via the type system and tests.

## Goals

- Replace the server-side shim (`server.ts` + `pg-query-builder.ts`) with Kysely-backed data access
- Fix all 74 missing-`await` bugs incidentally via the migration
- Fill the client-shim method gaps so the browser code type-checks
- `npm run build` passes (zero type errors) at the end
- All Phase 1 tests still pass (our tests are type-independent, should survive)
- Types auto-generated from real DB schema via `kysely-codegen` — no hand-maintained DB type duplication

## Non-Goals

- Client-side refactor — `src/lib/supabase/client.ts` stays as the HTTP wrapper, just gets the missing method stubs. Migrating client pages to typed per-feature API endpoints is a separate future project.
- Generic `/api/db` endpoint removal — it remains the client's gateway. (Long-term it's a security concern; not in scope here.)
- Auth routes rework — `/api/auth/*` + jose-based JWT stays as-is, working correctly.
- Storage rework — `/api/storage/*` + S3/MinIO integration unchanged.
- Database schema changes — none.
- Adding tests for migrated async functions — the Phase 1 boundary holds: pure functions covered, DB-touching functions validated via build + manual runtime checks + the existing API route behaviors.

## Architecture

### Target layout

```
src/lib/db/
  index.ts          — Kysely instance export (`db`) + Pool singleton
  schema.ts         — auto-generated types via kysely-codegen (DO NOT hand-edit)
  helpers.ts        — small reusable query helpers (pagination, exists check, etc.) — only if needed
```

Consumers import `{ db }` from `@/lib/db` and use Kysely's fluent API directly:

```ts
const scenes = await db
  .selectFrom('scenes')
  .select(['id', 'slug', 'title'])
  .where('gender_target', '=', gender)
  .where('active', '=', true)
  .orderBy('priority')
  .limit(20)
  .execute();
```

### Connection management

Single `pg.Pool` singleton shared across the Kysely instance. Lives for the lifetime of the Node process. `src/lib/db/index.ts` exports the `db` object; no per-request creation.

The existing pool config (from `src/lib/supabase/server.ts`) moves verbatim. Same `DATABASE_URL`, same connection pool sizing, same SSL config.

### Client side

`src/lib/supabase/client.ts` (the HTTP wrapper) stays at its current path and function. The `BrowserQueryBuilder` class gets extended with the missing methods:
- `.overlaps(col, arr)` — array overlap
- `.or(conditions)` — OR filter (currently a no-op)
- `.not(col, op, val)` — negation
- `.contains(col, obj)` — JSONB contains
- `.range(from, to)` — offset/limit pagination

The server-side `/api/db` endpoint is updated to translate these new filter operators into Kysely queries.

### What stays, what goes

**Stays:**
- `src/lib/supabase/client.ts` — client HTTP wrapper
- `src/lib/supabase/middleware.ts` — Next.js session middleware
- `src/lib/supabase/compat-types.ts` — type alias, temporary during migration

**Goes at the end:**
- `src/lib/supabase/server.ts`
- `src/lib/supabase/pg-query-builder.ts`
- `src/lib/supabase/compat-types.ts` (once all consumers use Kysely directly)

**Renamed at the end:**
- `src/lib/supabase/` → `src/lib/legacy-client/` or just `src/lib/http-client/` (reflecting that it's just the browser HTTP wrapper, not Supabase)

### `/api/db` endpoint

Currently backed by the server shim's `pg-query-builder.ts`. Will be rewritten to translate the incoming JSON query DSL directly into Kysely queries. Same input/output contract — client code keeps working.

## Migration Phases

Numbered sub-phases within Phase 3. Each is independently verifiable.

### 3.1 — Infrastructure (~half day)

- `npm install kysely --save`
- `npm install kysely-codegen --save-dev`
- Generate DB types: `npx kysely-codegen --out-file src/lib/db/schema.ts --dialect postgres --url "$DATABASE_URL"`
- Create `src/lib/db/index.ts` with:
  - `pg.Pool` singleton (same config as current server shim)
  - `Kysely<DB>` instance
  - Export `{ db, pool }`
- Add npm script: `"db:types": "kysely-codegen --out-file src/lib/db/schema.ts --dialect postgres --url $DATABASE_URL"`
- Document in CLAUDE.md that `db:types` must be run after DB schema changes

**Verify:** `import { db } from '@/lib/db'` in a scratch test file — `db.selectFrom('scenes')` typechecks against generated schema.

### 3.2 — `lib/` async functions (~1 day)

Migrate the ~20 async DB-touching functions inside `src/lib/*.ts` to use Kysely directly.

Files affected:
- `tag-preferences.ts` (entire module — 3 async functions)
- `scene-progression.ts` (7 async functions: `getAnsweredElementIds`, `getAnsweredTagRefs`, `getSceneResponseInterests`, `getUserComfortLevel`, `getSeenCategories`, `calculateSceneScore`, `getAdaptiveScenes`)
- `onboarding-gates.ts` (2 async: `fetchUserGates`, `fetchUserGatesDetailed`)
- `body-map-processing.ts` (1 async: `processBodyMapToGatesAndTags`)
- `profile-signals.ts` (3 async: `updatePsychologicalProfile`, `addFollowUpSignal`, `getPsychologicalProfile`)
- `partner-archetypes.ts` (2 async: `calculatePartnerArchetypes`, `getAverageIntensity`)

**Left as-is (they use the client HTTP shim, not server):**
- `proposals.client.ts`, `scenes.client.ts` — import from `@/lib/supabase/client.ts` (HTTP wrapper). These are browser-side code calling `/api/db` → they are consumers of the client shim, which stays in Phase 3.

Each function stops taking `SupabaseClient` as first argument. It imports `{ db }` from `@/lib/db` directly.

Signature change example:

```ts
// before
export async function fetchUserGates(supabase: SupabaseClient, userId: string): Promise<OnboardingGates>

// after
export async function fetchUserGates(userId: string): Promise<OnboardingGates>
```

Callers at API-route level are updated in 3.3. Callers in tests are N/A (Phase 1 only tested pure functions).

**Verify after each file:** `npx tsc --noEmit` error count strictly decreases.

### 3.3 — API routes (~1 day)

Migrate `src/app/api/**/*.ts` to use Kysely directly. Replace `const supabase = await createClient()` + `supabase.from(...)` with direct `db.selectFrom(...)` calls.

This is where the 74 missing-`await` bugs auto-resolve — the consuming code no longer calls `createClient()`, it imports `db` synchronously.

Order within 3.3 (lowest risk first):
1. Read-only routes first: `/api/admin/analytics`, `/api/admin/users`, `/api/admin/gate-hierarchy`
2. Single-table write routes: `/api/wishlist`, `/api/exclusions`
3. Multi-table write routes: `/api/invite/*`, `/api/partner-chat/*`
4. Complex flows: `/api/ai/*`, `/api/stripe/*`, `/api/discovery`

Each route commit reduces `tsc` error count and is independently revertable.

**Verify after each route:** tsc errors decrease; if the route has a test, it passes; manual smoke if touched by UI.

### 3.4 — Client shim completion (~half day)

In `src/lib/supabase/client.ts`, extend `BrowserQueryBuilder` with the missing methods. These just push into `this.filters` and are serialized over HTTP to `/api/db`:

```ts
overlaps(col: string, vals: unknown[]) { this.filters.push({ col, op: 'overlaps', val: vals }); return this; }
or(conditions: string) { this.filters.push({ col: '__or', op: 'or', val: conditions }); return this; }
not(col: string, op: string, val: unknown) { this.filters.push({ col, op: `not_${op}`, val }); return this; }
contains(col: string, obj: unknown) { this.filters.push({ col, op: 'contains', val: obj }); return this; }
range(from: number, to: number) { this.filters.push({ col: '__range', op: 'range', val: [from, to] }); return this; }
```

In `src/app/api/db/route.ts` (the generic client-DB endpoint), translate these filter ops into Kysely calls. Example:

```ts
case 'overlaps': qb = qb.where(col, '&&', val); break;
case 'contains': qb = qb.where(col, '@>', val); break;
// etc.
```

**Verify:** all remaining tsc errors in `src/app/(app)/**` resolve. `/api/db` integration still works.

### 3.5 — Remove server shim (~half day)

- Delete `src/lib/supabase/server.ts`
- Delete `src/lib/supabase/pg-query-builder.ts`
- Delete `src/lib/supabase/compat-types.ts`
- Update imports across the tree if anything still references those files
- Rename `src/lib/supabase/` → `src/lib/http-client/` (more honest — it's the browser HTTP wrapper, not Supabase)
- Update `client.ts` imports in consumers
- Update `middleware.ts` path if needed

**Verify:** `grep -r "from ['\"]@/lib/supabase" src/` returns zero. `npm run build` passes. All Phase 1 tests still pass.

### 3.6 — Final validation

- `npm run build` — zero errors
- `npm run lint` — no new errors beyond pre-existing production-code warnings (the shim removal may clean some up)
- `npm test` — 146 tests still pass (Phase 1 coverage is type-independent and targets pure functions; migration doesn't touch them)
- Update `CLAUDE.md`:
  - Remove "Backend: Supabase" line (it was a lie)
  - Add "Backend: VPS PostgreSQL + Kysely + jose JWT"
  - Add note about `db:types` codegen script
- Commit CLAUDE.md change

## Testing Strategy

Phase 1 tests cover pure functions. They have zero DB dependency — they don't import from `src/lib/supabase/` or `src/lib/db/`. They survive this migration unchanged.

For async/DB-touching code, the migration's type system is the primary safety net:
- Kysely fails to compile if a column doesn't exist in the generated schema
- Kysely fails to compile if a `.where()` clause uses the wrong type
- This catches 95% of mistakes at build time, before runtime

For the remaining 5% (runtime-only concerns like transaction isolation, N+1 queries), post-migration manual smoke via `npm run dev` is acceptable. No new automated test suite in this phase.

**Regression detection:** `git bisect` works cleanly because each 3.2/3.3 file migration is a self-contained commit.

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Kysely-generated types don't match actual DB (stale schema, case sensitivity) | Medium | Regenerate types at start; document codegen script in CLAUDE.md |
| Existing raw SQL in `/api/db` relies on behaviors Kysely handles differently (e.g., `.or()` no-op) | Medium | Audit all `.from()` calls in a client page; ensure new implementations preserve semantics |
| `pg.Pool` misconfiguration → connection leaks | Low | Reuse exact config from current `server.ts` |
| Silently broken query: compiles but returns wrong data | Low-Medium | Manual smoke on touched pages; Phase 1 tests catch pure-logic regressions |
| 74 `await` additions accidentally change control flow | Low | Each commit one file, `git diff` review before merging |
| Kysely learning curve slows work | Low | API is SQL-shaped; 10-min ramp per new function pattern |
| Migration takes longer than 3 days | Medium | Acceptable — each sub-phase is self-contained; stoppable at 3.2, 3.3, or 3.4 |

## Success Criteria

- [x] `npm run build` passes (zero type errors)
- [x] `npm test` passes (146 tests)
- [x] `grep -r "from ['\"]@/lib/supabase" src/ | grep -v client.ts | grep -v middleware.ts` returns zero
- [x] `src/lib/db/schema.ts` exists and is auto-generated
- [x] `CLAUDE.md` accurately describes the backend
- [x] Branch `sync/april-2026` is deployable (push to main auto-deploys without build failure)

## Commit Strategy

- One commit per file migration where possible (`feat(db): migrate tag-preferences to kysely`, `feat(db): migrate /api/invite/send-email to kysely`, etc.)
- Infrastructure commit: `feat(db): add kysely + schema codegen`
- Final cleanup commit: `refactor: remove supabase server shim`
- No squashing — per-file commits make bisect viable

## Open Questions

None. Scope, architecture, and phasing are settled.
