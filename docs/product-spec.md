# Nexy — Product Specification

> **Актуальная версия:** Февраль 2026
> **Заменяет:** `intimate-discovery-v2.md` (устарел ~70%)
> **Связанные спеки:** `landing-page-spec.md`, `nexy_visual_onboarding_spec.md`, `civitai-integration.md`, `image-generation-qa.md`

---

## 1. Концепция

**Nexy** (от "Next Sexy") — web-приложение для пар, которое помогает партнёрам обнаружить общие интимные предпочтения через анонимный matching.

**Домен:** nexy.life
**Платформа:** Web-first (никаких App Store ограничений)
**Язык контента:** Русский + English

### Ключевые принципы

1. **Privacy-first matching** — несовпавшие желания НИКОГДА не раскрываются партнёру
2. **Адаптивное исследование** — AI и scoring-алгоритм подстраивают контент под пользователя
3. **Визуальный подход** — картинки (comic book sketch style) как основа, не текстовые анкеты
4. **Без ограничений** — прямые формулировки, откровенный контент

### Что видит каждый партнёр

| Ситуация | Я вижу | Партнёр видит |
|----------|--------|---------------|
| Оба хотят | Совпадение! | Совпадение! |
| Я хочу, партнёр нет | **Скрыто навсегда** | Ничего |
| Партнёр хочет, я нет | "Партнёр хочет X" | **Скрыто навсегда** |

---

## 2. Технический стек

```
Frontend:     Next.js 15 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Zustand
Backend:      Supabase (PostgreSQL + Auth + Realtime + Storage + RLS)
AI:           OpenAI gpt-4o-mini (чат, exclusion detection), Anthropic Claude (Vision QA изображений)
Изображения:  Civitai API + Replicate API (20+ моделей: FLUX, SDXL, Pony, Illustrious)
Платежи:      Stripe (Checkout + Webhooks + Customer Portal)
Email:        Resend (noreply@nexy.life)
Хостинг:      Vercel
```

---

## 3. User Flow

```
Регистрация → Пол/Ориентация → Свайп-онбординг (20 категорий)
    → Результаты → Body Map → Discovery (основной поток)
        → Приглашение партнёра → Matching → Date Night
```

### 3.1 Онбординг Intro

Инструкция по свайпам:
- ← Влево = **Нет** (0)
- → Вправо = **Да** (1)
- ↑ Вверх = **Очень!** (2)
- ↓ Вниз = **Если партнёр попросит** (3)

### 3.2 Визуальный онбординг

Свайп-тест на ~20 сценах (comic book sketch images). Подробная спецификация — в `nexy_visual_onboarding_spec.md`.

- **16 базовых категорий:** oral, anal, group, toys, roleplay, quickie, romantic, power_dynamic, rough, public, exhibitionism, recording, dirty_talk, praise, lingerie, foot
- **4 условных** (показываются по правилам): bondage, body_fluids, sexting, extreme
- Адаптация под пол и ориентацию (~73 уникальных картинки)
- Каждая сцена ставит **gate** через DB триггер

### 3.3 Smart Intro

После онбординга — персонализированный welcome-экран с топ-интересами пользователя.

> **Код:** `src/lib/smart-intro.ts`, `src/components/discovery/SmartIntro.tsx`

### 3.4 Body Map

Интерактивные SVG-силуэты тела (муж/жен, перед/спина). Пользователь отмечает для каждой зоны + действия: **люблю** / **иногда** / **нет**.

- **23 зоны** тела (губы, шея, грудь, соски, живот, спина, ягодицы, анус, пах, бёдра, стопы и т.д.)
- **6 действий:** поцелуй, лизнуть, лёгкий шлепок, шлёпать, укусить, сжать
- **3 прохода:** себя (receive), партнёр-женщина (give), партнёр-мужчина (give)
- Результаты автоматически открывают gates и обновляют tag_preferences

> **Код:** `src/lib/body-map-processing.ts`, `src/components/discovery/BodyMapAnswer/`

### 3.5 Discovery (основной поток)

Адаптивный поток сцен с двумя режимами взаимодействия:
- **Свайп-карточки** (SwipeableSceneCard) — основной формат
- **SceneRendererV3** — для специальных типов (multi_choice_text, scale_text, paired_text, image_selection)

> **Код:** `src/app/(app)/discover/page.tsx`

---

## 4. Система Gates

Gates — флаги, определяющие доступ пользователя к контенту. Вычисляются автоматически через PostgreSQL триггеры.

### Типы gates

| Тип | Источник | Пример |
|-----|----------|--------|
| Базовый | Свайп YES/VERY на онбординге | `oral: true` |
| VERY | Свайп VERY | `oral_very: true` |
| Условный | Комбинация базовых | `show_bondage: true` (если `power_dynamic OR rough`) |
| Body Map | Выбор зон тела | `rimming: true` (если anus + lick) |

