---
date: 2026-04-23
status: approved
phase: 1 of 3 (tests → Chrome baseline → Kysely migration)
---

# Design: Unit Tests for `lib/` Pure Business Logic

## Context

Nexy has 26 modules in `src/lib/`. Vitest is configured. Three test files exist:

- `locale.test.ts` (87 LOC)
- `matching.test.ts` (111 LOC)
- `scene-progression.test.ts` (66 LOC — actually tests `isSceneAllowed` from `onboarding-gates`)

CLAUDE.md P0 lists "Настроить Vitest + базовые тесты". Setup is done; coverage is thin.

This spec is Phase 1 of a three-phase stabilization project:

1. **This spec** — unit tests for pure functions in `lib/`
2. Chrome E2E smoke tests (separate spec) — baseline before refactoring
3. Supabase compat-shim → Kysely migration (separate spec) — the refactor that needs a safety net

**Why this ordering:** pure-logic unit tests protect invariants that break silently. Chrome E2E is the real safety net for the migration because most DB-touching functions can only be validated meaningfully end-to-end. Writing mocks-heavy unit tests against the shim would produce tests that need rewriting after Phase 3 — low value now.

## Goals

- Pin invariants in pure functions currently untested
- Cover the ~25 pure functions identified in the inventory
- Tests remain durable: assert public contracts, not implementation

## Non-Goals

- Unit tests for `async` / DB-touching functions (deferred to post-migration integration tests)
- Component tests (UI validated by Chrome E2E)
- API route tests (Chrome E2E)
- Coverage-percentage target — we test behaviors that matter, not lines

## Inventory: Pure vs Async

Result of grepping `^export` across each module:

### In scope (pure, sync)

| Module | Pure functions | Priority |
|---|---|---|
| `scene-progression.ts` | `shouldSkipSceneByDedupe`, `isSceneBlockedByPrerequisites`, `matchesRolePreference`, `calculateBreadthBonus`, `applyExplorationExploitation`, `calculateSceneScoreSync` | **High** — scoring math, 70/30 invariant |
| `onboarding-gates.ts` | `isSceneAllowed`, `isSceneGated`, `getAllowedScenes`, `getBlockedScenes`, `getSceneGateRequirement` | **High** — partial coverage exists |
| `profile-signals.ts` | `calculateSignalUpdates`, `calculateTestScoreUpdates`, `detectCorrelations`, `getTopSignals`, `getTopTestScores`, `isBodyMapAnswer`, `calculateBodyMapSignals`, `calculateBodyMapTestScores` | **High** — psych-profiling math |
| `body-map-processing.ts` | `isBodyMapGateOpen`, `getOpenBodyMapGates` | Medium |
| `scene-matcher.ts` | `matchScenesToImage` | Medium |
| `matching.ts` | `getTagBasedMatches`, `generateInviteCode` | Audit existing; extend if gaps |
| `partner-archetypes.ts` | `getArchetypeById`, `getAllArchetypes` | Low — lookups |
| `analytics.ts` | `trackEvent` | Low — event-shape sanity |
| `utils/object.ts` | `flattenObject` | Low |
| `locale.ts` | (covered) | Audit only |

### Deferred or skipped

- **All `async` exports taking `SupabaseClient`** — deferred to post-migration. Modules affected: `tag-preferences.ts` (entire module), `scene-progression.ts` (7 async funcs), `onboarding-gates.ts` (2 async), `body-map-processing.ts` (1 async), `profile-signals.ts` (3 async), `partner-archetypes.ts` (2 async).
- **External integrations** — `ai.ts`, `prompt-rewriter.ts`, `qa-evaluator.ts`, `replicate-qa-evaluator.ts`, `replicate.ts`, `civitai.ts`, `civitai-config.ts`, `image-analyzer.ts`, `stripe.ts`, `resend.ts`. Mocks fragile; integration tests belong in a separate spec.
- **Shim wrappers** — `proposals.client.ts`, `scenes.client.ts`. Will be rewritten in Phase 3.
- **Non-logic files** — `types.ts`, `archetype-definitions.ts`, `v3-scene-templates.ts`, `utils.ts` (`cn` is trivial).

