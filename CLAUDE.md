# Nexy

> Intimate Discovery — приложение для пар для исследования предпочтений через AI-driven сцены, body map и matching алгоритмы.

## Общие ресурсы студии

Студийные скиллы (submodule): `.studio/skills/`
- UI система: `.studio/skills/skills/ui-system/SKILL.md`
- Лендинги: `.studio/skills/skills/landing-page/SKILL.md`
- Запуск: `.studio/skills/skills/launch-plan/SKILL.md`
- CLAUDE.md генератор: `.studio/skills/skills/claude-md-generator/SKILL.md`
- Тема проекта: `./themes/ui-theme.md`

## Tech Stack

```
Runtime:      Node.js 20+ (TypeScript)
Frontend:     Next.js 16 (React 19, App Router)
UI:           shadcn/ui + Radix + Tailwind CSS
State:        React hooks + Supabase realtime
Database:     Supabase (PostgreSQL, Auth, Storage)
AI:           Claude API (scene generation, QA), Replicate (image generation)
Images:       CivitAI + Replicate (NSFW scene images)
Payments:     Stripe (subscriptions: free/monthly/yearly/lifetime)
Auth:         Supabase Auth + requireAdmin helper для admin endpoints
Hosting:      Vercel (frontend + API routes)
```

## Текущий статус

**Работает:**
- V3 Flat Scene Architecture (main_question + clarifications, без nested follow-ups)
- Swipe-based discovery (NO / YES / VERY / IF_PARTNER)
- Intro slides между группами clarification-сцен
- Дедупликация clarifications через `user_clarification_tracking`
- Body Map (интерактивный выбор зон тела)
- Tag Preferences агрегация из swipe-ответов
- Adaptive Scene Progression (scoring, exploration/exploitation)
- Unified gates: `sets_gate` поле + auto-computed `user_gates` trigger
- Partner matching (tag-based)
- Admin панель с `requireAdmin()` на всех endpoint'ах
- Stripe подписки
- 35 миграций в Supabase

**В процессе:**
- Полная миграция `/discover` на V3 sequencing (сейчас частично через `SceneRendererV3`)
- Кайфовый UX: progress indicator, profile reveal, feedback loop
- Генерация изображений для всех V3 сцен

## Архитектура

### Структура проекта
```
nexy/
├── CLAUDE.md
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated pages
│   │   │   ├── discover/       # Основная воронка (V3 сцены + body map)
│   │   │   ├── onboarding/     # Один шаг: выбор пола
│   │   │   ├── partners/       # Партнёры (invite + matches)
│   │   │   ├── profile/        # Профиль
│   │   │   ├── premium/        # Stripe подписки
│   │   │   ├── chat/           # AI-чат
│   │   │   ├── date/           # Date night
│   │   │   └── settings/       # Настройки
│   │   ├── (auth)/             # Login / signup / callback
│   │   ├── admin/              # Admin panel (requires ADMIN_EMAILS)
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── discovery/          # V3 scene renderers + body map
│   │   ├── landing/            # Landing page
│   │   ├── partners/           # Partner management
│   │   ├── premium/            # Subscription UI
│   │   ├── profile/            # User profile
│   │   ├── admin/              # Admin components
│   │   ├── shared/             # Shared components
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── admin-auth.ts          # requireAdmin() для API routes
│       ├── scene-sequencing-v3.ts # V3 main_question + clarification flow
│       ├── scene-progression.ts   # Adaptive scoring + selection
│       ├── tag-preferences.ts     # Swipe-based preference aggregation (V3)
│       ├── topic-flow.ts          # Topic-based discovery
│       ├── matching.ts            # Partner matching
│       ├── onboarding-gates.ts    # Scene filtering через user_gates
│       ├── body-map-processing.ts # Body zone processing
│       ├── ai.ts                  # Claude API
│       ├── replicate.ts           # Image generation
│       ├── stripe.ts              # Payments
│       └── supabase/              # Server / client / middleware
├── scenes/                      # Scene JSON sources (импортированы в БД)
├── supabase/
│   ├── migrations/              # 35 SQL migrations
│   ├── schema.sql               # Full schema
│   └── seed.sql                 # Seed data
├── docs/                        # Documentation
└── themes/
    └── ui-theme.md              # Product UI theme
```