### Условные gates

```
show_bondage:      power_dynamic >= 1 OR rough >= 1
show_body_fluids:  oral >= 1
show_sexting:      recording >= 1 OR exhibitionism >= 1
show_extreme:      rough_very AND bondage >= 1
```

### Хранение

Таблица `user_gates` — единый источник правды. Поля: `onboarding_gates`, `body_map_gates`, `activity_gates`, `gates` (объединённые).

> **Код:** `src/lib/onboarding-gates.ts` (434 строки, ~100 scene-to-gate маппингов)

---

## 5. Система предпочтений

### 5.1 Tag Preferences (основная)

Гранулярные предпочтения по тегам. Таблица `tag_preferences`:

| Поле | Тип | Описание |
|------|-----|----------|
| `tag_ref` | TEXT | Идентификатор тега (напр. `bondage_rope`, `oral_deepthroat`) |
| `interest_level` | INT (-1..100) | -1=rejected, 0=neutral, 30=if_asked, 50=yes, 80=very |
| `role_preference` | TEXT | give / receive / both |
| `intensity_preference` | INT (0..100) | Предпочитаемая интенсивность |
| `experience_level` | TEXT | tried / want_to_try / not_interested / curious |
| `source_scenes` | TEXT[] | Какие сцены повлияли |

Монотонный рост: interest_level никогда не снижается (берётся max от старого и нового).

> **Код:** `src/lib/tag-preferences.ts`

### 5.2 Preference Profiles (legacy — не для нового кода)

JSONB `preference_profiles.preferences` — legacy таблица. Используется параллельно в matching и admin reset, но новый код должен использовать только `tag_preferences`.

---

## 6. Сцены и контент

### 6.1 Масштаб

- **357 сцен** в 33 категориях (309 активных, 48 неактивных)
- **58 онбординг-сцен**
- Все сцены **билингвальны** (ru/en)

### 6.2 V2 Composite архитектура

Каждая сцена — JSON-объект:

```
slug, version=2, scene_type, sets_gate, is_active, is_onboarding,
for_gender, paired_scene, role_direction,
title:{ru,en}, user_description:{ru,en}, ai_description:{ru,en},
image_prompt, intensity:1-5, category, tags:[],
elements:[], question:{}, ai_context:{}
```

### 6.3 Типы сцен

| Тип | Описание |
|-----|----------|
| `main_question` | Основная тема (онбординг/discovery) |
| `clarification` | Уточнение к main_question |
| `multi_choice_text` | Текстовый выбор из вариантов |
| `image_selection` | Выбор из картинок |
| `body_map_activity` | Body map взаимодействие |
| `paired_text` | Парные вопросы give/receive |
| `scale_text` | Шкала без картинки |

### 6.4 Scene Conditions DSL

Элементы сцен могут условно показываться/скрываться:

```
body_map.kiss.receive.lips       — проверка body map
onboarding.oral >= 1             — проверка онбординга
condition1 && condition2         — логические операторы
```

Типы условий: `skip_if`, `prefill_if`, `show_only_if`

> **Код:** `src/lib/scene-conditions.ts`

### 6.5 Карта сцен

Полная карта: `intimate-discovery/scene-map.md`
JSON-файлы: `intimate-discovery/scenes/v2/composite/`

---

## 7. Адаптивная прогрессия сцен

### 7.1 Scoring-алгоритм

Каждой сцене присваивается score на основе:
- **Tag matching** — совпадение тегов сцены с tag_preferences пользователя
- **Role compatibility** — give/receive совместимость
- **Intensity matching** — близость к comfort zone пользователя
- **Breadth coverage** — бонус за неисследованные категории (первые 15 сцен)
- **Body map boost** — совпадение с отмеченными зонами

### 7.2 Comfort Progression

| Этап | Max intensity | Условие |
|------|--------------|---------|
| Первые 10 сцен | 2 (Light) | Всегда |
| После 10 сцен | 3-5 | Зависит от среднего interest level |

### 7.3 Explore / Exploit

- **70%** exploitation — сцены с наивысшим score
- **30%** exploration — случайные из оставшихся

### 7.4 Inter-scene Gates

Пререквизиты: `deepthroat` требует положительный ответ на `blowjob` с minInterest 60.

### 7.5 Topic Flow

Сцены организованы в **темы** (topics.json). Каждая тема — группа сцен с gate_keys. Темы сортируются по интересу пользователя.

> **Код:** `src/lib/scene-progression.ts` (~950 строк), `src/lib/topic-flow.ts`

---

## 8. Партнёрская система

### 8.1 Invite Flow

1. Генерация 8-символьного кода
2. (Опционально) Отправка email через Resend — билингвальный шаблон
3. Партнёр переходит по `/partners/join/{code}`
4. Partnership: pending → active
5. Уведомление инициатору

