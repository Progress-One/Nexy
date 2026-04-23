import { describe, it, expect } from 'vitest';
import { EVENTS } from '../analytics';

describe('EVENTS constant', () => {
  it('has at least one event per known funnel', () => {
    const values = Object.values(EVENTS) as string[];
    expect(values.some((v) => v.startsWith('onboarding_'))).toBe(true);
    expect(values.some((v) => v.startsWith('discovery_'))).toBe(true);
    expect(values.some((v) => v.startsWith('invite_'))).toBe(true);
    expect(values.some((v) => v.startsWith('proposal_'))).toBe(true);
  });

  it('all event names are non-empty strings', () => {
    for (const [key, val] of Object.entries(EVENTS)) {
      expect(typeof val, `${key} should be string`).toBe('string');
      expect((val as string).length, `${key} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('all event names are unique', () => {
    const vals = Object.values(EVENTS);
    expect(new Set(vals).size).toBe(vals.length);
  });

  it('all event names are snake_case', () => {
    for (const val of Object.values(EVENTS) as string[]) {
      expect(val, `${val} should match snake_case`).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
