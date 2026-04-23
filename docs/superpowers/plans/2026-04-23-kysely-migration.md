# Kysely Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `src/lib/supabase/` server shim with Kysely-backed data access, fix the 74 missing-`await` bugs and 15 missing-shim-method errors incidentally, end with `npm run build` green.

**Architecture:** New `src/lib/db/` with auto-generated schema types from `kysely-codegen`. Server code imports `{ db }` directly. Async functions stop taking `SupabaseClient` argument. API routes use Kysely directly. Client HTTP wrapper (`client.ts`) stays; gets missing methods added. Generic `/api/db` endpoint stays but is rewritten against Kysely.

**Tech Stack:** Kysely 0.x, kysely-codegen, pg 8.x (existing), Node 18+. No other new dependencies.

**Spec:** [2026-04-23-kysely-migration-design.md](../specs/2026-04-23-kysely-migration-design.md)

**Working Directory for all commands:** `D:\venture-studio\ventures\Nexy\src`. Branch: `sync/april-2026`.

**Baseline at start:**
- 146 tests passing (Phase 1)
- `npx tsc --noEmit` — **150 errors** (target: 0)
- `npm run build` fails

---

## Task 1: Install Kysely and generate schema types

**Files:**
- Modify: `package.json`
- Create: `src/lib/db/schema.ts` (generated — do NOT hand-edit)

- [ ] **Step 1: Install dependencies**

```bash
npm install kysely
npm install --save-dev kysely-codegen
```

- [ ] **Step 2: Add codegen npm script to package.json**

Edit `package.json` `"scripts"` section, add:

```json
"db:types": "kysely-codegen --out-file src/lib/db/schema.ts --dialect postgres --url $DATABASE_URL"
```

Note for Windows bash: if `$DATABASE_URL` doesn't expand in that shell, use the explicit command in Step 3.

- [ ] **Step 3: Generate schema types**

```bash
mkdir -p src/lib/db
npx kysely-codegen --out-file src/lib/db/schema.ts --dialect postgres --url "$DATABASE_URL"
```

Expected: `src/lib/db/schema.ts` created, ~200-500 lines, contains interface `DB` with per-table interfaces like `Scenes`, `TagPreferences`, `UserGates`, `Partnerships`, etc.

If the command fails with "cannot connect": check `.env.local` has a valid `DATABASE_URL`, and run `source .env.local` first (or on Windows bash, export it manually).

- [ ] **Step 4: Sanity-check schema**

```bash
head -50 src/lib/db/schema.ts
```

Expected: a TypeScript file starting with `export interface` blocks. Spot-check: `Scenes` interface should have columns like `id`, `slug`, `title`, matching the DB.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/db/schema.ts
git commit -m "feat(db): add kysely and generate schema types from DATABASE_URL"
```

---

## Task 2: Create Kysely `db` instance

**Files:**
- Create: `src/lib/db/index.ts`

- [ ] **Step 1: Create `src/lib/db/index.ts`**

```ts
import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { DB } from './schema';

const { Pool } = pg;

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (_pool) return _pool;
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('Missing DATABASE_URL');
  _pool = new Pool({ connectionString: url, max: 10 });
  return _pool;
}

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool: getPool() }),
});

export function getDbPool(): pg.Pool {
  return getPool();
}
```

- [ ] **Step 2: Smoke-test the connection**

Create a temporary scratch file `src/lib/db/__smoke__.ts`:

```ts
import { db } from './index';

async function smoke() {
  const rows = await db.selectFrom('scenes').select('id').limit(1).execute();
  console.log('OK —', rows.length, 'row(s) returned');
  process.exit(0);
}
smoke().catch((e) => { console.error(e); process.exit(1); });
```

Run:

```bash
npx tsx src/lib/db/__smoke__.ts
```

Expected: `OK — 1 row(s) returned` (or 0 if table empty — both fine, confirms connection + schema match). If error about unknown table `scenes`, the generated schema doesn't match the DB — regenerate in Task 1.

- [ ] **Step 3: Delete the smoke file**

```bash
rm src/lib/db/__smoke__.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/index.ts
git commit -m "feat(db): add Kysely db instance with pg pool singleton"
```

---

## Task 3: Migrate `tag-preferences.ts` to Kysely — template for other lib/ migrations

**Files:**
- Modify: `src/lib/tag-preferences.ts`
- Modify: all API routes importing `tag-preferences` functions (updating call signatures — see Step 4)

- [ ] **Step 1: Identify call sites**

```bash
grep -rn "updateTagPreferences\|markTagsAsRejected\|updateTagPreferencesFromSwipe" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v tag-preferences.ts
```

Save the list. Each call site passes `supabase` as the first arg; after this migration, remove that arg.

- [ ] **Step 2: Rewrite `src/lib/tag-preferences.ts`**

Replace the entire file with this content:

```ts
import type { SceneV2 } from './types';
import { db } from '@/lib/db';

