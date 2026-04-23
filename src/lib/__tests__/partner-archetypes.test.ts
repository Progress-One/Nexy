import { describe, it, expect } from 'vitest';
import { getArchetypeById, getAllArchetypes } from '../partner-archetypes';

describe('getAllArchetypes', () => {
  it('returns a non-empty list', () => {
    expect(getAllArchetypes().length).toBeGreaterThan(0);
  });

  it('every archetype has id, name.ru/en, description.ru/en', () => {
    for (const a of getAllArchetypes()) {
      expect(a.id, 'id').toBeTruthy();
      expect(a.name.ru, `${a.id} name.ru`).toBeTruthy();
      expect(a.name.en, `${a.id} name.en`).toBeTruthy();
      expect(a.description.ru, `${a.id} description.ru`).toBeTruthy();
      expect(a.description.en, `${a.id} description.en`).toBeTruthy();
    }
  });

  it('archetype ids are unique', () => {
    const ids = getAllArchetypes().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getArchetypeById', () => {
  it('returns undefined for unknown id', () => {
    expect(getArchetypeById('definitely-not-an-archetype')).toBeUndefined();
  });

  it('returns the archetype when id exists', () => {
    const first = getAllArchetypes()[0];
    const found = getArchetypeById(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });
});
