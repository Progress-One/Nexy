import { describe, it, expect } from 'vitest';
import { flattenObject } from '../utils/object';

describe('flattenObject', () => {
  it('returns empty object for empty input', () => {
    expect(flattenObject({})).toEqual({});
  });

  it('leaves already-flat objects unchanged', () => {
    expect(flattenObject({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' });
  });

  it('flattens one level of nesting with dot notation', () => {
    expect(flattenObject({ user: { id: 1, name: 'Alex' } })).toEqual({
      'user.id': 1,
      'user.name': 'Alex',
    });
  });

  it('flattens deeply nested objects', () => {
    expect(flattenObject({ a: { b: { c: { d: 42 } } } })).toEqual({ 'a.b.c.d': 42 });
  });

  it('preserves arrays as values (does NOT flatten them)', () => {
    expect(flattenObject({ tags: [1, 2, 3] })).toEqual({ tags: [1, 2, 3] });
  });

  it('preserves null values', () => {
    expect(flattenObject({ a: null })).toEqual({ a: null });
  });

  it('preserves undefined values', () => {
    const result = flattenObject({ a: undefined });
    expect(result).toEqual({ a: undefined });
  });

  it('applies prefix to top-level keys when provided', () => {
    expect(flattenObject({ a: 1 }, 'prefix')).toEqual({ 'prefix.a': 1 });
  });
});
