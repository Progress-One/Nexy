import { describe, it, expect } from 'vitest';
import {
  calculateVisibility,
  getMatchResults,
  getTagBasedMatches,
  generateInviteCode,
  type TagPreference,
} from '../matching';

describe('calculateVisibility', () => {
  it('returns match when both want', () => {
    expect(calculateVisibility(80, 70)).toBe('match');
  });

  it('returns hidden when only I want (privacy-first)', () => {
    expect(calculateVisibility(80, 20)).toBe('hidden');
  });

  it('returns partner_no when only partner wants', () => {
    expect(calculateVisibility(20, 80)).toBe('partner_no');
  });

  it('returns partner_no when neither wants', () => {
    expect(calculateVisibility(20, 30)).toBe('partner_no');
  });

  it('respects custom threshold', () => {
    expect(calculateVisibility(60, 60, 70)).toBe('partner_no');
    expect(calculateVisibility(80, 80, 70)).toBe('match');
  });

  it('handles exact threshold boundary', () => {
    expect(calculateVisibility(50, 50)).toBe('match');
    expect(calculateVisibility(49, 50)).toBe('partner_no');
    expect(calculateVisibility(50, 49)).toBe('hidden');
  });
});

describe('getMatchResults', () => {
  it('finds matches from flat preference objects', () => {
    const my = { bondage: { value: 80 }, blindfold: { value: 90 } };
    const partner = { bondage: { value: 70 }, blindfold: { value: 30 } };

    const result = getMatchResults(my, partner);

    expect(result.matches.length).toBe(1);
    expect(result.matches[0].dimension).toBe('bondage');
  });

  it('hides my unreciprocated desires', () => {
    const my = { bondage: { value: 90 } };
    const partner = { bondage: { value: 10 } };

    const result = getMatchResults(my, partner);

    expect(result.matches.length).toBe(0);
    expect(result.partnerDoesntWant.length).toBe(0);
    // Hidden — not exposed in results at all
  });

  it('returns empty results for empty preferences', () => {
    const result = getMatchResults({}, {});
    expect(result.matches).toEqual([]);
    expect(result.partnerDoesntWant).toEqual([]);
  });
});

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
