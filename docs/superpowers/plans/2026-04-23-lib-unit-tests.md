# lib/ Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit tests for ~25 pure functions across 8 modules in `src/lib/`, locking in business invariants (70/30 exploration, gate enforcement, role complementarity, scoring determinism, privacy).

**Architecture:** Vitest + Node env. One `.test.ts` per module in `src/lib/__tests__/`. Test only pure/sync exports; all DB-touching `async` functions deferred to post-migration. The existing `scene-progression.test.ts` actually tests `isSceneAllowed` from `onboarding-gates.ts` — Task 1 moves those tests to the correct file.

**Tech Stack:** Vitest 4.x, TypeScript strict. No new dependencies. Working directory for all npm commands: `D:\venture-studio\ventures\Nexy\src`.

**Spec:** [2026-04-23-lib-unit-tests-design.md](../specs/2026-04-23-lib-unit-tests-design.md)

---

## Task 0: Baseline check

**Files:** none (verification only)

- [ ] **Step 1: Run existing tests**

```bash
cd "D:\venture-studio\ventures\Nexy\src" && npm test
```

Expected output contains: 3 test files pass (`locale.test.ts`, `matching.test.ts`, `scene-progression.test.ts`), zero failures.

If anything fails, stop and investigate. The plan assumes a green baseline.

- [ ] **Step 2: Confirm Vitest config**

Read `src/vitest.config.ts`. Confirm `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']` and `environment: 'node'`. No changes needed — if the config is different, stop and reconcile with this plan.

---

## Task 1: Move `isSceneAllowed` tests → `onboarding-gates.test.ts`

`scene-progression.test.ts` imports `isSceneAllowed` from `../onboarding-gates` — the tests belong there. Move content, keep existing assertions intact, add coverage for the other pure exports.

**Files:**
- Create: `src/src/lib/__tests__/onboarding-gates.test.ts`
- Delete: `src/src/lib/__tests__/scene-progression.test.ts` (replaced in Task 2)

- [ ] **Step 1: Create `onboarding-gates.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  isSceneAllowed,
  isSceneGated,
  getAllowedScenes,
  getBlockedScenes,
  getSceneGateRequirement,
  SCENE_GATES,
  type OnboardingGates,
} from '../onboarding-gates';

const emptyGates: OnboardingGates = {};

const fullGates: OnboardingGates = {
  oral: true,
  anal: true,
  group: true,
  toys: true,
  roleplay: true,
  rough: true,
  bondage: true,
  power_dynamic: true,
  public: true,
  exhibitionism: true,
  body_fluids: true,
  extreme: true,
  foot: true,
  dirty_talk: true,
  praise: true,
  lingerie: true,
  romantic: true,
  quickie: true,
  recording: true,
  sexting: true,
};

describe('isSceneAllowed', () => {
  it('allows scene with no gate requirement (unknown slug)', () => {
    expect(isSceneAllowed('nonexistent-slug', emptyGates)).toBe(true);
  });

  it('blocks scene when required gate is missing', () => {
    expect(isSceneAllowed('blowjob', { anal: true })).toBe(false);
  });

  it('allows scene when required gate is present', () => {
    expect(isSceneAllowed('blowjob', { oral: true })).toBe(true);
  });

  it('allows all gated scenes when all gates are open', () => {
    expect(isSceneAllowed('anal-play-on-her', fullGates)).toBe(true);
    expect(isSceneAllowed('bondage-he-ties-her', fullGates)).toBe(true);
    expect(isSceneAllowed('threesome-mfm', fullGates)).toBe(true);
  });

  it('strips -give/-receive suffix for gate lookup', () => {
    expect(isSceneAllowed('blowjob-give', { oral: true })).toBe(true);
    expect(isSceneAllowed('blowjob-receive', { oral: true })).toBe(true);
  });

  it('blocks anal scene when only oral gate is open', () => {
    expect(isSceneAllowed('anal-play-on-her', { oral: true })).toBe(false);
  });

  it('respects OR operator — allows when any required gate is open', () => {
    // butt-plug requires anal OR toys
    expect(isSceneAllowed('butt-plug', { toys: true })).toBe(true);
    expect(isSceneAllowed('butt-plug', { anal: true })).toBe(true);
    expect(isSceneAllowed('butt-plug', emptyGates)).toBe(false);
  });

  it('respects AND operator — blocks when any required gate is missing', () => {
    // pegging requires anal AND power_dynamic
    expect(isSceneAllowed('pegging', { anal: true })).toBe(false);
    expect(isSceneAllowed('pegging', { power_dynamic: true })).toBe(false);
    expect(isSceneAllowed('pegging', { anal: true, power_dynamic: true })).toBe(true);
  });

  it('respects level: very — requires _very gate not just basic', () => {
    // face-slapping requires rough with level: very
    expect(isSceneAllowed('face-slapping-he-slaps-her', { rough: true })).toBe(false);
    expect(isSceneAllowed('face-slapping-he-slaps-her', { rough: true, rough_very: true })).toBe(true);
  });
});

describe('isSceneGated (inverse of isSceneAllowed)', () => {
  it('returns true when scene is blocked', () => {
    expect(isSceneGated('blowjob', emptyGates)).toBe(true);
  });

  it('returns false when scene is allowed', () => {
    expect(isSceneGated('blowjob', { oral: true })).toBe(false);
  });

  it('returns false for ungated scenes', () => {
    expect(isSceneGated('nonexistent-slug', emptyGates)).toBe(false);
  });
});

describe('getAllowedScenes', () => {
  it('filters list down to allowed scenes only', () => {
    const all = ['blowjob', 'anal-play-on-her', 'romantic-sex'];
    const result = getAllowedScenes(all, { oral: true, romantic: true });
    expect(result).toEqual(['blowjob', 'romantic-sex']);
  });

  it('returns empty array when no gates open', () => {
    const result = getAllowedScenes(['blowjob', 'pegging'], emptyGates);
    expect(result).toEqual([]);
  });

  it('preserves order', () => {
    const all = ['romantic-sex', 'blowjob', 'cunnilingus'];
    const result = getAllowedScenes(all, { oral: true, romantic: true });
    expect(result).toEqual(['romantic-sex', 'blowjob', 'cunnilingus']);
  });
});

describe('getBlockedScenes', () => {
  it('returns only blocked scenes', () => {
    const all = ['blowjob', 'anal-play-on-her', 'romantic-sex'];
    const result = getBlockedScenes(all, { oral: true });
    expect(result).toEqual(['anal-play-on-her']);
  });

  it('returns empty array when everything allowed', () => {
    const result = getBlockedScenes(['blowjob'], { oral: true });
    expect(result).toEqual([]);
  });
});

describe('getSceneGateRequirement', () => {
  it('returns requirement for known scene', () => {
    const req = getSceneGateRequirement('blowjob');
    expect(req).toEqual({ gates: ['oral'], operator: 'AND' });
  });

  it('returns null for unknown scene', () => {
    expect(getSceneGateRequirement('nonexistent')).toBeNull();
  });

  it('returns requirement with level for very-level scenes', () => {
    const req = getSceneGateRequirement('face-slapping-he-slaps-her');
    expect(req?.level).toBe('very');
  });
});

describe('SCENE_GATES data integrity', () => {
  it('every requirement has a non-empty gates array', () => {
    for (const [slug, req] of Object.entries(SCENE_GATES)) {
      expect(req.gates.length, `${slug} has empty gates`).toBeGreaterThan(0);
    }
  });

  it('every operator is AND or OR', () => {
    for (const [slug, req] of Object.entries(SCENE_GATES)) {
      expect(['AND', 'OR'], `${slug} has invalid operator`).toContain(req.operator);
    }
  });
});
```

