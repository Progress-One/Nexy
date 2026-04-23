import { describe, it, expect } from 'vitest';
import {
  getTagBasedMatches,
  generateInviteCode,
  type TagPreference,
} from '../matching';

describe('getTagBasedMatches', () => {
  const makeTag = (ref: string, interest: number, role: TagPreference['role_preference'] = null): TagPreference => ({
    tag_ref: ref,
    interest_level: interest,
    role_preference: role,
  });

  it('matches when both want and roles are complementary', () => {
    const my = [makeTag('bondage', 80, 'give')];
    const partner = [makeTag('bondage', 70, 'receive')];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(1);
    expect(result.matches[0].dimension).toBe('bondage');
    expect(result.matches[0].isComplementary).toBe(true);
  });

  it('hides when both want but roles conflict', () => {
    const my = [makeTag('bondage', 80, 'give')];
    const partner = [makeTag('bondage', 70, 'give')];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(0);
    expect(result.iWantButHidden.length).toBe(1);
  });

  it('matches when either role is both', () => {
    const my = [makeTag('bondage', 80, 'both')];
    const partner = [makeTag('bondage', 70, 'give')];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(1);
  });

  it('matches when either role is null (mutual activity)', () => {
    const my = [makeTag('kissing', 80, null)];
    const partner = [makeTag('kissing', 70, null)];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(1);
  });

  it('never reveals hidden desires to partner', () => {
    const my = [makeTag('bondage', 90, 'give')];
    const partner = [makeTag('bondage', 10, 'receive')];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(0);
    expect(result.partnerDoesntWant.length).toBe(0);
    expect(result.iWantButHidden.length).toBe(1);
  });

  it('shows partner_no when only partner wants', () => {
    const my = [makeTag('bondage', 10, 'receive')];
    const partner = [makeTag('bondage', 90, 'give')];

    const result = getTagBasedMatches(my, partner);

    expect(result.partnerDoesntWant.length).toBe(1);
  });

  it('handles tags only one partner has', () => {
    const my = [makeTag('bondage', 80, 'give')];
    const partner = [makeTag('roleplay', 80, null)];

    const result = getTagBasedMatches(my, partner);

    // bondage: I want, partner doesn't → hidden
    // roleplay: partner wants, I don't → partner_no
    expect(result.matches.length).toBe(0);
    expect(result.iWantButHidden.length).toBe(1);
    expect(result.partnerDoesntWant.length).toBe(1);
  });

  it('counts interest at exactly default threshold (>= 50)', () => {
    const my = [makeTag('bondage', 50, null)];
    const partner = [makeTag('bondage', 50, null)];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(1);
  });

  it('excludes interest just below default threshold (49)', () => {
    const my = [makeTag('bondage', 49, null)];
    const partner = [makeTag('bondage', 49, null)];

    const result = getTagBasedMatches(my, partner);

    // Neither crosses threshold → both buckets empty, tag effectively skipped
    expect(result.matches.length).toBe(0);
    expect(result.iWantButHidden.length).toBe(0);
    expect(result.partnerDoesntWant.length).toBe(0);
  });

  it('respects a custom threshold override', () => {
    const my = [makeTag('bondage', 30, null)];
    const partner = [makeTag('bondage', 30, null)];

    // Default 50 would reject; threshold 20 accepts
    const strict = getTagBasedMatches(my, partner);
    const lenient = getTagBasedMatches(my, partner, 20);

    expect(strict.matches.length).toBe(0);
    expect(lenient.matches.length).toBe(1);
  });

  it('is deterministic for identical inputs', () => {
    const my = [
      makeTag('bondage', 80, 'give'),
      makeTag('roleplay', 60, null),
      makeTag('kissing', 90, null),
    ];
    const partner = [
      makeTag('bondage', 70, 'receive'),
      makeTag('kissing', 80, null),
      makeTag('spanking', 85, 'give'),
    ];

    const a = getTagBasedMatches(my, partner);
    const b = getTagBasedMatches(my, partner);

    expect(a).toEqual(b);
  });

  it('sorts matches by myValue descending', () => {
    const my = [
      makeTag('a', 60, null),
      makeTag('b', 90, null),
      makeTag('c', 75, null),
    ];
    const partner = [
      makeTag('a', 80, null),
      makeTag('b', 80, null),
      makeTag('c', 80, null),
    ];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.map(m => m.dimension)).toEqual(['b', 'c', 'a']);
  });

  it('returns empty buckets for empty inputs', () => {
    const result = getTagBasedMatches([], []);

    expect(result.matches).toEqual([]);
    expect(result.iWantButHidden).toEqual([]);
    expect(result.partnerDoesntWant).toEqual([]);
  });

  it('skips tags neither partner wants', () => {
    const my = [makeTag('bondage', 10, null)];
    const partner = [makeTag('bondage', 5, null)];

    const result = getTagBasedMatches(my, partner);

    expect(result.matches.length).toBe(0);
    expect(result.iWantButHidden.length).toBe(0);
    expect(result.partnerDoesntWant.length).toBe(0);
  });
});

describe('generateInviteCode', () => {
  it('returns 8-character string', () => {
    const code = generateInviteCode();
    expect(code.length).toBe(8);
  });

  it('only uses allowed characters', () => {
    const allowed = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode();
      for (const char of code) {
        expect(allowed).toContain(char);
      }
    }
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBeGreaterThan(90);
  });
});
