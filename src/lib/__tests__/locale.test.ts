import { describe, it, expect } from 'vitest';
import { t, getLocalizedText, formatIntensity, isLocalizedString, createLocalizedString } from '../locale';

describe('t()', () => {
  it('returns Russian string by default', () => {
    expect(t('skip', 'ru')).toBe('Пропустить');
  });

  it('returns English string', () => {
    expect(t('skip', 'en')).toBe('Skip');
  });

  it('interpolates parameters', () => {
    const result = t('questionsAnswered', 'en', { count: 5 });
    expect(result).toBe('5 questions answered');
  });

  it('returns key for unknown keys', () => {
    const result = t('nonExistentKey' as keyof typeof import('../locale').UI_STRINGS, 'ru');
    expect(result).toBe('nonExistentKey');
  });

  it('returns partnerSuggested string', () => {
    expect(t('partnerSuggested', 'ru')).toBe('Партнёр предложил эту тему');
    expect(t('partnerSuggested', 'en')).toBe('Your partner suggested this');
  });
});

describe('getLocalizedText()', () => {
  it('returns localized string for ru', () => {
    expect(getLocalizedText({ ru: 'Привет', en: 'Hello' }, 'ru')).toBe('Привет');
  });

  it('returns localized string for en', () => {
    expect(getLocalizedText({ ru: 'Привет', en: 'Hello' }, 'en')).toBe('Hello');
  });

  it('handles plain string', () => {
    expect(getLocalizedText('plain text', 'ru')).toBe('plain text');
  });

  it('returns empty string for null/undefined', () => {
    expect(getLocalizedText(null, 'ru')).toBe('');
    expect(getLocalizedText(undefined, 'ru')).toBe('');
  });
});

describe('formatIntensity()', () => {
  it('returns localized intensity labels', () => {
    expect(formatIntensity(1, 'en')).toBe('Soft');
    expect(formatIntensity(3, 'en')).toBe('Medium');
    expect(formatIntensity(5, 'en')).toBe('Extreme');
    expect(formatIntensity(1, 'ru')).toBe('Мягко');
    expect(formatIntensity(5, 'ru')).toBe('Экстрим');
  });

  it('returns number string for unknown levels', () => {
    expect(formatIntensity(10, 'en')).toBe('10');
  });
});

describe('isLocalizedString()', () => {
  it('returns true for valid localized string', () => {
    expect(isLocalizedString({ ru: 'test', en: 'test' })).toBe(true);
  });

  it('returns false for plain string', () => {
    expect(isLocalizedString('plain')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isLocalizedString(null)).toBe(false);
    expect(isLocalizedString(undefined)).toBe(false);
  });
});

describe('createLocalizedString()', () => {
  it('creates bilingual string', () => {
    const result = createLocalizedString('Привет', 'Hello');
    expect(result).toEqual({ ru: 'Привет', en: 'Hello' });
  });

  it('uses ru for en when en not provided', () => {
    const result = createLocalizedString('Привет');
    expect(result).toEqual({ ru: 'Привет', en: 'Привет' });
  });
});