/**
 * Update tag_preferences based on composite scene response
 */
export async function updateTagPreferences(
  userId: string,
  scene: SceneV2,
  selectedElements: string[],
  elementResponses: Record<string, Record<string, unknown>> = {}
): Promise<void> {
  if (!selectedElements || selectedElements.length === 0) return;

  const sceneSlug = scene.slug || scene.id;

  for (const elementId of selectedElements) {
    const element = scene.elements.find((e) => e.id === elementId);
    if (!element) continue;

    const tagRef = element.tag_ref;
    if (!tagRef) continue;

    const existing = await db
      .selectFrom('tag_preferences')
      .selectAll()
      .where('user_id', '=', userId)
      .where('tag_ref', '=', tagRef)
      .executeTakeFirst();

    let interestLevel = 50;
    let rolePreference: 'give' | 'receive' | 'both' | null = null;
    let intensityPreference: number | null = null;
    const specificPreferences: Record<string, unknown> = {};
    let experienceLevel: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null = null;

    if (sceneSlug.endsWith('-give')) rolePreference = 'give';
    else if (sceneSlug.endsWith('-receive')) rolePreference = 'receive';

    const elementResponse = elementResponses[elementId];
    if (elementResponse) {
      for (const [followUpId, followUpAnswer] of Object.entries(elementResponse)) {
        const followUp = element.follow_ups?.find((f) => f.id === followUpId);
        if (!followUp) continue;

        switch (followUp.type) {
          case 'role':
            if (typeof followUpAnswer === 'string') {
              rolePreference = followUpAnswer as 'give' | 'receive' | 'both';
            }
            break;
          case 'intensity':
          case 'scale':
            if (typeof followUpAnswer === 'number') {
              intensityPreference = followUpAnswer;
              interestLevel = Math.max(30, Math.min(100, followUpAnswer));
            }
            break;
          case 'experience':
            if (typeof followUpAnswer === 'string') {
              experienceLevel = followUpAnswer as 'tried' | 'want_to_try' | 'not_interested' | 'curious';
              if (experienceLevel === 'tried') interestLevel = Math.max(interestLevel, 70);
              else if (experienceLevel === 'want_to_try') interestLevel = Math.max(interestLevel, 60);
              else if (experienceLevel === 'not_interested') interestLevel = Math.min(interestLevel, 30);
            }
            break;
          default:
            specificPreferences[followUpId] = followUpAnswer;
        }
      }
    }

    const sourceScenes: string[] = (existing?.source_scenes as string[] | null) ?? [];
    if (!sourceScenes.includes(sceneSlug)) sourceScenes.push(sceneSlug);

    const mergedSpecificPreferences = {
      ...((existing?.specific_preferences as Record<string, unknown>) ?? {}),
      ...specificPreferences,
    };

    const nextInterest = existing
      ? Math.max(existing.interest_level ?? 0, interestLevel)
      : interestLevel;

    await db
      .insertInto('tag_preferences')
      .values({
        user_id: userId,
        tag_ref: tagRef,
        interest_level: nextInterest,
        role_preference: rolePreference ?? existing?.role_preference ?? null,
        intensity_preference: intensityPreference ?? existing?.intensity_preference ?? null,
        specific_preferences: mergedSpecificPreferences,
        experience_level: experienceLevel ?? existing?.experience_level ?? null,
        source_scenes: sourceScenes,
        updated_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'tag_ref']).doUpdateSet({
          interest_level: nextInterest,
          role_preference: rolePreference ?? existing?.role_preference ?? null,
          intensity_preference: intensityPreference ?? existing?.intensity_preference ?? null,
          specific_preferences: mergedSpecificPreferences,
          experience_level: experienceLevel ?? existing?.experience_level ?? null,
          source_scenes: sourceScenes,
          updated_at: new Date(),
        })
      )
      .execute();
  }
}

/**
 * Mark tags as rejected (interest_level = -1) when not already positive.
 */
export async function markTagsAsRejected(
  userId: string,
  tags: string[],
  sceneSlug: string
): Promise<void> {
  if (!tags || tags.length === 0) return;

  for (const tag of tags) {
    const existing = await db
      .selectFrom('tag_preferences')
      .select('interest_level')
      .where('user_id', '=', userId)
      .where('tag_ref', '=', tag)
      .executeTakeFirst();

    if (existing && (existing.interest_level ?? 0) > 0) continue;

    await db
      .insertInto('tag_preferences')
      .values({
        user_id: userId,
        tag_ref: tag,
        interest_level: -1,
        source_scenes: [sceneSlug],
        updated_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'tag_ref']).doUpdateSet({
          interest_level: -1,
          source_scenes: [sceneSlug],
          updated_at: new Date(),
        })
      )
      .execute();
  }
}

