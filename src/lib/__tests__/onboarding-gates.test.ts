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
    // With only `oral` gate open: blowjob allowed; anal-play-on-her blocked (needs anal);
    // romantic-sex blocked (needs romantic).
    const all = ['blowjob', 'anal-play-on-her', 'romantic-sex'];
    const result = getBlockedScenes(all, { oral: true });
    expect(result).toEqual(['anal-play-on-her', 'romantic-sex']);
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
