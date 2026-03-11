import { describe, it, expect } from 'vitest';
import { isSceneAllowed, type OnboardingGates } from '../onboarding-gates';

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
};

describe('isSceneAllowed', () => {
  it('allows scene with no gate requirement (unknown slug)', () => {
    expect(isSceneAllowed('nonexistent-slug', emptyGates)).toBe(true);
  });

  it('blocks scene when required gate is missing', () => {
    // blowjob requires oral gate
    expect(isSceneAllowed('blowjob', { anal: true })).toBe(false);
  });

  it('allows scene when required gate is present', () => {
    expect(isSceneAllowed('blowjob', { oral: true })).toBe(true);
  });

  it('allows all gated scenes when all gates are open', () => {
    expect(isSceneAllowed('anal-play-on-her', fullGates)).toBe(true);
    expect(isSceneAllowed('bondage-restraint', fullGates)).toBe(true);
    expect(isSceneAllowed('threesome-mfm', fullGates)).toBe(true);
  });

  it('strips -give/-receive suffix for gate lookup', () => {
    expect(isSceneAllowed('blowjob-give', { oral: true })).toBe(true);
    expect(isSceneAllowed('blowjob-receive', { oral: true })).toBe(true);
  });

  it('blocks anal scene when only oral gate is open', () => {
    expect(isSceneAllowed('anal-play-on-her', { oral: true })).toBe(false);
  });

  it('respects OR operator — allows when any gate is open', () => {
    // butt-plug requires anal OR toys
    expect(isSceneAllowed('butt-plug', { toys: true })).toBe(true);
    expect(isSceneAllowed('butt-plug', { anal: true })).toBe(true);
    expect(isSceneAllowed('butt-plug', emptyGates)).toBe(false);
  });

  it('respects AND operator — blocks when only one gate is open', () => {
    // pegging requires anal AND power_dynamic
    expect(isSceneAllowed('pegging', { anal: true })).toBe(false);
    expect(isSceneAllowed('pegging', { anal: true, power_dynamic: true })).toBe(true);
  });
});