/**
 * Update tag_preferences from a swipe response (V3 style).
 */
export async function updateTagPreferencesFromSwipe(
  userId: string,
  sceneTags: string[],
  sceneSlug: string,
  responseValue: number,
  experienceLevel?: number | null
): Promise<void> {
  if (!sceneTags || sceneTags.length === 0) return;

  const interestLevelMap: Record<number, number> = { 0: -1, 1: 50, 2: 80, 3: 30 };
  const interestLevel = interestLevelMap[responseValue] ?? 0;

  const experienceMap: Record<number, string> = { 0: 'want_to_try', 1: 'curious', 2: 'tried' };
  const experience = experienceLevel != null ? (experienceMap[experienceLevel] ?? null) : null;

  let rolePreference: 'give' | 'receive' | 'both' | null = null;
  if (sceneSlug.includes('-give') || sceneSlug.includes('-m-to-f')) rolePreference = 'give';
  else if (sceneSlug.includes('-receive') || sceneSlug.includes('-f-to-m')) rolePreference = 'receive';

  if (responseValue === 0) {
    await markTagsAsRejected(userId, sceneTags, sceneSlug);
    return;
  }

  for (const tag of sceneTags) {
    if (tag === 'onboarding' || tag === 'baseline') continue;

    const existing = await db
      .selectFrom('tag_preferences')
      .selectAll()
      .where('user_id', '=', userId)
      .where('tag_ref', '=', tag)
      .executeTakeFirst();

    const sourceScenes: string[] = (existing?.source_scenes as string[] | null) ?? [];
    if (!sourceScenes.includes(sceneSlug)) sourceScenes.push(sceneSlug);

    const nextInterest = existing
      ? Math.max(existing.interest_level ?? 0, interestLevel)
      : interestLevel;

    await db
      .insertInto('tag_preferences')
      .values({
        user_id: userId,
        tag_ref: tag,
        interest_level: nextInterest,
        role_preference: rolePreference ?? existing?.role_preference ?? null,
        experience_level: experience ?? existing?.experience_level ?? null,
        source_scenes: sourceScenes,
        updated_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'tag_ref']).doUpdateSet({
          interest_level: nextInterest,
          role_preference: rolePreference ?? existing?.role_preference ?? null,
          experience_level: experience ?? existing?.experience_level ?? null,
          source_scenes: sourceScenes,
          updated_at: new Date(),
        })
      )
      .execute();
  }
}
```

Note: the unused `V2Element` import is removed. The `SupabaseClient` import is removed.

- [ ] **Step 3: Update every call site**

For each file in Step 1's list, remove the `supabase` argument from calls:

```ts
// before
await updateTagPreferencesFromSwipe(supabase, userId, tags, slug, value);

// after
await updateTagPreferencesFromSwipe(userId, tags, slug, value);
```

- [ ] **Step 4: Verify typecheck errors decrease**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: strictly less than the starting 150. Confirm no new errors introduced.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 146 tests still pass (the Phase 1 tests don't touch these async functions; they should be unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/lib/tag-preferences.ts src/app/
git commit -m "feat(db): migrate tag-preferences to kysely"
```

---

## Task 4: Migrate `onboarding-gates.ts` async functions

**Files:**
- Modify: `src/lib/onboarding-gates.ts` (only the 2 async functions: `fetchUserGates`, `fetchUserGatesDetailed`)
- Modify: call sites

**Pattern:** follow Task 3's template. Drop the `SupabaseClient` parameter, import `{ db }` from `@/lib/db`, use Kysely selects.

- [ ] **Step 1: Read current implementations**

```bash
sed -n '100,155p' src/lib/onboarding-gates.ts
```

- [ ] **Step 2: Find call sites**

```bash
grep -rn "fetchUserGates\|fetchUserGatesDetailed" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v onboarding-gates.ts
```

- [ ] **Step 3: Rewrite the 2 async functions in `src/lib/onboarding-gates.ts`**

Keep everything else in the file unchanged. Replace the DB functions with Kysely equivalents:

```ts
import { db } from '@/lib/db';

export async function fetchUserGates(userId: string): Promise<OnboardingGates> {
  const row = await db
    .selectFrom('user_gates')
    .select('gates')
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!row) {
    console.warn('No gates found for user:', userId);
    return {};
  }
  return (row.gates as OnboardingGates) ?? {};
}

export async function fetchUserGatesDetailed(userId: string): Promise<{
  gates: OnboardingGates;
  onboarding_gates: OnboardingGates;
  body_map_gates: Record<string, boolean>;
} | null> {
  const row = await db
    .selectFrom('user_gates')
    .select(['gates', 'onboarding_gates', 'body_map_gates'])
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!row) return null;
  return {
    gates: (row.gates as OnboardingGates) ?? {},
    onboarding_gates: (row.onboarding_gates as OnboardingGates) ?? {},
    body_map_gates: (row.body_map_gates as Record<string, boolean>) ?? {},
  };
}
```

