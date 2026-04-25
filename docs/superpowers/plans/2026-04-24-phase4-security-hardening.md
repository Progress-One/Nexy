# Phase 4 — Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close pre-existing P0 security gaps (open `/api/db`, missing admin role check, weak JWT fallback, SHA-256 password hashing, broken proposals/createClient/dead-refs) so `nexy.life` can be safely DNS-flipped.

**Architecture:** Three sub-phases — 4a emergency (3 h), 4b /api/db kill (1 day), 4c quality cleanup (3 h). Each is independently shippable.

**Tech Stack:** Existing — Next.js 16 App Router, Kysely, jose JWT. New dep: `argon2` (Node native binding).

**Spec:** [`2026-04-24-phase4-security-hardening-design.md`](../specs/2026-04-24-phase4-security-hardening-design.md)

**Working directory** for all commands: `D:\venture-studio\ventures\Nexy\src`. Branch: `sync/april-2026`.

**Baseline:** 146 tests passing, 0 tsc errors, build green. Branch is up-to-date with origin/main.

---

## Phase 4a — Emergency hardening

## Task 1: Throw on missing JWT_SECRET

`process.env['JWT_SECRET'] || 'nexy-jwt-secret'` appears in 4 files. Replace each with a hard error.

**Files:**
- Modify: `src/lib/auth.ts:14`
- Modify: `src/lib/http-client/middleware.ts:5`
- Modify: `src/app/api/auth/signup/route.ts:45`
- Modify: `src/app/api/auth/login/route.ts:45`

- [ ] **Step 1: Add a shared helper at `src/lib/auth.ts`**

Insert near top of file (before `getCurrentUser`):

```ts
function getJwtSecret(): Uint8Array {
  const value = process.env['JWT_SECRET'];
  if (!value) {
    throw new Error('Missing JWT_SECRET environment variable');
  }
  return new TextEncoder().encode(value);
}
```

Replace `getCurrentUser`'s body line `const secret = new TextEncoder()...` with `const secret = getJwtSecret();`. Remove the inline fallback.

Export `getJwtSecret` from this module.

- [ ] **Step 2: Use the helper in middleware**

`src/lib/http-client/middleware.ts` — replace the top of `updateSession`:

```ts
import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { getJwtSecret } from '@/lib/auth';

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get('nexy_session')?.value;

  let user: { id: string; email: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      user = { id: payload.sub as string, email: payload.email as string };
    } catch { /* expired/invalid */ }
  }
  // ... rest unchanged
```

- [ ] **Step 3: Use the helper in signup**

`src/app/api/auth/signup/route.ts:45` — replace `const secret = new TextEncoder()...` with `const secret = getJwtSecret();`. Add `import { getJwtSecret } from '@/lib/auth';` at top.

- [ ] **Step 4: Use the helper in login**

Same change in `src/app/api/auth/login/route.ts:45`.

- [ ] **Step 5: Verify — no fallback strings remain**

```bash
grep -rn "nexy-jwt-secret" src/
```

Expected: zero results.

- [ ] **Step 6: Build + test**

```bash
npm run build && npm test
```

Expected: build green, 146 tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/http-client/middleware.ts src/app/api/auth/
git commit -m "fix(security): throw on missing JWT_SECRET, remove fallback"
```

---

## Task 2: Add `isAdmin` / `requireAdmin` helpers

**Files:**
- Modify: `src/lib/auth.ts` (extend with helpers)
- Create: `src/lib/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdmin } from '../auth';

const ORIGINAL_ENV = process.env['ADMIN_EMAILS'];

