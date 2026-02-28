import type { LocalizedString, Locale } from './types';
export type { Locale };

/**
 * Default locale for the application
 */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Get user's preferred locale
 * Priority: profile > localStorage > browser/system > default 'en'
 */
export function getLocale(profile?: { language?: string | null } | null): Locale {
  // 1. Check profile language first
  if (profile?.language === 'en' || profile?.language === 'ru') {
    return profile.language;
  }

  if (typeof window === 'undefined') {
    // On server, check browser/system language if available, otherwise default
    return DEFAULT_LOCALE;
  }

  // 2. Check localStorage
  const saved = localStorage.getItem('locale');
  if (saved === 'en' || saved === 'ru') {
    return saved;
  }

  // 3. Check browser/system language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ru')) {
    return 'ru';
  }
  if (browserLang.startsWith('en')) {
    return 'en';
  }

  // 4. Default to 'en'
  return DEFAULT_LOCALE;
}

/**
 * Set user's preferred locale
 */
export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
}

/**
 * Get localized text from a LocalizedString
 */
export function getLocalizedText(
  localized: LocalizedString | string | undefined | null,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (!localized) {
    return '';
  }

  // If it's already a string, return it
  if (typeof localized === 'string') {
    return localized;
  }

  // Return requested locale or fallback
  return localized[locale] || localized.ru || localized.en || '';
}

/**
 * Check if a value is a LocalizedString
 */
export function isLocalizedString(value: unknown): value is LocalizedString {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('en' in value || 'ru' in value)
  );
}

/**
 * Create a LocalizedString with both languages
 */
export function createLocalizedString(
  ru: string,
  en: string = ''
): LocalizedString {
  return { ru, en: en || ru };
}

/**
 * Localized UI strings
 */
export const UI_STRINGS: Record<string, LocalizedString> = {
  // Common
  loading: { ru: 'Загрузка...', en: 'Loading...' },
  error: { ru: 'Ошибка', en: 'Error' },
  save: { ru: 'Сохранить', en: 'Save' },
  cancel: { ru: 'Отмена', en: 'Cancel' },
  next: { ru: 'Далее', en: 'Next' },
  back: { ru: 'Назад', en: 'Back' },
  skip: { ru: 'Пропустить', en: 'Skip' },

  // Proposals
  partnerSuggested: { ru: 'Партнёр предложил эту тему', en: 'Your partner suggested this' },

  // Discovery
  questionsAnswered: {
    ru: '{count} вопросов отвечено',
    en: '{count} questions answered',
  },
  allScenesAnswered: {
    ru: 'Вы ответили на все доступные сцены!',
    en: "You've answered all available scenes!",
  },
  checkForNew: { ru: 'Проверить новые', en: 'Check for new' },
  notForMe: { ru: 'Не моё', en: 'Not for me' },

  // Follow-up
  oneMoreQuestion: {
    ru: 'Ещё один вопрос',
    en: 'One more question',
  },

  // Scale labels
  scaleNotInterested: { ru: 'Не привлекает', en: 'Not interested' },
  scaleVeryInterested: { ru: 'Очень хочу', en: 'Very interested' },

  // Trinary
  yes: { ru: 'Да', en: 'Yes' },
  maybe: { ru: 'Может быть', en: 'Maybe' },
  no: { ru: 'Нет', en: 'No' },

  // Settings
  account: { ru: 'Аккаунт', en: 'Account' },
  logOut: { ru: 'Выйти из аккаунта', en: 'Log out' },
  privacy: { ru: 'Приватность', en: 'Privacy' },
  privacyDescription: {
    ru: 'Ваши данные защищены и никогда не передаются третьим лицам',
    en: 'Your data is protected and never shared with third parties',
  },
  whatWeStore: { ru: 'Что мы храним:', en: 'What we store:' },
  emailForAuth: { ru: 'Email для авторизации', en: 'Email for authentication' },
  yourAnswers: { ru: 'Ваши ответы на вопросы', en: 'Your answers to questions' },
  preferenceProfile: {
    ru: 'Профиль предпочтений (анонимизированный)',
    en: 'Preference profile (anonymized)',
  },
  partnersSeeOnly: { ru: 'Партнёры видят только:', en: 'Partners see only:' },
  matches: {
    ru: 'Совпадения (то, что хотите оба)',
    en: 'Matches (what both of you want)',
  },
  whatYouDontWant: {
    ru: 'То, что вы НЕ хотите (если партнёр хочет)',
    en: 'What you do NOT want (if partner wants)',
  },
  dangerZone: { ru: 'Опасная зона', en: 'Danger Zone' },
  deleteAccount: { ru: 'Удалить аккаунт', en: 'Delete account' },
  deleteAccountWarning: {
    ru: 'Это действие удалит все ваши данные без возможности восстановления',
    en: 'This action will delete all your data without the possibility of recovery',
  },
  deleteAccountConfirm: {
    ru: 'Вы уверены, что хотите удалить аккаунт? Это действие необратимо.',
    en: 'Are you sure you want to delete your account? This action is irreversible.',
  },
  deleteAccountContact: {
    ru: 'Для удаления аккаунта обратитесь в поддержку.',
    en: 'To delete your account, please contact support.',
  },
  language: { ru: 'Язык / Language', en: 'Language' },
};

/**
 * Get a UI string with optional interpolation
 */
export function t(
  key: keyof typeof UI_STRINGS,
  locale: Locale = DEFAULT_LOCALE,
  params?: Record<string, string | number>
): string {
  const str = UI_STRINGS[key];
  if (!str) {
    return key;
  }

  let text = str[locale] || str.ru || str.en || key;

  // Interpolate parameters
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }

  return text;
}

/**
 * Format intensity level to localized string
 */
export function formatIntensity(level: number, locale: Locale = DEFAULT_LOCALE): string {
  const labels: Record<number, LocalizedString> = {
    1: { ru: 'Мягко', en: 'Soft' },
    2: { ru: 'Легко', en: 'Light' },
    3: { ru: 'Средне', en: 'Medium' },
    4: { ru: 'Интенсивно', en: 'Intense' },
    5: { ru: 'Экстрим', en: 'Extreme' },
  };

  const label = labels[level];
  return label ? getLocalizedText(label, locale) : String(level);
}
