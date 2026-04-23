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
    const ans = { passes: [] } as unknown as Answer;
    expect(isBodyMapAnswer(ans)).toBe(true);
  });

  it('returns false for value-style answer', () => {
    expect(isBodyMapAnswer({ value: 80 } as unknown as Answer)).toBe(false);
  });

  it('returns false for selected-style answer', () => {
    expect(isBodyMapAnswer({ selected: ['x'] } as unknown as Answer)).toBe(false);
  });
});

describe('calculateSignalUpdates', () => {
  it('returns empty when no selection and no scale', () => {
    const scene = makeScene();
    expect(calculateSignalUpdates({} as unknown as Answer, scene)).toEqual([]);
  });

  it('positive signal per selected element', () => {
    const scene = makeScene([
      { id: 'e1', tag_ref: 'bondage' },
      { id: 'e2', tag_ref: 'dom' },
    ]);
    const updates = calculateSignalUpdates({ selected: ['e1', 'e2'] } as unknown as Answer, scene);
    expect(updates).toHaveLength(2);
    expect(updates.every((u) => u.weight > 0)).toBe(true);
    expect(updates.map((u) => u.signal).sort()).toEqual(['bondage', 'dom']);
  });

  it('high scale value -> positive signals on tests_primary', () => {
    const scene = makeScene();
    const updates = calculateSignalUpdates({ value: 85 } as unknown as Answer, scene);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].weight).toBeGreaterThan(0);
    expect(updates[0].signal).toBe('dominant');
  });

  it('low scale value -> negative signals', () => {
    const scene = makeScene();
    const updates = calculateSignalUpdates({ value: 15 } as unknown as Answer, scene);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].weight).toBeLessThan(0);
  });
});

describe('calculateTestScoreUpdates', () => {
  it('returns empty for unknown answer shape', () => {
    const scene = makeScene();
    expect(calculateTestScoreUpdates({} as unknown as Answer, scene)).toEqual({});
  });

  it('scale value populates primary tests with same value', () => {
    const scene = makeScene();
    const result = calculateTestScoreUpdates({ value: 75 } as unknown as Answer, scene);
    expect(result.dominant).toBe(75);
  });

  it('scale value populates secondary tests at 0.5x', () => {
    const scene = makeScene();
    const result = calculateTestScoreUpdates({ value: 80 } as unknown as Answer, scene);
    expect(result.submissive).toBe(40);
  });

  it('selected elements contribute default score 75', () => {
    const scene = makeScene([{ id: 'e1', tag_ref: 'bondage' }]);
    const result = calculateTestScoreUpdates({ selected: ['e1'] } as unknown as Answer, scene);
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
    const profile = {
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
    const profile = {
      profile_signals: { a: 1 },
      test_scores: {},
      correlations_detected: [],
    } as unknown as PsychologicalProfile;
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
  const makeBM = (passes: unknown[]): BodyMapAnswer =>
    ({ passes } as unknown as BodyMapAnswer);

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
    }];
    const signals = calculateBodyMapSignals(makeBM(passes), makeScene());
    expect(signals.some((s) => s.signal === 'kiss_enthusiast_give')).toBe(true);
  });

  it('aversion signal when 10+ no markings', () => {
    const markings = Array.from({ length: 10 }, () => ({ zoneId: 'lips', preference: 'no' }));
    const passes = [{ action: 'bite', subject: 'receive', markings }];
    const signals = calculateBodyMapSignals(makeBM(passes), makeScene());
    expect(signals.some((s) => s.signal === 'bite_averse_receive')).toBe(true);
  });
});

describe('calculateBodyMapTestScores', () => {
  const makeBM = (passes: unknown[]): BodyMapAnswer =>
    ({ passes } as unknown as BodyMapAnswer);

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
    }];
    const scores = calculateBodyMapTestScores(makeBM(passes), makeScene());
    expect(scores.dominant).toBe(100);
  });

  it('secondary tests at 0.7x primary', () => {
    const passes = [{
      action: 'kiss',
      subject: 'give',
      markings: [{ zoneId: 'lips', preference: 'love' }],
    }];
    const scores = calculateBodyMapTestScores(makeBM(passes), makeScene());
    expect(scores.submissive).toBeCloseTo(scores.dominant * 0.7, 5);
  });
});