## Testing Approach

- **Framework:** Vitest (`vitest.config.ts`, `node` env, globals on)
- **File layout:** `src/lib/__tests__/<module>.test.ts` (existing convention)
- **Refactor note:** `scene-progression.test.ts` currently tests `isSceneAllowed` which lives in `onboarding-gates.ts`. Move those tests to a new `onboarding-gates.test.ts` during Step 2. Free up `scene-progression.test.ts` for genuine scene-progression pure functions.
- **Style:** AAA (arrange-act-assert), one behavior per test, descriptive names
- **Fixtures:** inline when small; `__tests__/fixtures/*.json` when reused across tests
- **No mocks:** in-scope functions are pure. If a test feels like it needs a mock, the function is out of scope.
- **i18n:** tests don't exercise user-facing strings; no `t()` usage required

## Invariants to Lock In

Cross-referenced from CLAUDE.md "Ключевые решения":

1. **70/30 exploration/exploitation** — `applyExplorationExploitation` output distribution over a sufficient sample respects the ratio (± small delta for sample size).
2. **Gate enforcement** — `isSceneAllowed` blocks when required gate missing; OR-requirements pass when any is open; AND-requirements pass only when all open; `-give`/`-receive` suffix stripped for lookup.
3. **Role complementarity** — `matchesRolePreference` pairs dominant↔submissive; switch role accepts both.
4. **Scene-score determinism** — `calculateSceneScoreSync` same inputs → same output.
5. **Tag-based matching** — `getTagBasedMatches` deterministic; respects `interested_in` and `gender`; returns empty on no overlap.
6. **Body-map gate openness** — `isBodyMapGateOpen` / `getOpenBodyMapGates` correctly report which gates the body-map inputs unlock.
7. **Psych-profile math** — `calculateSignalUpdates` / `calculateTestScoreUpdates` produce updates that are additive and bounded (if the signal has a cap).

Monotonic tag-preference growth is out of Phase 1 scope — all of `tag-preferences.ts` is async; revisit post-migration.

## Success Criteria

- Every pure function in scope has ≥ 1 test covering happy path
- Functions with listed invariants have ≥ 3 tests: happy path, invariant, edge case
- `npm test` passes; zero failures
- `npm run build` and `npm run lint` unaffected
- Each test file < 200 LOC (split by concern if longer)

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Testing implementation details → fragile | Public-API only; behavioral assertions |
| Pure functions may import async helpers transitively and require extra setup | Inventory was static-grep based; resolve per-module in Step 1 of Ordering — skip or extract if needed |
| Scene-gate mappings in `SCENE_GATES` change → test churn | Expected; these tests pin the current mapping. Changes to gates are conscious decisions. |
| Refactor of `scene-progression.test.ts` loses gate coverage | Step 2 moves tests, doesn't delete them; run `npm test` after to confirm |

## Ordering of Work

1. **Per-module sanity pass** — for each listed module, confirm pure functions don't pull async-only dependencies. Document any findings in the implementation plan.
2. **Refactor existing tests** — move `isSceneAllowed` tests from `scene-progression.test.ts` to new `onboarding-gates.test.ts`. Commit: `refactor(test): move gate tests to onboarding-gates.test.ts`.
3. **Write tests, in this order:**
   1. `scene-progression.ts` (pure scoring/exploration)
   2. `onboarding-gates.ts` (fill remaining pure-function gaps)
   3. `profile-signals.ts`
   4. `body-map-processing.ts`
   5. `scene-matcher.ts`
   6. `matching.ts` (audit & extend)
   7. `partner-archetypes.ts`
   8. `analytics.ts`
   9. `utils/object.ts`
4. **Audit existing** — review `locale.test.ts`, extend if invariants missing
5. **Final validation** — `npm run build && npm run lint && npm test`. All green before final commit.

## Commit Strategy

- One commit per module: `test: add unit tests for <module>`
- The refactor commit in Step 2: `refactor(test): move gate tests to onboarding-gates.test.ts`
- Final commit: `test: lib/ pure-function coverage complete`
- No mixed logic + test commits

## Open Questions

None. Ready for the implementation plan.