describe('isAdmin', () => {
  afterEach(() => {
    process.env['ADMIN_EMAILS'] = ORIGINAL_ENV;
  });

  it('returns false when user is null', () => {
    process.env['ADMIN_EMAILS'] = 'alex@skill.im';
    expect(isAdmin(null)).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is unset', () => {
    delete process.env['ADMIN_EMAILS'];
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is empty string', () => {
    process.env['ADMIN_EMAILS'] = '';
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(false);
  });

  it('returns true for matching email (single value)', () => {
    process.env['ADMIN_EMAILS'] = 'alex@skill.im';
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(true);
  });

  it('returns false for non-matching email', () => {
    process.env['ADMIN_EMAILS'] = 'alex@skill.im';
    expect(isAdmin({ id: 'x', email: 'evil@nope.com' })).toBe(false);
  });

  it('matches in comma-separated list', () => {
    process.env['ADMIN_EMAILS'] = 'a@x.com,b@y.com,c@z.com';
    expect(isAdmin({ id: 'x', email: 'b@y.com' })).toBe(true);
    expect(isAdmin({ id: 'x', email: 'd@x.com' })).toBe(false);
  });

  it('is case-insensitive', () => {
    process.env['ADMIN_EMAILS'] = 'Alex@Skill.IM';
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(true);
    expect(isAdmin({ id: 'x', email: 'ALEX@SKILL.IM' })).toBe(true);
  });

  it('trims whitespace around emails in the env var', () => {
    process.env['ADMIN_EMAILS'] = ' a@x.com , b@y.com ';
    expect(isAdmin({ id: 'x', email: 'a@x.com' })).toBe(true);
    expect(isAdmin({ id: 'x', email: 'b@y.com' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL (`isAdmin` not exported)**

```bash
npm test -- auth.test.ts
```

Expected: import error or `isAdmin is not a function`.

- [ ] **Step 3: Implement `isAdmin` and `requireAdmin`**

Append to `src/lib/auth.ts`:

```ts
import { NextResponse } from 'next/server';

export function isAdmin(user: CurrentUser | null): boolean {
  if (!user) return false;
  const list = (process.env['ADMIN_EMAILS'] || '').trim();
  if (!list) return false;
  const lcEmail = user.email.toLowerCase();
  return list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(lcEmail);
}

/**
 * Returns null if user is admin, or a 401/403 NextResponse if not.
 * Use at top of admin route handlers:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
npm test -- auth.test.ts
```

Expected: 8 passing.

- [ ] **Step 5: Update `.env.example` and CLAUDE.md**

In `deploy/.env.example`, add (under `## Auth`):

```
# Comma-separated list of admin emails. Required for /admin and /api/admin/* access.
# Example: alex@skill.im,ops@nexy.life
ADMIN_EMAILS=
```

In `CLAUDE.md`, add `ADMIN_EMAILS=alex@skill.im,...` to deploy checklist (under `Заполнить /opt/studio/nexy/.env`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/__tests__/auth.test.ts deploy/.env.example CLAUDE.md
git commit -m "feat(auth): add isAdmin and requireAdmin helpers + tests"
```

---

## Task 3: Apply `requireAdmin` to all `/api/admin/*` routes

**Files:** all of `src/app/api/admin/**/route.ts`. From earlier inventory, ~21 files.

- [ ] **Step 1: List all admin route files**

```bash
find src/app/api/admin -name route.ts
```

Save output as the list of files to modify.

- [ ] **Step 2: For each route file, add `requireAdmin` at the top of every exported handler**

Pattern (apply to GET / POST / PUT / DELETE / PATCH as present):

```ts
import { requireAdmin } from '@/lib/auth';
// ... other imports

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  // ... existing handler body
}
```

If the handler currently uses `getCurrentUser()` for non-admin auth, REPLACE that block with the `requireAdmin` call (admin check is strictly more restrictive than logged-in).

- [ ] **Step 3: Verify all admin handlers have the gate**

```bash
for f in $(find src/app/api/admin -name route.ts); do
  grep -L "requireAdmin(" "$f" && echo "MISSING in $f"
done
```

Expected: no `MISSING` output. If any file lacks the gate, edit it.

- [ ] **Step 4: Run tests + build**

```bash
npm test && npm run build 2>&1 | tail -5
```

Expected: 146+ tests pass, build green.

- [ ] **Step 5: Manual verification (one route)**

Without auth cookie:

```bash
curl -i https://nexy.life/api/admin/users 2>&1 | head -1
# Expected: HTTP/2 401  (or 401 from local: curl http://127.0.0.1:3002/api/admin/users -i | head -1)
```

(Skip if not running locally; rely on tsc + tests for correctness verification.)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat(security): require admin role on all /api/admin/* routes"
```

---

## Task 4: Gate `/admin/*` pages in middleware + server-side check

**Files:**
- Modify: `src/lib/http-client/middleware.ts`
- Create: `src/app/admin/layout.tsx` (Next.js admin layout with server gate)

- [ ] **Step 1: Add `/admin` to middleware matcher**

In `src/lib/http-client/middleware.ts`, extend the `isAppPage` predicate:

```ts
const isAppPage = request.nextUrl.pathname.startsWith('/discover') ||
                  request.nextUrl.pathname.startsWith('/profile') ||
                  request.nextUrl.pathname.startsWith('/partners') ||
                  request.nextUrl.pathname.startsWith('/date') ||
                  request.nextUrl.pathname.startsWith('/chat') ||
                  request.nextUrl.pathname.startsWith('/settings') ||
                  request.nextUrl.pathname.startsWith('/premium') ||
                  request.nextUrl.pathname.startsWith('/onboarding') ||
                  request.nextUrl.pathname.startsWith('/visual-onboarding') ||
                  request.nextUrl.pathname.startsWith('/admin');
```

This ensures unauthenticated users hitting `/admin` redirect to `/login`. Authenticated non-admin users still pass — the next step blocks them.

- [ ] **Step 2: Create server-side admin gate in admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/');
  return <>{children}</>;
}
```

This wraps every page under `src/app/admin/*` and runs on the server before render. Non-admins never see admin UI.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/http-client/middleware.ts src/app/admin/layout.tsx
git commit -m "feat(security): gate /admin pages in middleware and per-route layout"
```

---

## Task 5: Install argon2 and replace SHA-256 in signup

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/app/api/auth/signup/route.ts`

- [ ] **Step 1: Install argon2**

```bash
npm install argon2
```

Expected: `+1 package` (the argon2 native binding).

- [ ] **Step 2: Verify it loads**

```bash
node -e "console.log(require('argon2').argon2id)"
```

Expected: a non-undefined number (algorithm constant).

- [ ] **Step 3: Replace `hashPassword` in signup**

Edit `src/app/api/auth/signup/route.ts`:

Replace the import:

```ts
// remove
import { createHash, randomUUID } from 'crypto';
// add
import { randomUUID } from 'crypto';
import argon2 from 'argon2';
```

Replace `hashPassword`:

```ts
// remove
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
// add
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}
```

Update the call site (becomes async):

```ts
// before
'INSERT INTO profiles (id, email, password_hash, onboarding_completed) VALUES ($1, $2, $3, false)',
[userId, email, hashPassword(password)],

// after
const passwordHash = await hashPassword(password);
await pool.query(
  'INSERT INTO profiles (id, email, password_hash, onboarding_completed) VALUES ($1, $2, $3, false)',
  [userId, email, passwordHash],
);
```

- [ ] **Step 4: Build to verify imports compile**

```bash
npm run build 2>&1 | tail -5
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/api/auth/signup/route.ts
git commit -m "feat(security): use argon2id for password hashing on signup"
```

---

## Task 6: Update login — argon2 verify + lazy SHA-256 migration

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Replace verification logic**

Edit `src/app/api/auth/login/route.ts`:

Replace imports:

```ts
// remove
import { createHash } from 'crypto';
// add
import argon2 from 'argon2';
import { createHash } from 'crypto';
```

(Keep `createHash` for the legacy verify path.)

Replace the verification + password update block:

```ts
// before
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// ... in handler:
if (user.password_hash !== hashPassword(password)) {
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}

// after — replace function and the if-block
function legacySha256Hash(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function verifyAndMaybeMigrate(
  pool: pg.Pool,
  userId: string,
  storedHash: string,
  password: string
): Promise<boolean> {
  // Modern argon2 hashes start with `$argon2`
  if (storedHash.startsWith('$argon2')) {
    return argon2.verify(storedHash, password);
  }
  // Legacy SHA-256 hex (64 chars). On success, lazily upgrade to argon2.
  if (storedHash === legacySha256Hash(password)) {
    const newHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    return true;
  }
  return false;
}

// ... in handler:
const ok = await verifyAndMaybeMigrate(pool, user.id, user.password_hash, password);
if (!ok) {
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build 2>&1 | tail -5
```

Expected: green.

- [ ] **Step 3: Manual smoke (after Phase 4a is deployed)**

Sign up new user → check `password_hash` in DB starts with `$argon2id$`.
Log in legacy user → verify success → check hash now starts with `$argon2id$`.

(Don't run this step now — record as a post-deploy checklist item.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat(security): argon2 verify with lazy SHA-256 migration on login"
```

---

## Phase 4a complete

Mark milestone with empty commit:

```bash
git commit --allow-empty -m "chore(security): phase 4a emergency hardening complete"
```

**4a verification:**
- `grep -rn "nexy-jwt-secret" src/` → 0
- `npm test` → 154+ pass (146 + 8 from Task 2)
- `npm run build` → green

---

## Phase 4b — Close /api/db

## Task 7: Inventory client-side `.from()` callers

**Goal:** produce the exhaustive list of API endpoints we need to create.

**Files:** none (research only).

- [ ] **Step 1: Find all client-side `.from()` calls**

```bash
grep -rn "\.from(['\"]" src/app/\(app\)/ src/app/\(auth\)/ src/components/ src/hooks/ 2>&1 | grep -v "\.test\." > /tmp/from-calls.txt
cat /tmp/from-calls.txt
wc -l /tmp/from-calls.txt
```

- [ ] **Step 2: Categorize each call by feature/operation**

For each line in `from-calls.txt`, identify:
- Source file
- Table name
- Operation (select/insert/update/delete/upsert)
- Filter shape (typically `eq('user_id', ...)` or similar)

Group into a list. Each unique (table, operation, ownership-pattern) tuple becomes one new API route.

Example expected groupings (based on typical Nexy code; verify against grep output):

| Source page/hook | Table | Op | New route |
|---|---|---|---|
| `partners/invite/page.tsx` | `partnerships` | select | `GET /api/partners/list` |
| `partners/[id]/page.tsx` | `partnerships`, `partner_chat_messages` | select | `GET /api/partners/[id]/details` |
| `date/[id]/page.tsx` | `dates`, `date_responses` | select | `GET /api/dates/[id]` |
| `date/new/[partnerId]/page.tsx` | `dates` | insert | `POST /api/dates/new` |
| `date/[id]/results/page.tsx` | `date_responses` join `scenes` | select | `GET /api/dates/[id]/results` |
| `profile/page.tsx` | `tag_preferences`, `psychological_profiles` | select | `GET /api/profile/me` |
| `settings/page.tsx` | `profiles` | select/update | `GET /api/settings/me`, `PATCH /api/settings/me` |
| `premium/page.tsx` | `subscriptions` | select | `GET /api/subscription/status` |
| `partners/[id]/propose/page.tsx` | `tag_preferences`, `proposals` | select/insert | `GET /api/partners/[id]/propose-options`, `POST /api/proposals` |

(Actual list determined by grep output. The implementer fills the table.)

- [ ] **Step 3: Save inventory as a markdown table in `docs/superpowers/plans/2026-04-24-phase4b-inventory.md`**

Format:

```markdown
# /api/db Inventory (Phase 4b)

| File:line | Table | Operation | Filter | New route |
|---|---|---|---|---|
| `src/app/(app)/partners/invite/page.tsx:42` | `partnerships` | `.select('*').eq('user_id', userId)` | own | `GET /api/partners/list` |
| ... | ... | ... | ... | ... |
```

- [ ] **Step 4: Commit inventory**

```bash
git add docs/superpowers/plans/2026-04-24-phase4b-inventory.md
git commit -m "docs(security): inventory client /api/db consumers for migration"
```

---

## Task 8: Create per-feature API routes (batched)

**Goal:** for each row in the inventory, create the typed API route.

**Files:** `src/app/api/<feature>/<action>/route.ts` (multiple files determined by Task 7).

**Pattern for every new route:**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Replace this block per-feature: query scoped to user.id
  const rows = await db
    .selectFrom('partnerships')
    .selectAll()
    .where('user_id', '=', user.id)
    .execute();

  return NextResponse.json({ partnerships: rows });
}
```

For mutations:

```ts
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  // Validate body shape minimally (zod-light or manual check)
  // ...

  // Insert/update scoped to user.id
  const inserted = await db
    .insertInto('proposals')
    .values({ ...body, user_id: user.id })
    .returningAll()
    .executeTakeFirstOrThrow();

  return NextResponse.json({ proposal: inserted });
}
```

**Ownership rules:**
- For tables with `user_id` column: always filter by `user.id`. Never trust input.
- For partnership-scoped tables (e.g., `dates`, `date_responses`, `partner_chat_messages`): verify the user is part of the partnership before reading/writing.
- For public catalog tables (e.g., `scenes`): no filter needed (already public).

- [ ] **Step 1: Create routes in groups of 3-5 (one commit per group)**

Work through the inventory. For each route:
1. Create the file with the pattern above
2. Adapt the query to the specific use case
3. Test compile: `npx tsc --noEmit` → no new errors

Group commit:

```bash
git add src/app/api/<feature>/
git commit -m "feat(api): add typed endpoints for <feature>"
```

- [ ] **Step 2: Verify after all groups**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
```

Expected: 0 tsc errors, 154+ tests pass.

---

## Task 9: Migrate client callers to new routes

**Goal:** replace `supabase.from(...)` with `fetch('/api/...')` everywhere in client code.

**Files:** all client files identified in Task 7.

**Pattern per call:**

```ts
// before
const supabase = useMemo(() => createClient(), []);
const { data, error } = await supabase.from('partnerships').select('*').eq('user_id', userId);

// after
const res = await fetch('/api/partners/list');
if (!res.ok) { /* handle */ }
const { partnerships } = await res.json();
```

For mutations:

```ts
// before
await supabase.from('proposals').insert({ scene_id: x, user_id: userId });

// after
await fetch('/api/proposals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scene_id: x }),  // user_id is server-injected
});
```

- [ ] **Step 1: Migrate in batches matching Task 8 groups**

For each route created, find the corresponding client call(s) and rewrite. After each batch:

```bash
git add <client files>
git commit -m "refactor(client): migrate <feature> to typed API routes"
```

- [ ] **Step 2: Final verification — no `.from(` left in client code**

```bash
grep -rn "\.from(['\"]" src/app/\(app\)/ src/app/\(auth\)/ src/components/ src/hooks/ 2>&1 | grep -v "\.test\."
```

Expected: zero results (or only false positives like `Array.from`, which the regex `\.from(['\"]` should exclude — quote required).

- [ ] **Step 3: Build + test**

```bash
npm run build && npm test
```

Expected: green.

---

## Task 10: Delete `/api/db` and shrink browser shim

**Files:**
- Delete: `src/app/api/db/route.ts`
- Modify: `src/lib/http-client/client.ts` — remove `BrowserQueryBuilder` class and `from` method

- [ ] **Step 1: Delete the route**

```bash
git rm src/app/api/db/route.ts
```

- [ ] **Step 2: Strip `from` and `BrowserQueryBuilder` from client shim**

In `src/lib/http-client/client.ts`:

- Delete the entire `class BrowserQueryBuilder { ... }` definition
- In `createClient()`'s returned object, delete the `from: (table) => new BrowserQueryBuilder(table),` line
- Keep `auth` and `storage` blocks unchanged

If anything still imports `BrowserQueryBuilder` (unlikely after Task 9): `grep -rn "BrowserQueryBuilder" src/` → expected zero.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm test
npm run build 2>&1 | tail -5
```

Expected: 0 tsc errors, all tests pass, build green.

If TS errors point to `from` being undefined on `createClient()` return type — those are stragglers Task 9 missed. Fix them by replacing with the appropriate `/api/...` fetch.

- [ ] **Step 4: Final grep — no references to `/api/db`**

```bash
grep -rn "/api/db" src/
```

Expected: zero.

- [ ] **Step 5: Commit**

```bash
git add src/lib/http-client/client.ts
git rm src/app/api/db/route.ts
git commit -m "feat(security): close /api/db privacy gap"
```

---

## Phase 4b complete

```bash
git commit --allow-empty -m "chore(security): phase 4b /api/db killed, all clients on typed endpoints"
```

---

## Phase 4c — Quality cleanup

## Task 11: Real `isPremium` for proposals page

**Files:**
- Create: `src/app/api/subscription/status/route.ts` (if not already created in Task 8)
- Modify: `src/app/(app)/partners/[partnerId]/propose/page.tsx`

- [ ] **Step 1: Create or verify status endpoint**

If Task 8 already created `GET /api/subscription/status`, skip this. Otherwise create `src/app/api/subscription/status/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sub = await db
    .selectFrom('subscriptions')
    .select(['status', 'current_period_end'])
    .where('user_id', '=', user.id)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  const isPremium = sub?.status === 'active' || sub?.status === 'trialing';
  return NextResponse.json({ isPremium, status: sub?.status ?? null });
}
```

- [ ] **Step 2: Update propose page**

In `src/app/(app)/partners/[partnerId]/propose/page.tsx`, find the `isPremium` hardcode (around line 26-31). Replace with:

```tsx
const [isPremium, setIsPremium] = useState<boolean | null>(null);

useEffect(() => {
  fetch('/api/subscription/status')
    .then((r) => r.json())
    .then((d) => setIsPremium(d.isPremium === true))
    .catch(() => setIsPremium(false));
}, []);

// Render gate:
if (isPremium === null) return <Loader />;  // or whatever loading state
if (!isPremium) return <PaywallView />;
// ... rest of propose UI
```

- [ ] **Step 3: Build + test**

```bash
npm run build && npm test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/subscription/ src/app/\(app\)/partners/
git commit -m "fix(proposals): read real isPremium from subscriptions table"
```

---

## Task 12: Memoize `createClient()` as singleton

**Files:**
- Modify: `src/lib/http-client/client.ts`

- [ ] **Step 1: Convert to singleton**

In `src/lib/http-client/client.ts`, rename the existing `createClient` to `_createClient` and add a memoizing wrapper:

```ts
function _createClient() {
  return {
    auth: { /* ... existing ... */ },
    storage: { /* ... existing ... */ },
  };
}

let _client: ReturnType<typeof _createClient> | null = null;
export function createClient() {
  return _client ??= _createClient();
}

// Test-only escape hatch
export function __resetClientForTests() {
  _client = null;
}
```

This makes useEffect deps stable. Existing call sites work unchanged.

- [ ] **Step 2: Build + test**

```bash
npm run build && npm test
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/http-client/client.ts
git commit -m "perf(client): memoize createClient as module-level singleton"
```

---

## Task 13: Audit storage.list / storage.upload references

**Files:**
- Modify: `src/lib/http-client/client.ts` (potentially)
- Modify: any caller using `storage.list` or `storage.upload`

- [ ] **Step 1: Find callers**

```bash
grep -rn "storage\.\(list\|upload\)" src/ --include="*.ts" --include="*.tsx" 2>&1
```

- [ ] **Step 2: Decide per-callsite**

For each:
- If the caller is an admin tool the team actually uses → create the missing `/api/storage/list` or `/api/storage/upload` route handler (using `getStoragePublicUrl` and the S3 client from `src/lib/storage.ts`). Gate with `requireAdmin`.
- If the caller is dead code → remove the caller.
- If the caller is unclear / out of scope → make the shim method throw a clear error: `throw new Error('storage.list not implemented in browser shim')`.

- [ ] **Step 3: Verify**

```bash
grep -rn "storage\.\(list\|upload\)" src/ --include="*.ts" --include="*.tsx" 2>&1
# Each remaining hit should be either: backed by a real route, or removed.
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/
git commit -m "fix(storage): remove broken storage.list/upload references"
```

---

## Task 14: Onboarding analytics decision

**Files:**
- Modify: `src/app/(app)/onboarding/page.tsx` OR `src/hooks/useDiscovery.ts` (depending on decision)

- [ ] **Step 1: Verify current state**

Is `/onboarding` page reachable from any link / nav? Check:

```bash
grep -rn "/onboarding" src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\."
```

- [ ] **Step 2: Decide**

- If `/onboarding` is dead (no links): delete the page file, remove its analytics events.
- If `/onboarding` is alive: leave the analytics events but ALSO emit funnel events from `useDiscovery` at `discoveryStage` transitions: `onboarding_intro` → `EVENTS.ONBOARDING_START`, `onboarding_results` → `EVENTS.ONBOARDING_COMPLETE`, etc.

- [ ] **Step 3: Implement decision**

Apply chosen action.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "fix(analytics): track onboarding funnel via current /discover flow"
```

(Or `git rm` for the deletion option.)

---

## Phase 4c complete

```bash
git commit --allow-empty -m "chore(security): phase 4c quality cleanup complete"
```

---

## Final validation

- [ ] **Step 1: Full validation**

```bash
npm run build
npm run lint -- src/lib/auth.ts src/app/api/admin src/app/admin
npm test
```

All three: green.

- [ ] **Step 2: Security checklist verification**

Re-run each P0 grep:

```bash
# JWT fallback
grep -rn "nexy-jwt-secret" src/  # → empty

# /api/db dead
test ! -f src/app/api/db/route.ts && echo OK

# .from() in client code dead
grep -rn "\.from(['\"]" src/app/\(app\)/ src/app/\(auth\)/ src/components/ src/hooks/ 2>&1 | grep -v "\.test\."  # → empty

# requireAdmin in every admin route
for f in $(find src/app/api/admin -name route.ts); do
  grep -L "requireAdmin(" "$f" && echo "MISSING in $f"
done  # → empty

# admin layout exists
test -f src/app/admin/layout.tsx && echo OK

# argon2 used
grep -l "argon2" src/app/api/auth/  # → both signup and login
```

All checks: pass.

- [ ] **Step 3: Push**

```bash
git push origin sync/april-2026
git checkout main && git merge --ff-only sync/april-2026 && git push origin main
git checkout sync/april-2026
```

- [ ] **Step 4: Deploy to VPS**

```bash
ssh root@173.242.60.76 "cd /opt/studio/nexy/src && git pull origin main && bash deploy/bootstrap.sh"
```

If `argon2` native binding fails to build inside Docker (alpine compatibility): document the failure and switch to `bcrypt` (similar API, broader binding support). Re-run Task 5+6 swap.

- [ ] **Step 5: Update `.env` on VPS to add `ADMIN_EMAILS`**

```bash
ssh root@173.242.60.76 "grep -q ADMIN_EMAILS /opt/studio/nexy/.env || echo 'ADMIN_EMAILS=alex@skill.im' >> /opt/studio/nexy/.env"
docker restart nexy-web
```

- [ ] **Step 6: Smoke**

```bash
ssh root@173.242.60.76 "curl -fsS http://127.0.0.1:3002/api/health"
ssh root@173.242.60.76 "curl -i http://127.0.0.1:3002/api/admin/users 2>&1 | head -1"  # 401 expected
```

---

## Notes for the implementer

- **argon2 in Docker on alpine:** the `argon2` package has a native binding. If `npm install argon2` fails in the build stage of `deploy/Dockerfile.web`, add `apk add --no-cache python3 make g++` to the `deps` stage, OR switch to `bcrypt` package which has wider prebuilt binary coverage. Either way, verify the build step succeeds before committing the dep change.

- **Lazy migration is one-way:** once we drop SHA-256 verify support (out of scope here), legacy users still on SHA-256 are locked out. Keep the dual-format login path until traffic data shows zero legacy hashes for a sustained period (track via `SELECT count(*) FROM profiles WHERE password_hash NOT LIKE '$argon2%'`).

- **Admin email list is in env, not DB:** if you need to add/remove admins after deploy, `nano /opt/studio/nexy/.env` + `docker restart nexy-web`. No DB migration involved.

- **Testing /api/admin without DB state:** unit tests can mock `getCurrentUser` and call route handlers directly. Integration tests need a real cookie. Ad-hoc verification via `curl` is sufficient for this phase.

- **If `npm test` runs find errors during 4b:** likely cause is a removed function still referenced in tests. Phase 1 tests don't touch DB, so they should be unaffected. If a test fails, investigate before committing.