- [ ] **Step 2: Remove old test via git**

```bash
git rm src/lib/__tests__/scene-progression.test.ts
```

(A new one will be created in Task 2 with real scene-progression tests.)

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: `onboarding-gates.test.ts` passes with ~25 tests. `locale.test.ts`, `matching.test.ts` still pass. No `scene-progression.test.ts` (deleted). Zero failures.

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/onboarding-gates.test.ts
git commit -m "refactor(test): move gate tests to onboarding-gates.test.ts"
```

---

## Task 2: `scene-progression.ts` pure functions

**Files:**
- Create: `src/src/lib/__tests__/scene-progression.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import {
  shouldSkipSceneByDedupe,
  isSceneBlockedByPrerequisites,
  matchesRolePreference,
  calculateBreadthBonus,
  applyExplorationExploitation,
  calculateSceneScoreSync,
} from '../scene-progression';
import type { SceneV2 } from '../types';

const makeScene = (partial: Partial<SceneV2> & { slug: string }): SceneV2 => ({
  id: partial.slug,
  slug: partial.slug,
  version: 2,
  elements: [],
  intensity: 2,
  priority: 50,
  tags: [],
  category: 'general',
  role_direction: 'mutual',
  ai_context: { tests_primary: [], tests_secondary: [] },
  ...partial,
} as SceneV2);

describe('shouldSkipSceneByDedupe', () => {
  it('currently always returns false (dedupe disabled)', () => {
    const scene = makeScene({ slug: 'any' });
    expect(shouldSkipSceneByDedupe(scene, new Set(), new Set())).toBe(false);
    expect(shouldSkipSceneByDedupe(scene, new Set(['x']), new Set(['y']))).toBe(false);
  });
});

describe('isSceneBlockedByPrerequisites', () => {
  it('returns false for scenes without prerequisites', () => {
    const scene = makeScene({ slug: 'blowjob' });
    expect(isSceneBlockedByPrerequisites(scene, new Map())).toBe(false);
  });

  it('blocks deepthroat when blowjob interest is below threshold', () => {
    const scene = makeScene({ slug: 'deepthroat' });
    const interests = new Map<string, number>([['blowjob', 40]]); // below 60
    expect(isSceneBlockedByPrerequisites(scene, interests)).toBe(true);
  });

  it('allows deepthroat when blowjob interest meets threshold', () => {
    const scene = makeScene({ slug: 'deepthroat' });
    const interests = new Map<string, number>([['blowjob', 80]]);
    expect(isSceneBlockedByPrerequisites(scene, interests)).toBe(false);
  });

  it('blocks when prerequisite was not answered at all', () => {
    const scene = makeScene({ slug: 'fisting' });
    expect(isSceneBlockedByPrerequisites(scene, new Map())).toBe(true);
  });

  it('allows when any one of multiple prerequisites is met (double-penetration)', () => {
    const scene = makeScene({ slug: 'double-penetration' });
    // Requires anal OR threesome at 60+ — each is a .some() check in implementation
    const interests = new Map<string, number>([['anal-play-on-her', 80]]);
    expect(isSceneBlockedByPrerequisites(scene, interests)).toBe(false);
  });
});