Инвайты истекают через 7 дней (`expires_at`).

### 8.2 Matching

Два параллельных алгоритма (tag-based приоритетнее):
- **Tag-based (основной):** сравнение `tag_preferences` с **role complementarity** (give+receive = match, both+both = match, give+give = hidden)
- **JSONB (legacy):** сравнение `preference_profiles.preferences` (threshold 50) — работает параллельно, будет удалён

### 8.3 Date Night

Мини-discovery для конкретного вечера:
1. Создание свидания с mood (passionate/tender/playful/intense/surprise) и датой
2. Оба партнёра отвечают Yes/Maybe/No на 5 сцен из взаимных совпадений
3. Результат: что выбрали оба

### 8.4 Proposals

> **Статус: ЧАСТИЧНО РАБОТАЕТ.** UI создания предложений есть (Premium). Но discovery flow НЕ ЧИТАЕТ proposals из БД — предложения записываются, но не показываются партнёру.

---

## 9. AI-интеграции

### 9.1 Partner Avatar Chat

AI-чат, который говорит **от лица партнёра** на основе его реальных предпочтений.

Данные для построения аватара:
- Top-50 tag_preferences по interest_level
- Исключения (soft/hard)
- Архетипы (до 3)
- Средний intensity
- Стиль общения (degradation, commands, dirty talk, praise, narration)

Ответы: 1-3 предложения, в стиле партнёра, на языке пользователя.

> **Код:** `src/app/api/partner-chat/route.ts`

### 9.2 General AI Chat

AI-ассистент для самоисследования. OpenAI gpt-4o-mini, 5 бесплатных сообщений/день (больше — Premium).

> **Код:** `src/app/api/ai/chat/route.ts`

### 9.3 AI Exclusion Detection

Анализ текстового фидбека пользователя через GPT-4o-mini → определение категории для исключения и уровня (soft/hard).

> **Код:** `src/app/api/ai/detect-exclusion/route.ts`

### 9.4 Image Generation Pipeline

1. Промпты из `image_prompt` каждой сцены
2. Генерация через Civitai/Replicate (20+ моделей)
3. QA через Claude Vision ("essence-based" evaluation)
4. Авто-регенерация при провале QA
5. Хранение в Supabase Storage

Подробности: `civitai-integration.md`, `image-generation-qa.md`

> **Код:** `src/lib/civitai.ts`, `src/lib/replicate.ts`, `src/lib/qa-evaluator.ts`, `src/lib/scene-matcher.ts`

---

## 10. Архетипы и профилирование

### 10.1 Archetype System

16 сексуальных архетипов, вычисляемых из tag_preferences:

Romantic Lover, Dominant, Submissive, Switch, Sadist, Masochist, Primal, Exhibitionist, Voyeur, Sensualist, Brat, Cuckold, Performer, Service Oriented, Pet, Explorer

До 3 архетипов на пользователя (threshold ≥ 0.35). Используется Partner Avatar Chat.

> **Код:** `src/lib/archetype-definitions.ts`, `src/lib/partner-archetypes.ts`

### 10.2 Profile Signals

Параллельная система психологического профилирования:
- Накопление сигналов с exponential moving average
- Детекция паттернов (genital focus, sensual preference, enthusiast)
- Sensitive zone tracking (anus, feet, nipples и т.д.)

> **Код:** `src/lib/profile-signals.ts`

---

## 11. Исключения (Exclusions)

Два уровня:
- **Soft** — "не очень" (сцены скрываются, но могут появиться если партнёр заинтересован)
- **Hard** — "абсолютно нет" (сцены полностью исключены)

Два способа:
- **Manual** — пользователь выбирает категорию/тег для исключения
- **AI-detected** — AI анализирует фидбек и предлагает исключение (ExclusionDialog)

> **Код:** `src/app/api/exclusions/route.ts`, `src/components/discovery/ExclusionDialog.tsx`

---

## 12. Монетизация

### Free

- Онбординг + Body Map
- Discovery (без лимита)
- 1 партнёр
- Просмотр совпадений
- Базовые свидания
- 5 AI-сообщений/день

### Premium — $6.99/мес или $49.99/год

- Неограниченные партнёры
- Система предложений
- Безлимитный AI
- Детальная аналитика профиля
- Приоритетные новые сцены
- История свиданий
- Экспорт данных

> **Код:** `src/lib/stripe.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`

---

## 13. Лендинг

Полная спецификация: `landing-page-spec.md`

Структура: Header → Hero → How It Works → Features → Testimonials → Pricing → Final CTA → Footer

