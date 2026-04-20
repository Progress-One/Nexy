# Nexy

> Web-приложение для пар — анонимный matching интимных предпочтений через свайп-карточки с иллюстрациями. Несовпавшие желания никогда не раскрываются партнёру.

## Общие ресурсы студии

Перед любой UI-работой ОБЯЗАТЕЛЬНО прочитай:
- UI система: ~/venture-studio/ui-skill/SKILL.md
- Тема проекта: ~/venture-studio/ui-skill/themes/nexy.md

## Tech Stack

```
Frontend:     Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Zustand
Backend:      Supabase (PostgreSQL + Auth + Realtime + Storage + RLS)
AI:           OpenAI gpt-4o-mini (чат, exclusion detection), Anthropic (SDK установлен), Replicate + CivitAI (генерация изображений)
Платежи:      Stripe (Checkout + Webhooks + Customer Portal)
Email:        Resend (noreply@nexy.life)
Хостинг:      Vercel
Домен:        nexy.life
```

## Текущий статус

**Работает:**
- Онбординг (свайпы, 20 категорий, gates)
- Body Map (SVG-силуэты, зоны, действия)
- Discovery flow (адаптивный, свайп + SceneRendererV3)
- Partner invite + matching (legacy + tag-based)
- Date Night (mood → мини-свайп → результаты)
- AI Chat + Partner Avatar Chat
- Premium (Stripe Checkout + Customer Portal)
- Лендинг
- Admin panel
- i18n (RU + EN)

**Сломано:**
- Proposals: UI создания есть, но discovery flow НЕ ЧИТАЕТ proposals из БД — партнёр не видит предложенные сцены
- generateQuestion(): AI-генерация существует в src/lib/ai.ts, но не вызывается в discovery flow

## Скоуп текущего этапа

### P0 — без этого не запуск
- [ ] Настроить Vitest + базовые тесты
- [ ] Fix proposals flow — discovery должен читать proposals и показывать партнёру
- [ ] Onboarding analytics — трекинг drop-off по шагам воронки
- [ ] Invite flow optimization — ключевой growth lever

### P1 — важно, но можно после запуска
- [ ] PWA (home screen → retention)
- [ ] Profile analytics (Premium value proposition)

### P2 — nice to have
- [ ] Referral program
- [ ] Push notifications (via PWA)

## Документация

Подробная техническая документация: `docs/INDEX.md`

## Архитектура

### Структура проекта

> Корень Next.js проекта — `src/`. CLAUDE.md лежит на уровень выше.

```
src/
  app/
    (auth)/        — /login, /signup, /callback (callback — route.ts, не page)
    (app)/         — /onboarding, /discover, /profile, /chat, /partners, /date, /premium, /settings
    admin/         — 10 страниц админки (scenes, users, prompts, topics, image-pairs и др.)
    api/           — серверные routes (ai, partner-chat, discovery, stripe, webhooks, admin, invite, notifications и др.)
    page.tsx       — лендинг
  components/
    landing/       — компоненты лендинга
    discovery/     — SwipeableSceneCard, SceneRendererV3, BodyMap (BodyMapAnswer + силуэты), SmartIntro, ExclusionDialog
    ui/            — shadcn/ui компоненты
    admin/         — компоненты админки
    date/          — DateCard, DateResults, QuickSceneCard
    partners/      — MatchList, PartnerCard, PartnerChat
    premium/       — PricingCards
    profile/       — DimensionCard, PreferenceMap
    shared/        — BottomNav, Header
  lib/
    ai.ts          — OpenAI integration
    matching.ts    — алгоритм matching между партнёрами
    locale.ts      — i18n (ru/en)
    onboarding-gates.ts    — маппинги сцен → gates
    scene-progression.ts   — адаптивный алгоритм discovery + inter-scene gates
    scene-conditions.ts    — skip/prefill движок
    scene-matcher.ts       — подбор сцен
    tag-preferences.ts     — per-tag предпочтения
    stripe.ts              — Stripe integration
    resend.ts              — Email integration
    types.ts               — общие типы
    utils.ts               — утилиты
    body-map-processing.ts
    profile-signals.ts     — психологическое профилирование
    smart-intro.ts
    topic-flow.ts
    supabase/        — client.ts, server.ts, middleware.ts
    email-templates/ — шаблоны email (invite)
  hooks/
    useNotifications.ts
  scenes/            — данные сцен (v2/composite/, topics.json, flow-rules.json)
supabase/
  migrations/        — НЕ МЕНЯТЬ существующие
```

### Ключевые решения
- Privacy-first: несовпавшие предпочтения НИКОГДА не передаются клиенту партнёра
- Gates: автоматически вычисляются триггером `compute_gates_from_scene_responses()` при каждом ответе
- Tag preferences: monotonic growth — interest_level никогда не снижается (берётся max)
- Matching: два алгоритма параллельно (legacy JSONB + tag-based с role complementarity), tag-based приоритетнее
- Discovery: 70% exploitation (то что нравится) / 30% exploration (новое)

### Схема БД (ключевые таблицы)
- `profiles` — пользователь (gender, interested_in, language)
- `scenes` — все сцены (composite format, slug, elements, tags, gates)
- `scene_responses` — единая таблица всех ответов
- `tag_preferences` — per-tag предпочтения (interest, role, intensity, experience)
- `user_gates` — вычисленные gates (onboarding + body_map + activity → unified)
- `partnerships` — партнёрства (invite_code, status, expires_at)
- `subscriptions` — Stripe подписки
- `partner_chat_messages` — история чата с AI-аватаром
- `proposals` — предложения партнёру (СЛОМАНО — не читается в discovery)
- `dates` / `date_responses` — свидания

## Coding Standards

- Node.js 18+
- TypeScript strict, no `any`
- Tailwind для стилей, НЕ inline styles и НЕ CSS modules
- shadcn/ui для базовых компонентов
- ВСЕ пользовательские строки через `t()` из `src/lib/locale.ts` (RU + EN). Хардкод текста = баг
- После каждой фичи: `npm run build && npm run lint && npm test`
- Коммиты: conventional commits (`feat:`, `fix:`, `refactor:`)

## Git

- После завершения каждой задачи из скоупа — сделай коммит
- НЕ коммить промежуточные/сломанные состояния
- Перед коммитом: build + lint + tests должны проходить
- Формат: `feat: add proposals to discovery flow` / `fix: invite expiry check`
- НИКОГДА не коммить .env файлы

## Env Variables

Файл `.env.local` уже настроен. НЕ трогать значения, НЕ коммитить.

## Запуск

```bash
npm run dev          # http://localhost:3000
npm test             # запуск тестов
```

После каждой фичи — открой в браузере и проверь что работает.

## Деплой

- Платформа: Vercel
- Авто-деплой: да, на push в main

## Out of Scope — НЕ ДЕЛАТЬ

- ❌ Не менять существующие миграции БД
- ❌ Не рефакторить legacy preference_profiles → tag_preferences (техдолг, не сейчас)
- ❌ Не менять структуру сцен (composite format)
- ❌ Не добавлять Gay/Bi контент (версия 2)
- ❌ Не добавлять новые зависимости без обоснования