Remove the `SupabaseClient` import from this file.

- [ ] **Step 4: Update call sites**

Remove the `supabase` argument from every call found in Step 2.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
```

Expected: error count decreases; tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/onboarding-gates.ts src/app/
git commit -m "feat(db): migrate onboarding-gates to kysely"
```

---

## Task 5: Migrate `scene-progression.ts` async functions

**Files:**
- Modify: `src/lib/scene-progression.ts` (7 async functions: `getAnsweredElementIds`, `getAnsweredTagRefs`, `getSceneResponseInterests`, `getUserComfortLevel`, `getSeenCategories`, `calculateSceneScore`, `getAdaptiveScenes`)
- Modify: call sites

**Pattern:** Follow Task 3. Drop `SupabaseClient` arg from each async function. `getAdaptiveScenes` is the largest — takes `Scene[]` from caller. Study the existing implementation before rewriting; it calls the other async functions in this module.

- [ ] **Step 1: Read current implementations**

```bash
sed -n '73,770p' src/lib/scene-progression.ts
```

- [ ] **Step 2: Find call sites**

```bash
grep -rn "getAnsweredElementIds\|getAnsweredTagRefs\|getSceneResponseInterests\|getUserComfortLevel\|getSeenCategories\|calculateSceneScore\|getAdaptiveScenes" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v scene-progression.ts
```

- [ ] **Step 3: Rewrite the 7 async functions in `src/lib/scene-progression.ts`**

Keep all pure sync functions untouched (they have Phase 1 tests). Migrate each async function to Kysely. Key patterns:

- `.from('x').select('y').eq('a', b)` → `db.selectFrom('x').select(['y']).where('a', '=', b).execute()`
- `.single()` / `.maybeSingle()` → `.executeTakeFirst()`
- `.from('x').select('*', { count: 'exact', head: true }).eq(...)` → `const r = await db.selectFrom('x').select((eb) => eb.fn.countAll<number>().as('count')).where(...).executeTakeFirstOrThrow(); // r.count`
- Joined queries: use `.innerJoin()` or `.leftJoin()` as needed. The existing `getSeenCategories` does a join on `scene_responses` ↔ `scenes` — use `.innerJoin('scenes', 'scenes.id', 'scene_responses.scene_id').select('scenes.category')`.

Remove `SupabaseClient` import, import `{ db }` from `@/lib/db`.

- [ ] **Step 4: Update call sites**

Remove `supabase` arg from all calls.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/scene-progression.ts src/app/ src/hooks/
git commit -m "feat(db): migrate scene-progression async funcs to kysely"
```

---

## Task 6: Migrate `body-map-processing.ts`

**Files:**
- Modify: `src/lib/body-map-processing.ts` (1 async function: `processBodyMapToGatesAndTags`)
- Modify: call sites

Pattern: Task 3 template. The function reads/upserts `user_gates.body_map_gates` and upserts `tag_preferences` rows — use `insertInto().onConflict()` like in tag-preferences.

- [ ] **Step 1: Read current implementation (already in context above)**

- [ ] **Step 2: Find call sites**

```bash
grep -rn "processBodyMapToGatesAndTags" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v body-map-processing.ts
```

- [ ] **Step 3: Rewrite `processBodyMapToGatesAndTags`**

Keep the pure helpers (`isBodyMapGateOpen`, `getOpenBodyMapGates`) unchanged. Remove `SupabaseClient` arg from `processBodyMapToGatesAndTags`. Replace `.from('user_gates')` and `.from('tag_preferences')` blocks with Kysely. Convert the upsert to `insertInto().values().onConflict(oc => oc.columns(['user_id']).doUpdateSet(...)).execute()` (for gates) and `oc.columns(['user_id', 'tag_ref'])` (for tag_preferences).

Remove `SupabaseClient` import.

- [ ] **Step 4: Update call sites, verify, commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/lib/body-map-processing.ts src/app/
git commit -m "feat(db): migrate body-map-processing to kysely"
```

---

## Task 7: Migrate `profile-signals.ts` async functions

**Files:**
- Modify: `src/lib/profile-signals.ts` (3 async: `updatePsychologicalProfile`, `addFollowUpSignal`, `getPsychologicalProfile`)
- Modify: call sites

Pattern: Task 3 template. Pure signal-calculation functions stay untouched (Phase 1 tests).

- [ ] **Step 1: Find call sites**

```bash
grep -rn "updatePsychologicalProfile\|addFollowUpSignal\|getPsychologicalProfile" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v profile-signals.ts
```

- [ ] **Step 2: Rewrite the 3 async functions**

Remove `SupabaseClient` arg. Replace `.from('psychological_profiles').select...upsert...` with Kysely equivalents. `updateRunningAverage` (internal) stays.

