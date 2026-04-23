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
} as unknown as ImageAnalysis);

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