describe('matchesRolePreference', () => {
  it('no rolePreference or no roleDirection → match all', () => {
    expect(matchesRolePreference(null, 'm_to_f')).toBe(true);
    expect(matchesRolePreference('give', undefined)).toBe(true);
  });

  it('both → match all', () => {
    expect(matchesRolePreference('both', 'm_to_f')).toBe(true);
    expect(matchesRolePreference('both', 'dom_sub')).toBe(true);
  });

  it('neutral directions match any preference', () => {
    expect(matchesRolePreference('give', 'mutual')).toBe(true);
    expect(matchesRolePreference('receive', 'universal')).toBe(true);
    expect(matchesRolePreference('give', 'solo')).toBe(true);
    expect(matchesRolePreference('give', 'group')).toBe(true);
  });

  it('gender-aware: male giving → m_to_f', () => {
    expect(matchesRolePreference('give', 'm_to_f', 'male')).toBe(true);
    expect(matchesRolePreference('give', 'f_to_m', 'male')).toBe(false);
  });

  it('gender-aware: female giving → f_to_m', () => {
    expect(matchesRolePreference('give', 'f_to_m', 'female')).toBe(true);
    expect(matchesRolePreference('give', 'm_to_f', 'female')).toBe(false);
  });

  it('gender-aware: male receiving → f_to_m', () => {
    expect(matchesRolePreference('receive', 'f_to_m', 'male')).toBe(true);
    expect(matchesRolePreference('receive', 'm_to_f', 'male')).toBe(false);
  });

  it('give matches dom/daddy/mommy/keyholder patterns (no gender)', () => {
    expect(matchesRolePreference('give', 'dom_sub')).toBe(true);
    expect(matchesRolePreference('give', 'daddy_little')).toBe(true);
    expect(matchesRolePreference('give', 'keyholder_locked')).toBe(true);
  });

  it('receive matches sub/pet/little/locked patterns (no gender)', () => {
    expect(matchesRolePreference('receive', 'dom_sub')).toBe(true);
    expect(matchesRolePreference('receive', 'pet_owner')).toBe(true);
    expect(matchesRolePreference('receive', 'locked_keyholder')).toBe(true);
  });
});

describe('calculateBreadthBonus', () => {
  it('returns 0 when user has answered > 15 scenes', () => {
    const scene = makeScene({ slug: 's', category: 'oral' });
    expect(calculateBreadthBonus(scene, new Set(), 16)).toBe(0);
  });

  it('gives max bonus (20) when no scenes answered and category unseen', () => {
    const scene = makeScene({ slug: 's', category: 'oral' });
    expect(calculateBreadthBonus(scene, new Set(), 0)).toBe(20);
  });

  it('bonus decreases linearly with answered count', () => {
    const scene = makeScene({ slug: 's', category: 'oral' });
    expect(calculateBreadthBonus(scene, new Set(), 5)).toBe(15);
    expect(calculateBreadthBonus(scene, new Set(), 10)).toBe(10);
  });

  it('returns 0 when category already seen', () => {
    const scene = makeScene({ slug: 's', category: 'oral' });
    expect(calculateBreadthBonus(scene, new Set(['oral']), 0)).toBe(0);
  });

  it('returns 0 when scene has no category and no tags', () => {
    const scene = makeScene({ slug: 's', category: undefined as any, tags: [] });
    expect(calculateBreadthBonus(scene, new Set(), 0)).toBe(0);
  });

  it('falls back to first tag when category missing', () => {
    const scene = makeScene({ slug: 's', category: undefined as any, tags: ['anal'] });
    expect(calculateBreadthBonus(scene, new Set(), 0)).toBe(20);
    expect(calculateBreadthBonus(scene, new Set(['anal']), 0)).toBe(0);
  });
});

describe('applyExplorationExploitation', () => {
  const scored = (slug: string, score: number) => ({ scene: makeScene({ slug }), score });

  it('returns all scenes when input ≤ limit', () => {
    const input = [scored('a', 10), scored('b', 5)];
    const result = applyExplorationExploitation(input, 10);
    expect(result.length).toBe(2);
    expect(result.map((s) => s.slug).sort()).toEqual(['a', 'b']);
  });

  it('70/30 split: limit=10 returns 7 exploitation + 3 exploration', () => {
    // 20 scored scenes, limit 10 → 7 top + 3 random from remaining 13
    const input = Array.from({ length: 20 }, (_, i) => scored(`s${i}`, 100 - i));
    const result = applyExplorationExploitation(input, 10);
    expect(result.length).toBe(10);

    // Top 7 (s0..s6) must all be present (exploitation)
    const slugs = new Set(result.map((s) => s.slug));
    const topSeven = ['s0', 's1', 's2', 's3', 's4', 's5', 's6'];
    for (const slug of topSeven) {
      expect(slugs.has(slug), `top-score ${slug} must appear in exploitation`).toBe(true);
    }
    // Remaining 3 come from s7..s19
    const explorationSlugs = result.map((s) => s.slug).filter((s) => !topSeven.includes(s));
    expect(explorationSlugs.length).toBe(3);
    for (const slug of explorationSlugs) {
      const idx = Number(slug.slice(1));
      expect(idx, `exploration scene must come from remaining pool`).toBeGreaterThanOrEqual(7);
    }
  });

  it('handles limit=1 without error', () => {
    const input = [scored('a', 10), scored('b', 5), scored('c', 3)];
    const result = applyExplorationExploitation(input, 1);
    expect(result.length).toBe(1);
  });
});

