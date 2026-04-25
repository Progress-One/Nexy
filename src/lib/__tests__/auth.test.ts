import { describe, it, expect, afterEach } from 'vitest';
import { isAdmin } from '../auth';

const ORIGINAL_ENV = process.env['ADMIN_EMAILS'];

describe('isAdmin', () => {
  afterEach(() => {
    process.env['ADMIN_EMAILS'] = ORIGINAL_ENV;
  });

  it('returns false when user is null', () => {
    process.env['ADMIN_EMAILS'] = 'alex@skill.im';
    expect(isAdmin(null)).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is unset', () => {
    delete process.env['ADMIN_EMAILS'];
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is empty string', () => {
    process.env['ADMIN_EMAILS'] = '';
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(false);
  });

  it('returns true for matching email (single value)', () => {
    process.env['ADMIN_EMAILS'] = 'alex@skill.im';
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(true);
  });

  it('returns false for non-matching email', () => {
    process.env['ADMIN_EMAILS'] = 'alex@skill.im';
    expect(isAdmin({ id: 'x', email: 'evil@nope.com' })).toBe(false);
  });

  it('matches in comma-separated list', () => {
    process.env['ADMIN_EMAILS'] = 'a@x.com,b@y.com,c@z.com';
    expect(isAdmin({ id: 'x', email: 'b@y.com' })).toBe(true);
    expect(isAdmin({ id: 'x', email: 'd@x.com' })).toBe(false);
  });

  it('is case-insensitive', () => {
    process.env['ADMIN_EMAILS'] = 'Alex@Skill.IM';
    expect(isAdmin({ id: 'x', email: 'alex@skill.im' })).toBe(true);
    expect(isAdmin({ id: 'x', email: 'ALEX@SKILL.IM' })).toBe(true);
  });

  it('trims whitespace around emails in the env var', () => {
    process.env['ADMIN_EMAILS'] = ' a@x.com , b@y.com ';
    expect(isAdmin({ id: 'x', email: 'a@x.com' })).toBe(true);
    expect(isAdmin({ id: 'x', email: 'b@y.com' })).toBe(true);
  });
});
