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

  // ==================== LANDING PAGE ====================

  // Header
  landing_header_how: { ru: 'Как это работает', en: 'How it works' },
  landing_header_features: { ru: 'Возможности', en: 'Features' },
  landing_header_pricing: { ru: 'Цены', en: 'Pricing' },
  landing_header_login: { ru: 'Войти', en: 'Log In' },
  landing_header_start: { ru: 'Начать', en: 'Get Started' },
  landing_header_open: { ru: 'Открыть', en: 'Open App' },

  // Hero
  landing_hero_title: { ru: 'Узнайте тайные желания друг\u00A0друга', en: 'Uncover Each Other\'s Hidden Desires' },
  landing_hero_subtitle: {
    ru: 'Свайпайте сценарии. Совпавшие фантазии раскрываются. Несовпавшие — навсегда останутся тайной. Никакой неловкости, только\u00A0страсть.',
    en: 'Swipe through fantasies. Mutual desires are revealed. Unmatched ones stay secret forever. No awkwardness, just passion.',
  },
  landing_hero_cta: { ru: 'Попробовать бесплатно', en: 'Explore Free' },
  landing_hero_badge_private: { ru: 'Полная анонимность', en: 'Completely anonymous' },
  landing_hero_badge_free: { ru: 'Без привязки карты', en: 'No credit card' },
  landing_hero_badge_couples: { ru: '18+ для пар', en: '18+ for couples' },

  // How it works
  landing_how_title: { ru: 'Три шага к\u00A0откровенности', en: 'Three steps to intimacy' },
  landing_how_step1_title: { ru: 'Исследуйте фантазии', en: 'Explore fantasies' },
  landing_how_step1_desc: {
    ru: 'Свайпайте провокационные сценарии — от нежных до самых дерзких. AI подстраивается под ваш вкус и показывает то, что заводит именно вас.',
    en: 'Swipe through provocative scenarios — from tender to wild. AI adapts to your taste and surfaces what turns you on.',
  },
  landing_how_step2_title: { ru: 'Пригласите партнёра', en: 'Invite your partner' },
  landing_how_step2_desc: {
    ru: 'Отправьте приватную ссылку. Партнёр отвечает на те же вопросы отдельно. Никто не подглядывает.',
    en: 'Send a secret link. They answer the same questions separately. No peeking allowed.',
  },
  landing_how_step3_title: { ru: 'Откройте совпадения', en: 'Reveal mutual desires' },
  landing_how_step3_desc: {
    ru: 'Оба хотите попробовать? Это матч. Не совпало — никто не узнает. Ваши тёмные уголки останутся только вашими.',
    en: "Both into it? It's a match. Not mutual? Neither of you ever finds out. Your secret sides stay secret.",
  },

  // Features
  landing_features_title: { ru: 'Почему это затягивает', en: 'Why it\'s addictive' },
  landing_features_ai_title: { ru: 'AI знает, что вас заводит', en: 'AI knows what turns you on' },
  landing_features_ai_desc: {
    ru: 'Чем больше свайпаете, тем точнее AI подбирает сценарии под ваши скрытые желания. Он учится быстро.',
    en: 'The more you swipe, the better AI learns your hidden desires. It picks up fast.',
  },
  landing_features_library_title: { ru: '500+ сценариев', en: '500+ Scenarios' },
  landing_features_library_desc: {
    ru: 'От нежной романтики до БДСМ и ролевых игр. Полный спектр — от ванили до самого острого.',
    en: 'From soft romance to BDSM and role play. The full spectrum — from vanilla to the wildest.',
  },
  landing_features_privacy_title: { ru: 'Абсолютная тайна', en: 'Your dirty secret is safe' },
  landing_features_privacy_desc: {
    ru: 'Несовпавшие желания никогда не раскрываются. Ни партнёру, ни нам. Исследуйте без страха.',
    en: 'Unmatched desires are never revealed. Not to your partner, not to us. Explore without fear.',
  },
  landing_features_date_title: { ru: 'Режим «Сегодня ночью»', en: 'Tonight Mode' },
  landing_features_date_desc: {
    ru: 'Нашли совпадение? Получите сценарий на вечер. От фантазии к\u00A0реальности за один тап.',
    en: 'Found a match? Get a scenario for tonight. From fantasy to reality in one tap.',
  },

  // Testimonials
  landing_testimonials_title: { ru: 'Что говорят пары', en: 'What couples say' },
  landing_testimonials_1: {
    ru: '8 лет вместе — и мы наконец узнали, чего хотим друг от друга в постели. Жалеем, что не попробовали раньше.',
    en: "8 years together — and we finally learned what we both want in bed. Wish we'd tried this sooner.",
  },
  landing_testimonials_1_author: { ru: 'Саша и Миша', en: 'Sarah & Mike' },
  landing_testimonials_2: {
    ru: 'Я никогда бы не решилась сказать это вслух. А тут — свайпнула, и оказалось, он тоже хочет. Лучший вечер за долгое время.',
    en: 'I\'d never dare say it out loud. Swiped it, turns out he\'s into it too. Best night in a long time.',
  },
  landing_testimonials_2_author: { ru: 'Катя', en: 'Jordan' },
  landing_testimonials_3: {
    ru: 'То, что несовпавшее остаётся тайной — гениально. Я была честна на 100%, потому что знала: он не узнает.',
    en: 'The fact that unmatched stuff stays hidden is genius. I was 100% honest because I knew he\'d never see it.',
  },
  landing_testimonials_3_author: { ru: 'Анонимная', en: 'Anonymous' },

  // Pricing
  landing_pricing_title: { ru: 'Начните бесплатно. Подсядете — обновите.', en: 'Start free. Get hooked — upgrade.' },
  landing_pricing_free: { ru: 'БЕСПЛАТНО', en: 'FREE' },
  landing_pricing_free_price: { ru: '$0 / навсегда', en: '$0 / forever' },
  landing_pricing_free_desc: { ru: 'Попробуйте на вкус', en: 'Get a taste' },
  landing_pricing_free_f1: { ru: '50 сценариев', en: '50 scenarios' },
  landing_pricing_free_f2: { ru: 'Базовый матчинг', en: 'Basic matching' },
  landing_pricing_free_f3: { ru: '1 партнёр', en: '1 partner' },
  landing_pricing_free_cta: { ru: 'Попробовать', en: 'Try It' },
  landing_pricing_premium: { ru: 'ПРЕМИУМ', en: 'PREMIUM' },
  landing_pricing_premium_badge: { ru: 'Популярный', en: 'Most Popular' },
  landing_pricing_premium_price_month: { ru: '$6.99/мес', en: '$6.99/month' },
  landing_pricing_premium_price_year: { ru: '$39.99/год', en: '$39.99/year' },
  landing_pricing_premium_desc: { ru: 'Без ограничений', en: 'No limits' },
  landing_pricing_premium_f1: { ru: '500+ сценариев без цензуры', en: '500+ uncensored scenarios' },
  landing_pricing_premium_f2: { ru: 'AI подбирает под ваши кинки', en: 'AI tailored to your kinks' },
  landing_pricing_premium_f3: { ru: 'Режим «Сегодня ночью»', en: 'Tonight Mode' },
  landing_pricing_premium_f4: { ru: 'Новые сценарии каждую неделю', en: 'Fresh scenarios weekly' },
  landing_pricing_premium_cta: { ru: 'Разблокировать всё', en: 'Unlock Everything' },
  landing_pricing_or: { ru: 'или', en: 'or' },

  // Final CTA
  landing_cta_title: { ru: 'Готовы узнать, чего хочет ваш партнёр?', en: 'Ready to find out what your partner really wants?' },
  landing_cta_subtitle: { ru: 'Бесплатно. Анонимно. Только между вами.', en: 'Free. Anonymous. Just between you two.' },
  landing_cta_button: { ru: 'Начать исследовать', en: 'Start Exploring' },

  // Footer
  landing_footer_tagline: { ru: 'Ваши фантазии. Ваша тайна.', en: 'Your fantasies. Your secret.' },
  landing_footer_product: { ru: 'Продукт', en: 'Product' },
  landing_footer_legal: { ru: 'Правовая информация', en: 'Legal' },
  landing_footer_how: { ru: 'Как это работает', en: 'How it works' },
  landing_footer_pricing: { ru: 'Цены', en: 'Pricing' },
  landing_footer_privacy: { ru: 'Политика конфиденциальности', en: 'Privacy Policy' },
  landing_footer_terms: { ru: 'Условия использования', en: 'Terms of Service' },
  landing_footer_contact: { ru: 'Контакты', en: 'Contact' },
  landing_footer_copyright: { ru: '© {year} Nexy. 18+', en: '© {year} Nexy. Adults only.' },

  // ==================== PARTNER MATCHING ====================
  matchesMutualOpen: { ru: 'Взаимные желания', en: 'Mutual desires' },
  matchesMutualHidden: { ru: 'Скрытые совпадения', en: 'Hidden matches' },
  matchesPartnerWants: {
    ru: 'Она хочет (тебе стоит попробовать)',
    en: 'They want this (you might try)',
  },
  matchesYouWant: {
    ru: 'Ты хочешь (ещё не в её ответах)',
    en: "You want this (not in their answers yet)",
  },
  matchesRoleConflict: { ru: 'Конфликт ролей', en: 'Role conflict' },
  matchesHiddenExplain: {
    ru: 'Вы оба хотели, но стеснялись сказать',
    en: 'You both wanted it, but were shy to say',
  },
  matchesWaitingPartner: {
    ru: 'Ждём когда {name} ответит на сцены',
    en: 'Waiting for {name} to answer some scenes',
  },
  matchesRoleConflictExplain: {
    ru: 'Оба хотите одну роль — обсудите switch',
    en: 'You both want the same role — try switching',
  },
  matchesNoData: {
    ru: 'Пройдите несколько сцен чтобы увидеть совпадения',
    en: 'Answer a few scenes to see your matches',
  },
  matchesEmptyState: {
    ru: 'Пока нет совпадений в этой категории',
    en: 'No matches in this category yet',
  },
  matchesYouLabel: { ru: 'Ты', en: 'You' },
  matchesPartnerLabel: { ru: 'Партнёр', en: 'Partner' },
  matchesHeaderCount: {
    ru: '{count} совпадений',
    en: '{count} matches',
  },
  matchesHeaderHidden: {
    ru: '{count} скрытых',
    en: '{count} hidden',
  },
  matchesPercentage: {
    ru: '{percent}% совпадения',
    en: '{percent}% match',
  },
  matchesConnected: { ru: 'Связаны', en: 'Connected' },

  // Legal pages
  legal_privacy_title: { ru: 'Политика конфиденциальности', en: 'Privacy Policy' },
  legal_terms_title: { ru: 'Условия использования', en: 'Terms of Service' },
  legal_back: { ru: '← На главную', en: '← Back to home' },
  legal_last_updated: { ru: 'Последнее обновление: {date}', en: 'Last updated: {date}' },

  // Age gate / consent (signup)
  ageConsent: {
    ru: 'Мне 18 лет и больше. Я согласен с условиями и политикой конфиденциальности.',
    en: 'I am 18 or older and agree to the Terms of Service and Privacy Policy.',
  },
  ageConsentPrefix: {
    ru: 'Мне 18 лет и больше. Я согласен с',
    en: 'I am 18 or older and agree to the',
  },
  ageConsentAnd: { ru: 'и', en: 'and' },
  ageConsentSuffix: { ru: '.', en: '.' },
  termsLabel: { ru: 'условиями', en: 'Terms of Service' },
  privacyLabel: { ru: 'политикой конфиденциальности', en: 'Privacy Policy' },
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