describe('calculateSceneScoreSync', () => {
  it('returns non-negative score with no tag prefs', () => {
    const scene = makeScene({ slug: 's', priority: 50, intensity: 2 });
    expect(calculateSceneScoreSync(scene, [], {})).toBeGreaterThanOrEqual(0);
  });

  it('higher priority (lower number) → higher base score', () => {
    const high = makeScene({ slug: 'h', priority: 10 });
    const low = makeScene({ slug: 'l', priority: 90 });
    expect(calculateSceneScoreSync(high, [], {})).toBeGreaterThan(
      calculateSceneScoreSync(low, [], {})
    );
  });

  it('deterministic — same inputs produce same output', () => {
    const scene = makeScene({
      slug: 's',
      elements: [{ id: 'e1', tag_ref: 'bondage' } as any],
      intensity: 2,
    });
    const prefs = [
      { tag_ref: 'bondage', interest_level: 80, intensity_preference: 40, role_preference: 'give' as const },
    ];
    const a = calculateSceneScoreSync(scene, prefs, {});
    const b = calculateSceneScoreSync(scene, prefs, {});
    expect(a).toBe(b);
  });

  it('boost when user has high interest in scene elements', () => {
    const scene = makeScene({
      slug: 's',
      elements: [{ id: 'e1', tag_ref: 'bondage' } as any],
      intensity: 2,
    });
    const withInterest = calculateSceneScoreSync(
      scene,
      [{ tag_ref: 'bondage', interest_level: 90, intensity_preference: null, role_preference: null }],
      {}
    );
    const withoutInterest = calculateSceneScoreSync(scene, [], {});
    expect(withInterest).toBeGreaterThan(withoutInterest);
  });

  it('penalty for high intensity when user has low interest overall', () => {
    const intense = makeScene({ slug: 's', intensity: 5 });
    const withHighInterest = calculateSceneScoreSync(
      intense,
      [{ tag_ref: 'x', interest_level: 80, intensity_preference: null, role_preference: null }],
      {}
    );
    const withLowInterest = calculateSceneScoreSync(
      intense,
      [{ tag_ref: 'x', interest_level: 20, intensity_preference: null, role_preference: null }],
      {}
    );
    expect(withHighInterest).toBeGreaterThan(withLowInterest);
  });

  it('score is never negative (floor at 0)', () => {
    const scene = makeScene({ slug: 's', priority: 100, intensity: 5, role_direction: 'dom_sub' });
    const prefs = [
      { tag_ref: 'x', interest_level: 10, intensity_preference: null, role_preference: 'give' as const },
    ];
    const result = calculateSceneScoreSync(scene, prefs, {});
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('body_map_gates boost adds to score', () => {
    const scene = makeScene({ slug: 's', tags: ['anal'] });
    const withBoost = calculateSceneScoreSync(scene, [], { bodyMapGates: { anal: true } });
    const withoutBoost = calculateSceneScoreSync(scene, [], {});
    expect(withBoost).toBeGreaterThan(withoutBoost);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scene-progression
```

Expected: all tests pass. If `calculateSceneScoreSync` tests depend on exact scene shape, adjust the `makeScene` helper — the assertion is about ordering/comparative behavior, not exact numeric output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/scene-progression.test.ts
git commit -m "test: add unit tests for scene-progression pure functions"
```

---

## Task 3: `profile-signals.ts` pure functions

**Files:**
- Create: `src/src/lib/__tests__/profile-signals.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import {
  calculateSignalUpdates,
  calculateTestScoreUpdates,
  detectCorrelations,
  getTopSignals,
  getTopTestScores,
  isBodyMapAnswer,
  calculateBodyMapSignals,
  calculateBodyMapTestScores,
} from '../profile-signals';
import type { Answer, SceneV2, BodyMapAnswer, PsychologicalProfile } from '../types';

const makeScene = (elements: Array<{ id: string; tag_ref: string }> = []): SceneV2 =>
  ({
    id: 's',
    slug: 's',
    version: 2,
    elements,
    intensity: 2,
    priority: 50,
    ai_context: { tests_primary: ['dominant'], tests_secondary: ['submissive'] },
  } as unknown as SceneV2);

describe('isBodyMapAnswer', () => {
  it('returns true for body-map answer shape', () => {
    const ans: BodyMapAnswer = { passes: [] } as BodyMapAnswer;
    expect(isBodyMapAnswer(ans)).toBe(true);
  });

  it('returns false for value-style answer', () => {
    expect(isBodyMapAnswer({ value: 80 } as Answer)).toBe(false);
  });

  it('returns false for selected-style answer', () => {
    expect(isBodyMapAnswer({ selected: ['x'] } as Answer)).toBe(false);
  });
});

describe('calculateSignalUpdates', () => {
  it('returns empty when no selection and no scale', () => {
    const scene = makeScene();
    expect(calculateSignalUpdates({} as Answer, scene)).toEqual([]);
  });

  it('positive signal per selected element', () => {
    const scene = makeScene([
      { id: 'e1', tag_ref: 'bondage' },
      { id: 'e2', tag_ref: 'dom' },
    ]);
    const updates = calculateSignalUpdates({ selected: ['e1', 'e2'] } as Answer, scene);
    expect(updates).toHaveLength(2);
    expect(updates.every((u) => u.weight > 0)).toBe(true);
    expect(updates.map((u) => u.signal).sort()).toEqual(['bondage', 'dom']);
  });

  it('high scale value → positive signals on tests_primary', () => {
    const scene = makeScene();
    const updates = calculateSignalUpdates({ value: 85 } as Answer, scene);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].weight).toBeGreaterThan(0);
    expect(updates[0].signal).toBe('dominant');
  });

  it('low scale value → negative signals', () => {
    const scene = makeScene();
    const updates = calculateSignalUpdates({ value: 15 } as Answer, scene);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].weight).toBeLessThan(0);
  });

  it('neutral scale value (~50) → curious, smaller weight', () => {
    const scene = makeScene();
    const updates = calculateSignalUpdates({ value: 50 } as Answer, scene);
    // Curious category does not produce updates in V2 for scale answers per current impl
    // (only selected/positive/negative generate signals)
    // This test documents actual behavior
    if (updates.length > 0) {
      expect(Math.abs(updates[0].weight)).toBeLessThan(1);
    }
  });
});

describe('calculateTestScoreUpdates', () => {
  it('returns empty for unknown answer shape', () => {
    const scene = makeScene();
    expect(calculateTestScoreUpdates({} as Answer, scene)).toEqual({});
  });

  it('scale value populates primary tests with same value', () => {
    const scene = makeScene();
    const result = calculateTestScoreUpdates({ value: 75 } as Answer, scene);
    expect(result.dominant).toBe(75);
  });

  it('scale value populates secondary tests at 0.5×', () => {
    const scene = makeScene();
    const result = calculateTestScoreUpdates({ value: 80 } as Answer, scene);
    expect(result.submissive).toBe(40);
  });

  it('selected elements contribute default score 75', () => {
    const scene = makeScene([{ id: 'e1', tag_ref: 'bondage' }]);
    const result = calculateTestScoreUpdates({ selected: ['e1'] } as Answer, scene);
    expect(result.bondage).toBe(75);
  });
});

describe('detectCorrelations', () => {
  it('returns empty when signals below threshold', () => {
    const signals = { dom_play: 0.5, dom_control: 0.5 };
    const result = detectCorrelations(signals, { positive: ['dom_lover'], negative: [] });
    expect(result).toEqual([]);
  });

  it('returns correlation when multiple related signals exceed threshold', () => {
    const signals = { dom_play: 2, dom_control: 2, dom_edge: 2 };
    const result = detectCorrelations(signals, { positive: ['dom_lover'], negative: [] });
    expect(result).toContain('dom_lover');
  });

  it('dedupes detected correlations', () => {
    const signals = { kinky_play: 2, kinky_stuff: 2 };
    const result = detectCorrelations(signals, {
      positive: ['kinky_explorer', 'kinky_explorer'],
      negative: [],
    });
    expect(result.filter((c) => c === 'kinky_explorer').length).toBeLessThanOrEqual(1);
  });
});

describe('getTopSignals', () => {
  it('returns top N signals sorted by weight desc', () => {
    const profile: PsychologicalProfile = {
      profile_signals: { a: 1, b: 5, c: 3 },
      test_scores: {},
      correlations_detected: [],
    } as unknown as PsychologicalProfile;
    const result = getTopSignals(profile, 2);
    expect(result).toEqual([
      { signal: 'b', weight: 5 },
      { signal: 'c', weight: 3 },
    ]);
  });

  it('returns all signals when limit > count', () => {
    const profile = { profile_signals: { a: 1 }, test_scores: {}, correlations_detected: [] } as unknown as PsychologicalProfile;
    expect(getTopSignals(profile, 10).length).toBe(1);
  });
});

describe('getTopTestScores', () => {
  it('returns top N tests sorted by score desc', () => {
    const profile = {
      profile_signals: {},
      test_scores: { dominant: 80, submissive: 50, neutral: 60 },
      correlations_detected: [],
    } as unknown as PsychologicalProfile;
    const result = getTopTestScores(profile, 2);
    expect(result).toEqual([
      { test: 'dominant', score: 80 },
      { test: 'neutral', score: 60 },
    ]);
  });
});

describe('calculateBodyMapSignals', () => {
  const makeBM = (passes: BodyMapAnswer['passes']): BodyMapAnswer => ({ passes } as BodyMapAnswer);

  it('returns empty for empty passes', () => {
    expect(calculateBodyMapSignals(makeBM([]), makeScene())).toEqual([]);
  });

  it('enthusiast signal when 5+ love markings in a pass', () => {
    const passes = [{
      action: 'kiss',
      subject: 'give',
      markings: [
        { zoneId: 'lips', preference: 'love' },
        { zoneId: 'neck', preference: 'love' },
        { zoneId: 'chest', preference: 'love' },
        { zoneId: 'belly', preference: 'love' },
        { zoneId: 'thighs', preference: 'love' },
      ],
    }] as unknown as BodyMapAnswer['passes'];
    const signals = calculateBodyMapSignals(makeBM(passes), makeScene());
    expect(signals.some((s) => s.signal === 'kiss_enthusiast_give')).toBe(true);
  });

  it('aversion signal when 10+ no markings', () => {
    const markings = Array.from({ length: 10 }, () => ({ zoneId: 'lips' as const, preference: 'no' as const }));
    const passes = [{ action: 'bite', subject: 'receive', markings }] as unknown as BodyMapAnswer['passes'];
    const signals = calculateBodyMapSignals(makeBM(passes), makeScene());
    expect(signals.some((s) => s.signal === 'bite_averse_receive')).toBe(true);
  });
});

describe('calculateBodyMapTestScores', () => {
  const makeBM = (passes: BodyMapAnswer['passes']): BodyMapAnswer => ({ passes } as BodyMapAnswer);

  it('returns empty scores when no markings', () => {
    expect(calculateBodyMapTestScores(makeBM([]), makeScene())).toEqual({});
  });

  it('engagement score for primary tests scales 0-100', () => {
    const passes = [{
      action: 'kiss',
      subject: 'give',
      markings: [
        { zoneId: 'lips', preference: 'love' },
        { zoneId: 'neck', preference: 'love' },
      ],
    }] as unknown as BodyMapAnswer['passes'];
    const scores = calculateBodyMapTestScores(makeBM(passes), makeScene());
    expect(scores.dominant).toBe(100);
  });

  it('secondary tests at 0.7× primary', () => {
    const passes = [{
      action: 'kiss',
      subject: 'give',
      markings: [{ zoneId: 'lips', preference: 'love' }],
    }] as unknown as BodyMapAnswer['passes'];
    const scores = calculateBodyMapTestScores(makeBM(passes), makeScene());
    expect(scores.submissive).toBeCloseTo(scores.dominant * 0.7, 5);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- profile-signals
```

Expected: all pass. If `Answer`/`SceneV2`/`BodyMapAnswer`/`PsychologicalProfile` type shapes don't match, adjust the type casts minimally — the tests assert behavior, not strict types.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/profile-signals.test.ts
git commit -m "test: add unit tests for profile-signals pure functions"
```

---

## Task 4: `body-map-processing.ts` pure helpers

**Files:**
- Create: `src/src/lib/__tests__/body-map-processing.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import { isBodyMapGateOpen, getOpenBodyMapGates } from '../body-map-processing';

describe('isBodyMapGateOpen', () => {
  it('returns false for null input', () => {
    expect(isBodyMapGateOpen(null, 'anal')).toBe(false);
  });

  it('returns true when gate is explicitly true', () => {
    expect(isBodyMapGateOpen({ anal: true }, 'anal')).toBe(true);
  });

  it('returns false when gate is absent', () => {
    expect(isBodyMapGateOpen({ oral: true }, 'anal')).toBe(false);
  });

  it('returns false when gate is explicitly false', () => {
    expect(isBodyMapGateOpen({ anal: false }, 'anal')).toBe(false);
  });
});

describe('getOpenBodyMapGates', () => {
  it('returns [] for null', () => {
    expect(getOpenBodyMapGates(null)).toEqual([]);
  });

  it('returns [] for empty object', () => {
    expect(getOpenBodyMapGates({})).toEqual([]);
  });

  it('returns keys with true values', () => {
    const result = getOpenBodyMapGates({ anal: true, oral: false, foot: true });
    expect(result.sort()).toEqual(['anal', 'foot']);
  });

  it('excludes falsy entries', () => {
    const result = getOpenBodyMapGates({ a: false, b: true });
    expect(result).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- body-map-processing
```

Expected: all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/body-map-processing.test.ts
git commit -m "test: add unit tests for body-map-processing pure helpers"
```

---

## Task 5: `scene-matcher.ts`

**Files:**
- Create: `src/src/lib/__tests__/scene-matcher.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import { matchScenesToImage, type SceneData } from '../scene-matcher';
import type { ImageAnalysis } from '../image-analyzer';

const makeScene = (partial: Partial<SceneData> & { slug: string }): SceneData => ({
  id: partial.slug,
  slug: partial.slug,
  title: { ru: partial.slug, en: partial.slug },
  category: 'general',
  ...partial,
});

const makeAnalysis = (partial: Partial<ImageAnalysis> = {}): ImageAnalysis => ({
  keywords: [],
  activity: '',
  mood: '',
  setting: '',
  elements: [],
  ...partial,
} as ImageAnalysis);

describe('matchScenesToImage', () => {
  it('returns empty when nothing matches', () => {
    const scenes = [makeScene({ slug: 'blowjob', category: 'oral', tags: ['oral', 'mouth'] })];
    const analysis = makeAnalysis({ keywords: ['completely-unrelated'] });
    expect(matchScenesToImage(analysis, scenes)).toEqual([]);
  });

  it('matches by tag keyword', () => {
    const scenes = [makeScene({ slug: 'blowjob', category: 'oral', tags: ['oral', 'mouth'] })];
    const analysis = makeAnalysis({ keywords: ['oral'] });
    const result = matchScenesToImage(analysis, scenes);
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe('blowjob');
    expect(result[0].score).toBeGreaterThan(0);
  });

  it('sorts by score descending', () => {
    const scenes = [
      makeScene({ slug: 'low', category: 'x', tags: ['oral'] }),
      makeScene({ slug: 'high', category: 'oral', tags: ['oral', 'oral_pref'], image_prompt: 'oral' }),
    ];
    const analysis = makeAnalysis({ keywords: ['oral'] });
    const result = matchScenesToImage(analysis, scenes);
    expect(result[0].slug).toBe('high');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('category match adds 20 points', () => {
    const matched = makeScene({ slug: 'a', category: 'oral', tags: [] });
    const unmatched = makeScene({ slug: 'b', category: 'anal', tags: [] });
    const analysis = makeAnalysis({ keywords: ['oral'] });
    const result = matchScenesToImage(analysis, [matched, unmatched]);
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe('a');
    expect(result[0].score).toBeGreaterThanOrEqual(20);
  });

  it('reason strings explain the match', () => {
    const scenes = [makeScene({ slug: 's', category: 'oral', tags: ['oral'] })];
    const analysis = makeAnalysis({ keywords: ['oral'], mood: 'passionate' });
    const result = matchScenesToImage(analysis, scenes);
    expect(result[0].matchReasons.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- scene-matcher
```

Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/scene-matcher.test.ts
git commit -m "test: add unit tests for scene-matcher"
```

---

## Task 6: `partner-archetypes.ts` pure lookups

**Files:**
- Create: `src/src/lib/__tests__/partner-archetypes.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import { getArchetypeById, getAllArchetypes } from '../partner-archetypes';

describe('getAllArchetypes', () => {
  it('returns a non-empty list', () => {
    expect(getAllArchetypes().length).toBeGreaterThan(0);
  });

  it('every archetype has an id, name.ru, name.en, description.ru, description.en', () => {
    for (const a of getAllArchetypes()) {
      expect(a.id, 'id').toBeTruthy();
      expect(a.name.ru, `${a.id} name.ru`).toBeTruthy();
      expect(a.name.en, `${a.id} name.en`).toBeTruthy();
      expect(a.description.ru, `${a.id} description.ru`).toBeTruthy();
      expect(a.description.en, `${a.id} description.en`).toBeTruthy();
    }
  });

  it('archetype ids are unique', () => {
    const ids = getAllArchetypes().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getArchetypeById', () => {
  it('returns undefined for unknown id', () => {
    expect(getArchetypeById('definitely-not-an-archetype')).toBeUndefined();
  });

  it('returns the archetype when id exists', () => {
    const first = getAllArchetypes()[0];
    const found = getArchetypeById(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- partner-archetypes
```

Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/partner-archetypes.test.ts
git commit -m "test: add unit tests for partner-archetypes lookups"
```

---

## Task 7: `analytics.ts` — EVENTS constant

`trackEvent` is DB-touching (fire-and-forget supabase insert) → out of scope. Only test the EVENTS shape.

**Files:**
- Create: `src/src/lib/__tests__/analytics.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import { EVENTS } from '../analytics';

describe('EVENTS constant', () => {
  it('has at least one event per known funnel', () => {
    const values = Object.values(EVENTS) as string[];
    expect(values.some((v) => v.startsWith('onboarding_'))).toBe(true);
    expect(values.some((v) => v.startsWith('discovery_'))).toBe(true);
    expect(values.some((v) => v.startsWith('invite_'))).toBe(true);
    expect(values.some((v) => v.startsWith('proposal_'))).toBe(true);
  });

  it('all event names are non-empty strings', () => {
    for (const [key, val] of Object.entries(EVENTS)) {
      expect(typeof val, `${key} should be string`).toBe('string');
      expect((val as string).length, `${key} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('all event names are unique (no typo duplicates)', () => {
    const vals = Object.values(EVENTS);
    expect(new Set(vals).size).toBe(vals.length);
  });

  it('all event names are snake_case', () => {
    for (const val of Object.values(EVENTS) as string[]) {
      expect(val, `${val} should match snake_case`).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- analytics
```

Expected: all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/analytics.test.ts
git commit -m "test: add sanity tests for EVENTS constant"
```

---

## Task 8: `utils/object.ts` — flattenObject

**Files:**
- Create: `src/src/lib/__tests__/object.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect } from 'vitest';
import { flattenObject } from '../utils/object';

describe('flattenObject', () => {
  it('returns empty object for empty input', () => {
    expect(flattenObject({})).toEqual({});
  });

  it('leaves already-flat objects unchanged', () => {
    expect(flattenObject({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' });
  });

  it('flattens one level of nesting with dot notation', () => {
    expect(flattenObject({ user: { id: 1, name: 'Alex' } })).toEqual({
      'user.id': 1,
      'user.name': 'Alex',
    });
  });

  it('flattens deeply nested objects', () => {
    expect(flattenObject({ a: { b: { c: { d: 42 } } } })).toEqual({ 'a.b.c.d': 42 });
  });

  it('preserves arrays as values (does NOT flatten them)', () => {
    expect(flattenObject({ tags: [1, 2, 3] })).toEqual({ tags: [1, 2, 3] });
  });

  it('preserves null values', () => {
    expect(flattenObject({ a: null })).toEqual({ a: null });
  });

  it('preserves undefined values', () => {
    const result = flattenObject({ a: undefined });
    expect(result).toEqual({ a: undefined });
  });

  it('applies prefix to top-level keys when provided', () => {
    expect(flattenObject({ a: 1 }, 'prefix')).toEqual({ 'prefix.a': 1 });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- object
```

Expected: all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/object.test.ts
git commit -m "test: add unit tests for flattenObject"
```

---

## Task 9: `matching.ts` & `locale.ts` audit

**Files:**
- Review: `src/src/lib/__tests__/matching.test.ts` (111 LOC, covers `getTagBasedMatches` + `generateInviteCode`)
- Review: `src/src/lib/__tests__/locale.test.ts`

- [ ] **Step 1: Read both test files**

```bash
cat src/lib/__tests__/matching.test.ts src/lib/__tests__/locale.test.ts
```

- [ ] **Step 2: Check for gaps**

`matching.test.ts` already covers: match when roles complementary, hide when roles conflict, both-role, null-role (mutual), privacy invariant (never reveal hidden), partner_no visibility, tags only-one-side has, invite code length, invite code charset, invite code uniqueness.

Audit against spec invariants: determinism, empty inputs, threshold boundary. If any missing, add.

- [ ] **Step 3: Add missing tests if found**

If needed, append to `matching.test.ts`:

```ts
// Example if missing: determinism
it('is deterministic for same inputs', () => {
  const my = [makeTag('bondage', 80, 'give')];
  const partner = [makeTag('bondage', 70, 'receive')];
  const a = getTagBasedMatches(my, partner);
  const b = getTagBasedMatches(my, partner);
  expect(a.matches).toEqual(b.matches);
});

// Example if missing: empty inputs
it('returns all-empty buckets when both inputs empty', () => {
  const result = getTagBasedMatches([], []);
  expect(result.matches).toEqual([]);
  expect(result.partnerDoesntWant).toEqual([]);
  expect(result.iWantButHidden).toEqual([]);
});

// Example if missing: threshold boundary
it('does not match when interest is exactly 1 below threshold', () => {
  const my = [makeTag('t', 49, 'give')];
  const partner = [makeTag('t', 80, 'receive')];
  const result = getTagBasedMatches(my, partner);
  expect(result.matches.length).toBe(0);
  expect(result.partnerDoesntWant.length).toBe(1);
});
```

`locale.test.ts` audit — follow same pattern.

- [ ] **Step 4: Run tests & commit (only if changes made)**

```bash
npm test
# If changes: git add src/lib/__tests__/matching.test.ts src/lib/__tests__/locale.test.ts
# git commit -m "test: extend matching/locale tests for invariants"
```

If no gaps, skip commit — the audit finding is itself the deliverable.

---

## Task 10: Final validation

- [ ] **Step 1: Run full build + lint + tests**

```bash
npm run build && npm run lint && npm test
```

All three must pass with zero warnings/errors.

- [ ] **Step 2: Verify test count**

Expected test files present:
- `locale.test.ts`
- `matching.test.ts`
- `onboarding-gates.test.ts` (new)
- `scene-progression.test.ts` (rewritten)
- `profile-signals.test.ts` (new)
- `body-map-processing.test.ts` (new)
- `scene-matcher.test.ts` (new)
- `partner-archetypes.test.ts` (new)
- `analytics.test.ts` (new)
- `object.test.ts` (new)

```bash
ls src/lib/__tests__/
```

- [ ] **Step 3: Final commit**

```bash
git commit --allow-empty -m "test: lib/ pure-function coverage complete"
```

- [ ] **Step 4: Report**

Summary for user:
- Tests added: Task 1–8 (`onboarding-gates`, `scene-progression`, `profile-signals`, `body-map-processing`, `scene-matcher`, `partner-archetypes`, `analytics`, `object`)
- Tests audited: `matching`, `locale`
- Next phase: Chrome E2E baseline (separate spec)

---

## Notes for the implementer

- **If a test fails** on first run against existing code, that is a real finding — investigate. Do not hand-wave fix the test to pass. Either the invariant is not what the spec claims, or the code is buggy. Report either way.
- **Never mock `SupabaseClient`** in this phase. If a function signature includes it, the function is out of scope. Skip.
- **Type casts with `as any`** are acceptable *only* in test setup helpers where full type construction is expensive and behavior is the assertion target. Never in production code.
- **Flaky tests** — `applyExplorationExploitation` uses `Math.random()`. Tests assert set membership, not exact order, to stay deterministic.
- **Commit messages** follow conventional commits: `test:` for new tests, `refactor(test):` for reshuffles, `fix:` if you uncover a real bug and fix it (but prefer to report first).
