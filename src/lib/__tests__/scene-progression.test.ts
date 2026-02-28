import { describe, it, expect } from 'vitest';
import { isSceneBlockedByGates } from '../scene-progression';
import type { SceneV2 } from '../types';

const makeScene = (overrides: Partial<SceneV2> = {}): SceneV2 => ({
  id: 'test-scene',
  slug: 'test-scene',
  version: 2,
  title: { ru: 'Test', en: 'Test' },
  description: { ru: 'Test', en: 'Test' },
  category: 'general',
  tags: [],
  intensity: 1,
  is_active: true,
  scene_type: 'swipe',
  ...overrides,
} as SceneV2);

describe('isSceneBlockedByGates', () => {
  it('blocks scene when category gate is closed', () => {
    const scene = makeScene({ category: 'bdsm', tags: ['bondage'] });
    const gates = new Map([['bdsm', false]]);

    expect(isSceneBlockedByGates(scene, gates)).toBe(true);
  });

  it('allows scene when category gate is open', () => {
    const scene = makeScene({ category: 'bdsm', tags: ['bondage'] });
    const gates = new Map([['bdsm', true]]);

    expect(isSceneBlockedByGates(scene, gates)).toBe(false);
  });

  it('blocks scene when any tag gate is closed', () => {
    const scene = makeScene({ category: 'general', tags: ['bondage', 'blindfold'] });
    const gates = new Map([['blindfold', false]]);

    expect(isSceneBlockedByGates(scene, gates)).toBe(true);
  });

  it('allows scene when gates map is empty', () => {
    const scene = makeScene({ category: 'bdsm', tags: ['bondage'] });
    const gates = new Map<string, boolean>();

    expect(isSceneBlockedByGates(scene, gates)).toBe(false);
  });

  it('allows scene when no gate matches', () => {
    const scene = makeScene({ category: 'general', tags: ['kissing'] });
    const gates = new Map([['bdsm', false], ['anal', false]]);

    expect(isSceneBlockedByGates(scene, gates)).toBe(false);
  });

  it('handles scene with no tags', () => {
    const scene = makeScene({ category: 'general', tags: [] });
    const gates = new Map([['bdsm', false]]);

    expect(isSceneBlockedByGates(scene, gates)).toBe(false);
  });

  it('blocks by primary tag (tags[0])', () => {
    const scene = makeScene({ category: 'general', tags: ['bdsm', 'rope'] });
    const gates = new Map([['bdsm', false]]);

    expect(isSceneBlockedByGates(scene, gates)).toBe(true);
  });
});