### Ключевые сущности V3

**Main Question** — сцена с одним основным вопросом про тему (`scene_type = 'main_question'`). Реализуется как onboarding scene (`is_onboarding = true`).
**Clarification** — уточняющая сцена для main_question'а (`scene_type = 'clarification'`, `clarification_for = [main_slug, ...]`). Показывается один раз на пользователя.
**Intro Slide** — runtime-сгенерированный текст перед группой clarifications ("Тебе нравится X. Давай узнаем больше").
**Swipe Values** — 0 (NO), 1 (YES), 2 (VERY), 3 (IF_PARTNER).
**Tag Preferences** — агрегированные предпочтения по `tag_ref` с `interest_level`, `role_preference`, `experience_level`.
**Gates** — auto-computed из ответов через `compute_gates_from_scene_responses` trigger (migration 033).

### Схема БД (ключевые таблицы)
- `profiles` — пользователи (gender, interested_in, language, onboarding_completed)
- `scenes` — V3 сцены (scene_type, clarification_for, text_options, image_options, paired_questions, is_onboarding, for_gender, sets_gate)
- `scene_responses` — все ответы (swipe, multi_choice, body_map и т.д.) в едином `answer` JSONB
- `user_clarification_tracking` — дедуп clarifications
- `user_gates` — auto-computed gates для фильтрации сцен
- `tag_preferences` — агрегированные предпочтения (interest_level -1/30/50/80)
- `subscriptions` — Stripe
- `partnerships` — пары (invite_code, status)

### Discovery Flow (V3)
```
Signup → Onboarding (gender) → Discovery loop:
  ┌─────────────────────────────────────────┐
  │  Main Question (свайп)                  │
  │       ↓                                 │
  │  YES/VERY → Intro Slide                 │
  │       ↓                                 │
  │  Clarification group (SwipeCardsGroupV3)│
  │       ↓                                 │
  │  Tag aggregation → Adaptive scoring     │
  └─────────────────────────────────────────┘
Partner invite → Matching на основе tag_preferences
```

## Coding Standards

- TypeScript strict, без `any` (исключения — только через `// eslint-disable` с комментарием почему)
- Next.js App Router, RSC where possible
- shadcn/ui + Tailwind
- Supabase через `@supabase/ssr` (server/client/middleware)
- Admin endpoints защищены через `requireAdmin()` из `@/lib/admin-auth`
- Все пользовательские строки через i18n (`lib/locale.ts`). Хардкод = баг
- После каждой фичи: `npm run build && npm run lint`
- Коммиты: conventional (`feat:`, `fix:`, `refactor:`, `security:`)

## Git

- После завершения каждой задачи — коммит с conventional prefix
- НЕ коммить промежуточные/сломанные состояния
- Перед коммитом: build + lint должны проходить
- НИКОГДА не коммить `.env*` файлы

## Env Variables

Файл `.env.local` настроен. НЕ трогать значения, НЕ коммитить.

Дополнительно для админки: `ADMIN_EMAILS=a@b.com,c@d.com` — список email'ов с доступом к `/api/admin/*`.

## Запуск

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # Production build
npm run lint             # ESLint
```

## Документация

Подробная документация в `docs/`:
- `docs/INDEX.md` — оглавление
- `docs/status.md` — текущий статус реализации
- `docs/architecture.md` — архитектура Discovery системы
- `docs/database.md` — полная схема БД

## Out of Scope — НЕ ДЕЛАТЬ

- ❌ Не менять существующие миграции (только новые)
- ❌ Не возвращать V2 Composite + nested follow-ups архитектуру
- ❌ Не хранить API ключи в коде
- ❌ Не добавлять новые зависимости без обоснования