- [ ] **Step 3: Update call sites, verify, commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/lib/profile-signals.ts src/app/
git commit -m "feat(db): migrate profile-signals to kysely"
```

---

## Task 8: Migrate `partner-archetypes.ts` async functions

**Files:**
- Modify: `src/lib/partner-archetypes.ts` (2 async: `calculatePartnerArchetypes`, `getAverageIntensity`)
- Modify: call sites

- [ ] **Step 1: Find call sites**

```bash
grep -rn "calculatePartnerArchetypes\|getAverageIntensity" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v partner-archetypes.ts
```

- [ ] **Step 2: Rewrite, verify, commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/lib/partner-archetypes.ts src/app/
git commit -m "feat(db): migrate partner-archetypes to kysely"
```

---

## Task 9: Add missing methods to `BrowserQueryBuilder` + rewrite `/api/db` endpoint against Kysely

**Files:**
- Modify: `src/lib/supabase/client.ts` (extend `BrowserQueryBuilder`)
- Modify: `src/app/api/db/route.ts` (rewrite backend against Kysely)

- [ ] **Step 1: Extend `BrowserQueryBuilder` with missing methods**

In `src/lib/supabase/client.ts`, inside the `BrowserQueryBuilder` class, add these methods (anywhere alongside `.eq`, `.gt` etc.):

```ts
overlaps(col: string, vals: unknown[]) { this.filters.push({ col, op: 'overlaps', val: vals }); return this; }
contains(col: string, obj: unknown) { this.filters.push({ col, op: 'contains', val: obj }); return this; }
not(col: string, op: string, val: unknown) { this.filters.push({ col, op: `not_${op}`, val }); return this; }
or(conditions: string) { this.filters.push({ col: '__or', op: 'or', val: conditions }); return this; }
range(from: number, to: number) { this.filters.push({ col: '__range', op: 'range', val: [from, to] }); return this; }
```

- [ ] **Step 2: Rewrite `src/app/api/db/route.ts` against Kysely**

Read the current implementation:

```bash
cat src/app/api/db/route.ts
```

Replace with Kysely-based translation:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DB } from '@/lib/db/schema';

// Generic filter type sent from BrowserQueryBuilder
type Filter = { col: string; op: string; val: unknown };

function applyFilter(qb: any, f: Filter) {
  // Special synthetic filters
  if (f.col === '__or' && f.op === 'or') {
    // Example: f.val = "column1.eq.value,column2.eq.value"
    const conditions = String(f.val).split(',').map((c) => c.trim());
    return qb.where((eb: any) =>
      eb.or(
        conditions.map((c) => {
          const m = c.match(/^(\w+)\.(\w+)\.(.+)$/);
          if (!m) return eb.lit(false);
          const [, col, op, val] = m;
          const kop = supabaseOpToKysely(op);
          return eb(col as any, kop, coerce(val));
        })
      )
    );
  }
  if (f.col === '__range' && f.op === 'range') {
    const [from, to] = f.val as [number, number];
    return qb.offset(from).limit(to - from + 1);
  }

  // Standard ops
  switch (f.op) {
    case 'eq': return qb.where(f.col as any, '=', f.val);
    case 'neq': return qb.where(f.col as any, '!=', f.val);
    case 'gt': return qb.where(f.col as any, '>', f.val);
    case 'gte': return qb.where(f.col as any, '>=', f.val);
    case 'lt': return qb.where(f.col as any, '<', f.val);
    case 'lte': return qb.where(f.col as any, '<=', f.val);
    case 'in': return qb.where(f.col as any, 'in', f.val as unknown[]);
    case 'is': return qb.where(f.col as any, 'is', f.val);
    case 'overlaps': return qb.where(f.col as any, '&&', f.val);
    case 'contains': return qb.where(f.col as any, '@>', f.val);
    case 'not_is': return qb.where(f.col as any, 'is not', f.val);
    default:
      throw new Error(`Unsupported filter op: ${f.op}`);
  }
}

function supabaseOpToKysely(op: string): any {
  switch (op) {
    case 'eq': return '=';
    case 'neq': return '!=';
    case 'gt': return '>';
    case 'gte': return '>=';
    case 'lt': return '<';
    case 'lte': return '<=';
    default: return '=';
  }
}

