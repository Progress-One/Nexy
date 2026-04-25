# Nexy

> Web-приложение для пар — анонимный matching интимных предпочтений через свайп-карточки с иллюстрациями. Несовпавшие желания никогда не раскрываются партнёру.

## Общие ресурсы студии

Перед любой UI-работой ОБЯЗАТЕЛЬНО прочитай:
- UI система: ~/venture-studio/ui-skill/SKILL.md
- Тема проекта: ~/venture-studio/ui-skill/themes/nexy.md

## Tech Stack

```
Frontend:     Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Zustand
Backend:      VPS PostgreSQL + Kysely (typed queries) + jose (JWT auth) + MinIO (S3-compatible storage)
AI:           OpenAI gpt-4o-mini (чат, exclusion detection), Anthropic (SDK установлен), Replicate + CivitAI (генерация изображений)
Платежи:      Stripe (Checkout + Webhooks + Customer Portal)
Email:        Resend (noreply@nexy.life)
Хостинг:      VPS (Hosting Ukraine, 173.242.60.76) — Caddy reverse proxy + Docker
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
    http-client/     — client.ts, middleware.ts (browser HTTP wrapper for /api/* routes)
    db/              — Kysely pool + schema types (index.ts, schema.ts — auto-generated)
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

### Database types

Kysely schema types are auto-generated from the VPS DB via `kysely-codegen`.
After any DB schema change, regenerate:

```bash
npm run db:types
```

Do NOT hand-edit `src/lib/db/schema.ts`.

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

**Платформа:** собственный VPS студии (shared), **не** Vercel.

- Сервер: 173.242.60.76 (Ubuntu 24.04, 2 GB RAM, 20 GB NVMe) — `ssh root@173.242.60.76` (ed25519)
- Инфра-документация: [../pulse_factory/docs/MIGRATION_GUIDE.md](../../pulse_factory/docs/MIGRATION_GUIDE.md) и `docs/VPS_INFRASTRUCTURE.md`
- Reverse proxy: Caddy (`/opt/studio/caddy/Caddyfile`) — auto-SSL Let's Encrypt
- Shared сервисы на этой же машине: PostgreSQL 16+pgvector (5432), MinIO (9000/9001), pgAdmin (8080)

**Что уже мигрировано на VPS (Phase 3 готово):**
- БД `nexy_db` — 29 таблиц. Connection в `.env.local` (`DATABASE_URL`)
- Storage: MinIO bucket `scenes` — 859 объектов, 905 MB, endpoint `http://173.242.60.76:9000/scenes/`
- Auth: свой JWT через jose (`/api/auth/{login,signup,logout,me}`, cookie `nexy_session`, 30 дней)
- Кодовая база: Kysely вместо shim (см. `src/lib/db/`, 0 TS-ошибок, 146 тестов зелёные)
- Бэкап БД: ежедневно в 3:00 UTC, 7-дневное хранение в `/opt/studio/backups/daily/`

**Что ещё НЕ готово — deploy scaffolding для Next.js-контейнера:**

Паттерн студии (по PulseFactory — см. MIGRATION_GUIDE.md):
```
deploy/
├── Dockerfile.web              — Next.js standalone image (non-root)
├── docker-compose.nexy.yml     — services bound to 127.0.0.1, joined to studio_default network
├── Caddyfile.nexy              — nexy.life → контейнер (WS + gzip + auto-SSL)
└── bootstrap.sh                — idempotent one-shot: clone → .env → build → up -d → Caddy reload
```

Когда будет создана папка `deploy/`, деплой чеклист:
- [ ] DNS: `A nexy.life → 173.242.60.76` (проверить)
- [ ] `cd /opt/studio/nexy && bash deploy/bootstrap.sh` (первый запуск сидит `.env` и выходит)
- [ ] Заполнить `/opt/studio/nexy/.env`: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAILS=alex@skill.im,...`, `MINIO_*`, `RESEND_API_KEY`, `STRIPE_*`, `OPENAI_API_KEY`
- [ ] Повторно `bash deploy/bootstrap.sh` — билд, старт, reload Caddy
- [ ] Smoke: `curl https://nexy.life/` → 200, login с тестовым аккаунтом

## Out of Scope — НЕ ДЕЛАТЬ

- ❌ Не менять существующие миграции БД
- ❌ Не рефакторить legacy preference_profiles → tag_preferences (техдолг, не сейчас)
- ❌ Не менять структуру сцен (composite format)
- ❌ Не добавлять Gay/Bi контент (версия 2)
- ❌ Не добавлять новые зависимости без обоснования
