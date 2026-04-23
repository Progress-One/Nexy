import { describe, it, expect } from 'vitest';
import { isBodyMapGateOpen, getOpenBodyMapGates } from '../body-map-processing';

describe('isBodyMapGateOpen', () => {
  it('returns false for null input', () => {
    expect(isBodyMapGateOpen(null, 'anal')).toBe(false);
  });

  it('returns true when gate is explicitly true', () => {
    expect(isBodyMapGateOpen({ anal: true }, 'anal')).toBe(true);
  });

  it('returns false when gate is absent', () => {
    expect(isBodyMapGateOpen({ oral: true }, 'anal')).toBe(false);
  });

  it('returns false when gate is explicitly false', () => {
    expect(isBodyMapGateOpen({ anal: false }, 'anal')).toBe(false);
  });
});

describe('getOpenBodyMapGates', () => {
  it('returns [] for null', () => {
    expect(getOpenBodyMapGates(null)).toEqual([]);
  });

  it('returns [] for empty object', () => {
    expect(getOpenBodyMapGates({})).toEqual([]);
  });

  it('returns keys with true values', () => {
    const result = getOpenBodyMapGates({ anal: true, oral: false, foot: true });
    expect(result.sort()).toEqual(['anal', 'foot']);
  });

  it('excludes falsy entries', () => {
    const result = getOpenBodyMapGates({ a: false, b: true });
    expect(result).toEqual(['b']);
  });
});
