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
Frontend:     Next.js (React 19, App Router)
UI:           shadcn/ui + Radix + Tailwind CSS
State:        React hooks + Supabase realtime
Database:     Supabase (PostgreSQL, Auth, Storage)
AI:           Claude API (scene generation, QA), Replicate (image generation)
Images:       CivitAI + Replicate (NSFW scene images)
Payments:     Stripe (subscriptions: free/monthly/yearly/lifetime)
Auth:         Supabase Auth
Hosting:      Vercel (frontend + API routes)
```

## Текущий статус

**Работает:**
- V2 Composite Scenes Flow (полностью)
- Body Map (интерактивный выбор зон тела)
- Follow-up система (3 уровня глубины, 10 типов ответов)
- Tag Preferences агрегация
- Adaptive Scene Progression (scoring, exploration/exploitation)
- Onboarding Gates (фильтрация сцен по ответам онбординга)
- Partner matching (tag-based)
- Admin панель (управление сценами и пользователями)
- Stripe подписки
- 34 миграции в Supabase

**В процессе:**
- Генерация изображений для всех composite scenes
- AI-предсказания для улучшения scoring

## Архитектура

### Структура проекта
```
intimate-discovery/
├── CLAUDE.md
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated pages
│   │   │   ├── discover/       # Discovery flow (основной)
│   │   │   ├── discover-v3/    # V3 discovery
│   │   │   ├── onboarding/     # Визуальный онбординг
│   │   │   ├── partners/       # Партнёры
│   │   │   ├── profile/        # Профиль
│   │   │   ├── premium/        # Подписки
│   │   │   ├── chat/           # Чат
│   │   │   ├── date/           # Дата
│   │   │   └── settings/       # Настройки
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── admin/              # Admin panel
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── discovery/          # Composite scenes, follow-ups, body map
│   │   ├── landing/            # Landing page
│   │   ├── partners/           # Partner management
│   │   ├── premium/            # Subscription UI
│   │   ├── profile/            # User profile
│   │   ├── admin/              # Admin components
│   │   ├── shared/             # Shared components
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── scene-progression.ts  # Adaptive scoring + selection
│       ├── tag-preferences.ts    # Preference aggregation
│       ├── topic-flow.ts         # Topic-based discovery
│       ├── matching.ts           # Partner matching
│       ├── onboarding-gates.ts   # Scene filtering
│       ├── body-map-processing.ts # Body zone processing
│       ├── ai.ts                 # Claude API
│       ├── replicate.ts          # Image generation
│       ├── stripe.ts             # Payments
│       └── supabase/             # Supabase client
├── scenes/                       # Scene definitions (JSON)
├── supabase/
│   ├── migrations/               # 34 SQL migrations
│   ├── schema.sql                # Full schema
│   └── seed.sql                  # Seed data
├── docs/                         # Documentation
│   ├── INDEX.md                  # Docs index
│   ├── architecture.md           # Discovery system design
│   ├── database.md               # DB schema
│   ├── scenes.md                 # 135 composite scenes
│   ├── body-map.md               # Body map system
│   ├── admin-panel.md            # Admin panel
│   └── status.md                 # Implementation status
└── themes/
    └── ui-theme.md               # Product UI theme
```

### Ключевые сущности

**Composite Scene** — сцена с изображением, содержащая несколько элементов для выбора.
**Follow-up** — уточняющий вопрос после выбора элемента (до 3 уровней глубины).
**Tag Preferences** — агрегированные предпочтения пользователя по тегам.
**Gates** — условия, блокирующие определённые сцены на основе онбординга.

### Схема БД (ключевые таблицы)
- `profiles` — пользователи (gender, interested_in, language)
- `preference_profiles` — JSONB предпочтения
- `subscriptions` — Stripe подписки
- `partnerships` — пары (invite_code, status)
- `scene_responses` — ответы на сцены (elements_selected, element_responses JSONB)
- `tag_preferences` — агрегированные предпочтения (interest_level, role, intensity)

### Discovery Flow
```
Onboarding → Body Map → Composite Scenes → Follow-ups → Tag Aggregation → Matching
                              ↑                                    |
                              └── Adaptive Scoring ←───────────────┘
```

## Coding Standards

- TypeScript strict, no `any`
- Next.js App Router (React Server Components where possible)
- shadcn/ui + Tailwind для UI
- Supabase client через `@supabase/ssr`
- Все пользовательские строки через i18n (`lib/locale.ts`). Хардкод текста = баг
- После каждой фичи: `npm run build && npm run lint`
- Коммиты: conventional commits (`feat:`, `fix:`, `refactor:`)

## Git

- После завершения каждой задачи — сделай коммит
- НЕ коммить промежуточные/сломанные состояния
- Перед коммитом: build + lint должны проходить
- НИКОГДА не коммить .env файлы

## Env Variables

Файл `.env.local` уже настроен. НЕ трогать значения, НЕ коммитить.

## Запуск

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # Production build
npm run lint             # ESLint
```

## Документация

Подробная документация в `docs/`:
- `docs/INDEX.md` — оглавление со ссылками на все документы
- `docs/status.md` — текущий статус реализации
- `docs/architecture.md` — архитектура Discovery системы
- `docs/database.md` — полная схема БД

## Out of Scope — НЕ ДЕЛАТЬ

- ❌ Не менять существующие миграции (только новые)
- ❌ Не хранить API ключи в коде
- ❌ Не менять существующие docs/ без необходимости
- ❌ Не добавлять новые зависимости без обоснования