function coerce(v: string): unknown {
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const table = params.get('table') as keyof DB;
    const select = params.get('select') || '*';
    const filters: Filter[] = JSON.parse(params.get('filters') || '[]');
    const order: Array<{ col: string; asc: boolean }> = JSON.parse(params.get('order') || '[]');
    const limit = params.get('limit') ? Number(params.get('limit')) : undefined;
    const single = params.get('single') === '1';

    let qb: any = db.selectFrom(table).selectAll();
    if (select !== '*') {
      const cols = select.split(',').map((s) => s.trim());
      qb = db.selectFrom(table).select(cols as any);
    }
    for (const f of filters) qb = applyFilter(qb, f);
    for (const o of order) qb = qb.orderBy(o.col as any, o.asc ? 'asc' : 'desc');
    if (limit != null) qb = qb.limit(limit);

    const data = single ? await qb.executeTakeFirst() : await qb.execute();
    return NextResponse.json({ data: data ?? null, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: { message: err.message } }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { table, op, data, filters = [], opts } = body as {
      table: keyof DB;
      op: 'insert' | 'upsert' | 'update' | 'delete';
      data: unknown;
      filters?: Filter[];
      opts?: { onConflict?: string };
    };

    if (op === 'insert' || op === 'upsert') {
      const rows = Array.isArray(data) ? data : [data];
      let qb: any = db.insertInto(table).values(rows as any);
      if (op === 'upsert' && opts?.onConflict) {
        const conflictCols = opts.onConflict.split(',').map((c) => c.trim()) as any;
        const first = rows[0] as Record<string, unknown>;
        const updateCols = Object.fromEntries(
          Object.keys(first).filter((c) => !conflictCols.includes(c)).map((c) => [c, first[c]])
        );
        qb = qb.onConflict((oc: any) => oc.columns(conflictCols).doUpdateSet(updateCols));
      }
      const inserted = await qb.returningAll().execute();
      return NextResponse.json({ data: inserted, error: null });
    }

    if (op === 'update') {
      let qb: any = db.updateTable(table).set(data as any);
      for (const f of filters) qb = applyFilter(qb, f);
      const updated = await qb.returningAll().execute();
      return NextResponse.json({ data: updated, error: null });
    }

    if (op === 'delete') {
      let qb: any = db.deleteFrom(table);
      for (const f of filters) qb = applyFilter(qb, f);
      const deleted = await qb.returningAll().execute();
      return NextResponse.json({ data: deleted, error: null });
    }

    return NextResponse.json({ data: null, error: { message: 'Unknown op' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: { message: err.message } }, { status: 400 });
  }
}
```

Note: the heavy `any` usage here is intentional — `/api/db` is a generic gateway; typing it strictly would require per-table dispatch which defeats the purpose. It's a boundary.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
```

The client-side `Property 'overlaps'` / `'not'` / `'or'` / `'contains'` / `'range'` errors (~15 of them) should all resolve.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/client.ts src/app/api/db/route.ts
git commit -m "feat(db): fill client shim method gaps and rewrite /api/db on kysely"
```

---

## Task 10: Migrate admin API routes (read-heavy)

**Files (15 admin routes):**
- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/apply-instructions/route.ts`
- `src/app/api/admin/batch-analyze/route.ts`
- `src/app/api/admin/create-v3-scenes/route.ts`
- `src/app/api/admin/delete-scene/route.ts`
- `src/app/api/admin/enrich-prompts/route.ts`
- `src/app/api/admin/export-prompts/route.ts`
- `src/app/api/admin/gate-hierarchy/route.ts`
- `src/app/api/admin/generate-scene/route.ts`
- `src/app/api/admin/generate-v3-batch/route.ts`
- `src/app/api/admin/import-scenes-v2/route.ts`
- `src/app/api/admin/reset-prompt/route.ts`
- `src/app/api/admin/save-variant/route.ts`
- `src/app/api/admin/settings/route.ts`
- `src/app/api/admin/suggest-scenes/route.ts`
- `src/app/api/admin/swap-images/route.ts`
- `src/app/api/admin/update-scene/route.ts`
- `src/app/api/admin/upload-image/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[userId]/reset/route.ts`
- `src/app/api/admin/users/[userId]/responses/route.ts`

**Pattern for each route:**

1. Remove `const supabase = await createClient()` (or `const supabase = createClient()`)
2. Replace `supabase.from('x').select(...)` with `db.selectFrom('x').select([...]).execute()` etc.
3. Keep auth check — `createClient()` was also returning the auth object. Replace with:
   ```ts
   import { cookies } from 'next/headers';
   import { jwtVerify } from 'jose';

   async function getCurrentUser() {
     const cookieStore = await cookies();
     const token = cookieStore.get('nexy_session')?.value;
     if (!token) return null;
     try {
       const secret = new TextEncoder().encode(process.env['JWT_SECRET'] || 'nexy-jwt-secret');
       const { payload } = await jwtVerify(token, secret);
       return { id: payload.sub as string, email: payload.email as string };
     } catch { return null; }
   }
   ```
   Put this helper at `src/lib/auth.ts` (new file) if repeated across routes.

- [ ] **Step 1: Create auth helper**

Create `src/lib/auth.ts`:

```ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export interface CurrentUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('nexy_session')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env['JWT_SECRET'] || 'nexy-jwt-secret');
    const { payload } = await jwtVerify(token, secret);
    return { id: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Migrate routes in groups of 3-5**

Work through the routes. For each:
- Import `{ db }` from `@/lib/db` and `{ getCurrentUser }` from `@/lib/auth`
- Remove all `createClient()` / `supabase.` usage
- Test `npx tsc --noEmit | grep -c "error TS"` — should decrease per route

Sample migration (for `src/app/api/admin/analytics/route.ts`):

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Admin-role check is preserved from the existing route if it had one;
  // otherwise leave as-is (not introduced or removed by this migration).
  const events = await db
    .selectFrom('analytics_events')
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(1000)
    .execute();
  return NextResponse.json({ events });
}
```

Commit in chunks of 3-5 routes:

```bash
git add src/app/api/admin/
git commit -m "feat(db): migrate admin API routes batch N to kysely"
```

- [ ] **Step 3: Final verify for this task**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
```

Expected: error count materially reduced (likely under 20).

---

## Task 11: Migrate user-facing API routes

**Files (simpler, one-table mostly):**
- `src/app/api/wishlist/route.ts`
- `src/app/api/exclusions/route.ts`

**Pattern:** same as Task 10. Small routes, ~10 min each.

- [ ] **Step 1: Migrate both**

Follow Task 10 pattern. Use `db` + `getCurrentUser`.

- [ ] **Step 2: Verify & commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/app/api/
git commit -m "feat(db): migrate wishlist and exclusions routes to kysely"
```

---

## Task 12: Migrate invite + partner-chat routes

**Files:**
- `src/app/api/invite/decline/route.ts`
- `src/app/api/invite/notify-accepted/route.ts`
- `src/app/api/invite/send-email/route.ts`
- `src/app/api/partner-chat/route.ts`
- `src/app/api/partner-chat/history/route.ts`

**Pattern:** Task 10. Partner-chat involves multi-table operations (`partner_chat_messages`, `partnerships`); use Kysely joins.

- [ ] **Step 1: Migrate all 5 routes**

Commit in a logical group:

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/app/api/invite/ src/app/api/partner-chat/
git commit -m "feat(db): migrate invite and partner-chat routes to kysely"
```

---

## Task 13: Migrate AI + Stripe routes

**Files:**
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/detect-exclusion/route.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

**Pattern:** Task 10. Stripe webhook requires careful handling — still reads/writes `subscriptions` table, but also does signature verification (unchanged).

- [ ] **Step 1: Migrate all 5 routes**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/app/api/ai/ src/app/api/stripe/ src/app/api/webhooks/
git commit -m "feat(db): migrate ai and stripe routes to kysely"
```

---

## Task 14: Migrate remaining client-page direct DB calls

**Files:** any `src/app/(app)/**/*.tsx` or `src/app/(auth)/**/*.tsx` that still has `Property 'eq' does not exist on type 'Promise<...>'` or other `createClient()` issues.

These are awaited-too-early bugs: code calls `createClient().from(...)` without `await`.

- [ ] **Step 1: Find remaining consumers**

```bash
grep -rln "createClient()" src/app/"(app)" src/app/"(auth)" 2>&1 | head -20
```

- [ ] **Step 2: For each file, add `await` where the client shim expects it**

Since the client shim (`src/lib/supabase/client.ts`) `createClient()` is **not async** (it's synchronous, I just confirmed), these errors actually point at a different root cause — these files might be importing the SERVER `createClient` (which IS async). Check imports:

```bash
grep -n "from.*supabase" src/app/"(app)"/onboarding/page.tsx
```

If it imports `@/lib/supabase/server` from a client component, that's wrong — server-side `createClient` can't run in a browser. Fix by importing from `@/lib/supabase/client` instead. If the code was actually doing server work in a client component, split it: move the server work to a new API route.

For pages that correctly import client shim: no `await` needed (it's sync). The `Promise<{ from... }>` type error would only appear with server shim. Verify the import source before fixing.

- [ ] **Step 3: Fix each file**

Expected changes per file: import statement swap and possibly refactoring to use existing or new API routes.

- [ ] **Step 4: Verify & commit**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
git add src/app/
git commit -m "fix(db): correct client/server shim usage in pages"
```

---

## Task 15: Delete server shim and rename directory

**Files:**
- Delete: `src/lib/supabase/server.ts`
- Delete: `src/lib/supabase/pg-query-builder.ts`
- Delete: `src/lib/supabase/compat-types.ts`
- Modify: `src/lib/supabase/middleware.ts` (may need to remove the shim import if present)
- Rename: `src/lib/supabase/` → `src/lib/http-client/`
- Update imports across the tree

- [ ] **Step 1: Confirm no consumers of deleted files**

```bash
grep -rn "@/lib/supabase/server\|@/lib/supabase/pg-query-builder\|@/lib/supabase/compat-types" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero matches. If any found, go back to the relevant earlier task and fix.

- [ ] **Step 2: Delete files**

```bash
git rm src/lib/supabase/server.ts src/lib/supabase/pg-query-builder.ts src/lib/supabase/compat-types.ts
```

- [ ] **Step 3: Move directory**

```bash
git mv src/lib/supabase src/lib/http-client
```

- [ ] **Step 4: Update all imports**

```bash
grep -rln "@/lib/supabase" src/ --include="*.ts" --include="*.tsx"
```

For every hit, rewrite `@/lib/supabase/client` → `@/lib/http-client/client`, `@/lib/supabase/middleware` → `@/lib/http-client/middleware`. Use the Edit tool or a single `sed` if available.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
npm run build 2>&1 | tail -5
```

Expected: `npx tsc --noEmit` → **0 errors**. `npm test` → 146 tests pass. `npm run build` → compiles successfully.

- [ ] **Step 6: Commit**

```bash
git add -A src/
git commit -m "refactor(db): remove server shim and rename supabase dir to http-client"
```

---

## Task 16: Update CLAUDE.md + final validation

**Files:**
- Modify: `CLAUDE.md` (the inner `src/CLAUDE.md`, not the outer one)

- [ ] **Step 1: Update `CLAUDE.md` backend description**

Edit `src/CLAUDE.md`, find the Tech Stack section:

```
Backend:      Supabase (PostgreSQL + Auth + Realtime + Storage + RLS)
```

Replace with:

```
Backend:      VPS PostgreSQL + Kysely (typed queries) + jose (JWT auth) + MinIO (S3-compatible storage)
```

Also find any references to `src/lib/supabase/` and update to `src/lib/http-client/`.

Add a new section near Tech Stack or Coding Standards:

```markdown
## Database types

Kysely schema types are auto-generated from the VPS DB via `kysely-codegen`.
After any DB schema change, regenerate:

```bash
npm run db:types
```

Do NOT hand-edit `src/lib/db/schema.ts`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect kysely migration"
```

- [ ] **Step 3: Full validation**

```bash
npm run build && npm run lint && npm test
```

All three must complete successfully. Specifically:
- `npm run build` — compiles + type-checks, no errors
- `npm run lint` — existing pre-existing warnings may remain in untouched production files; no NEW errors caused by this work
- `npm test` — 146 tests pass

- [ ] **Step 4: Deployability check**

```bash
git log --oneline origin/main..HEAD | wc -l
```

Report the count. This is how many commits are ahead of `origin/main`. After this plan, pushing `sync/april-2026` to `main` should auto-deploy on Vercel without build failure.

---

## Notes for the implementer

- **Kysely query patterns cheat sheet:**
  - `select`: `db.selectFrom('x').select(['a', 'b']).where('c', '=', v).execute()`
  - `select single`: `...executeTakeFirst()` (maybe undefined) or `...executeTakeFirstOrThrow()`
  - `select all columns`: `.selectAll()`
  - `insert`: `db.insertInto('x').values({...}).execute()`
  - `insert returning`: `.insertInto('x').values({...}).returningAll().execute()`
  - `upsert`: `.insertInto('x').values({...}).onConflict(oc => oc.columns(['a', 'b']).doUpdateSet({...})).execute()`
  - `update`: `db.updateTable('x').set({...}).where('a', '=', v).execute()`
  - `delete`: `db.deleteFrom('x').where('a', '=', v).execute()`
  - `count`: `db.selectFrom('x').select(eb => eb.fn.countAll<number>().as('count')).where(...).executeTakeFirstOrThrow().then(r => r.count)`
  - `join`: `.innerJoin('y', 'y.id', 'x.y_id')`
  - `or`: `.where(eb => eb.or([eb('a', '=', 1), eb('b', '=', 2)]))`
  - `json contains`: `.where('jsonb_col', '@>', obj)` — Kysely supports operator as string
  - `array overlap`: `.where('array_col', '&&', arr)`

- **Date handling:** Kysely treats `timestamptz` columns as `Date` in TS. Pass `new Date()` where the old code used `new Date().toISOString()`.

- **JSONB columns:** passing plain objects works (Kysely auto-serializes). Don't call `JSON.stringify()` manually.

- **Error handling:** Kysely throws on DB errors. Wrap in try/catch at API route boundaries. Return `{ error: { message: err.message } }` for consistency with Supabase-shaped client responses where applicable.

- **If a test fails** during migration: STOP and investigate. The Phase 1 tests are pure-function tests and should be unaffected by DB layer changes. A failure indicates the migration touched pure-function code accidentally, or an async function's signature change broke something.

- **Commit discipline:** one logical commit per task (or per batch within a task). No squashing. This keeps `git bisect` viable if something breaks downstream.

- **Branches:** stay on `sync/april-2026`. Do not merge to main during this plan — that happens after the final validation passes, as a separate action.
