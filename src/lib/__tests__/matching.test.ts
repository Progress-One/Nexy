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
