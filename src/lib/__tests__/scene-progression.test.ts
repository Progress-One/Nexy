import { describe, it, expect } from 'vitest';
import {
  shouldSkipSceneByDedupe,
  isSceneBlockedByPrerequisites,
  matchesRolePreference,
  calculateBreadthBonus,
  applyExplorationExploitation,
  calculateSceneScoreSync,
} from '../scene-progression';
import type { SceneV2, V2Element } from '../types';

const makeScene = (partial: Partial<SceneV2> & { slug: string }): SceneV2 => ({
  id: partial.slug,
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

  it('falls back to allowing m_to_f/f_to_m for either give or receive without gender', () => {
    expect(matchesRolePreference('give', 'm_to_f')).toBe(true);
    expect(matchesRolePreference('receive', 'f_to_m')).toBe(true);
    expect(matchesRolePreference('give', 'f_to_m')).toBe(true);
    expect(matchesRolePreference('receive', 'm_to_f')).toBe(true);
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
    const scene = makeScene({ slug: 's', category: undefined as unknown as string, tags: [] });
    expect(calculateBreadthBonus(scene, new Set(), 0)).toBe(0);
  });

  it('falls back to first tag when category missing', () => {
    const scene = makeScene({ slug: 's', category: undefined as unknown as string, tags: ['anal'] });
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
      elements: [{ id: 'e1', tag_ref: 'bondage' } as unknown as V2Element],
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
      elements: [{ id: 'e1', tag_ref: 'bondage' } as unknown as V2Element],
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
    const scene = makeScene({ slug: 's', priority: 100, intensity: 5, role_direction: 'm_to_f' });
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