Визуальный стиль: comic book pencil sketch, палитра coral (#E8747C) / purple (#6B4E71), типографика Plus Jakarta Sans + Inter.

> **Код:** `src/app/page.tsx`, `src/components/landing/`

---

## 14. Локализация

Полная билингвальность RU + EN.

- `LocalizedString = { ru: string; en: string }`
- Резолюция: профиль → localStorage → browser language → default (en)
- `UI_STRINGS` словарь с общими UI-текстами
- Функция `t()` с интерполяцией параметров
- Все сцены, архетипы, интро-тексты — билингвальны

> **Код:** `src/lib/locale.ts`

---

## 15. Уведомления

- Polling каждые 30 секунд
- Toast-уведомления для новых непрочитанных
- Типы: `invite_accepted`, `invite_declined`, `new_match`, `partner_activity`
- Read/unread tracking, mark-as-read API

> **Код:** `src/hooks/useNotifications.ts`, `src/app/api/notifications/route.ts`

---

## 16. Admin Panel

10 страниц по адресу `/admin/*`:

| Страница | Назначение |
|----------|-----------|
| scenes | Управление сценами |
| users | Управление пользователями |
| prompts | Редактирование промптов |
| gate-hierarchy | Визуализация иерархии gates |
| image-pairs | Парные изображения |
| link-images | Привязка изображений к сценам |
| scene-gallery | Галерея изображений сцен |
| topics | Управление темами |
| verbal-options | Вербальные опции |
| body-map-calibration | Калибровка body map |

20+ API-эндпоинтов: import-scenes, translate, upload-image, generate-scene, batch-analyze и др.

---

## 17. База данных

35 миграций. Ключевые таблицы:

| Таблица | Назначение |
|---------|-----------|
| `profiles` | Пользователь (gender, interested_in, language) |
| `scenes` | 357 сцен (V2 composite, slug, elements, tags, gates, paired_scene, sets_gate) |
| `scene_responses` | Все ответы (свайпы, выбор, шкалы) — единая таблица |
| `tag_preferences` | Per-tag предпочтения (interest, role, intensity, experience) |
| `user_gates` | Вычисленные gates (onboarding + body_map + activity → unified) |
| `psychological_profiles` | Сигналы, test scores, корреляции |
| `body_map_responses` | Ответы body map |
| `partnerships` | Партнёрства (invite_code, status, nickname, expires_at) |
| `subscriptions` | Stripe подписки |
| `partner_chat_messages` | История чата с AI-аватаром партнёра |
| `ai_messages` | История общего AI-чата |
| `dates` / `date_responses` | Свидания и ответы |
| `notifications` | Уведомления |
| `categories` / `tag_categories` | Категории и маппинг тегов |
| `proposals` | Предложения партнёру |
| `orientation_wishlist` | Интерес к неподдерживаемым ориентациям |
| `image_analysis` | AI-анализ изображений |
| `user_clarification_tracking` | Дедупликация V3 clarifications |

### Ключевой триггер

`compute_gates_from_scene_responses()` — автоматически вычисляет gates при каждом INSERT/UPDATE в scene_responses. Создан в миграции `033_unified_architecture.sql`.

---

## 18. Маршруты приложения

### User-facing

```
/(auth)   /login, /signup, /callback
/(app)    /onboarding, /discover, /discover-v3, /visual-onboarding
          /profile, /settings, /premium, /chat
          /partners, /partners/invite, /partners/join/[code]
          /partners/[partnerId], /partners/[partnerId]/propose
          /date, /date/new/[partnerId], /date/[dateId], /date/[dateId]/results
/         Landing page
```

### API

```
/api/ai/chat, /api/ai/detect-exclusion
/api/partner-chat, /api/partner-chat/history
/api/discovery/next
/api/exclusions
/api/invite/send-email, /api/invite/decline, /api/invite/notify-accepted
/api/notifications
/api/stripe/checkout, /api/stripe/portal
/api/webhooks/stripe
/api/wishlist
/api/admin/* (20+ эндпоинтов)
```

---

## 19. Известные проблемы и TODO

### Нерабочее

- **Proposals:** UI создания есть, но discovery flow не читает proposals — партнёр никогда не видит предложенные сцены
- **generateQuestion():** AI-генерация вопросов (src/lib/ai.ts) существует, но не вызывается в discovery flow — все вопросы предзаданы в JSON сценах

### Не реализовано

- **Gay/Bi контент:** ориентации поддерживаются в БД, но сцен для них нет (только orientation_wishlist)
- **Edge cases онбординга:** "все ответы нет" (мягкий троллинг), детекция быстрых свайпов (<0.5 сек)
- **PWA**
- **Экспорт данных** (Premium feature)
- **Детальная аналитика профиля** (Premium feature)

### Техдолг

- `preference_profiles` JSONB параллельно с `tag_preferences` — нужно мигрировать на единый источник
- Legacy таблицы (`user_flow_state`, `user_discovery_profiles`, `excluded_preferences`) используются в admin reset, но не в основном flow
- 48 неактивных сцен в БД
