# Intimate Discovery — Documentation Index

> Последнее обновление: 2026-03-11

## Quick Links

| Документ | Описание |
|----------|----------|
| [architecture.md](architecture.md) | Архитектура Discovery системы, flow, компоненты |
| [database.md](database.md) | Схема базы данных, таблицы, миграции |
| [scenes.md](scenes.md) | Система сцен — 162 composite scenes, onboarding gates |
| [body-map.md](body-map.md) | Body Map — интерактивный выбор зон тела |
| [admin-panel.md](admin-panel.md) | Админ-панель — управление сценами и пользователями |
| [content-guidelines.md](content-guidelines.md) | Правила написания контента: описания, промпты |
| [status.md](status.md) | Статус реализации — что готово, что в процессе |
| **[onboarding-integration.md](onboarding-integration.md)** | **Визуальный онбординг, гейты, Mobile UX** |

---

## Структура проекта

```
intimate-discovery/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── discover/           # Discovery flow
│   │   ├── admin/              # Admin panel
│   │   └── api/                # API routes
│   ├── components/
│   │   └── discovery/          # UI компоненты для discovery
│   └── lib/                    # Backend logic
│       ├── tag-preferences.ts  # Агрегация предпочтений
│       ├── scene-progression.ts # Адаптивный flow
│       ├── topic-flow.ts       # Topic-based discovery flow
│       ├── matching.ts         # Tag-based partner matching
│       └── onboarding-gates.ts # Gates system for scene filtering
│
├── scenes/
│   └── v2/                     # АКТУАЛЬНЫЕ СЦЕНЫ
│       ├── README.md           # Полная документация по сценам
│       ├── onboarding/         # 20 категорий визуального онбординга
│       │   └── categories.json # Описания и image_prompts
│       ├── composite/          # 162 composite scenes
│       │   ├── baseline/       # 14 foundational gates
│       │   └── {categories}/   # 148 detailed scenes
│       ├── body-map/           # 6 body map activities
│       └── activities/         # sounds, clothing
│
├── supabase/
│   └── migrations/             # SQL миграции
│
└── docs/                       # ЭТА ПАПКА
    └── INDEX.md                # Этот файл
```

---

## Ключевые концепции

### Discovery Flow (5 этапов)

1. **Visual Onboarding** — свайп-карточки по 20 категориям (NO/YES/VERY)
2. **Body Map** — пользователь указывает зоны на теле (kissing, biting, spanking...)
3. **Activities** — выбор звуков и одежды (audio_select, image_select)
4. **Baseline Scenes** — 14 базовых вопросов для уточнения
5. **Composite Scenes** — 162 детальные сцены с follow-up вопросами

### Onboarding Gates

Визуальный онбординг определяет доступ к категориям сцен:
- `oral: NO` → пропускаем все oral scenes
- `anal: NO` → пропускаем anal, rimming, pegging
- `rough: VERY` → открываем face-slapping, cnc
- `bondage: YES` + `rough: VERY` → открываем extreme scenes

### Scene Structure

Каждая сцена содержит:
- `sets_gate` — какой gate открывает при YES
- `clarification_for` — после каких сцен показывать (массив slug-ов сцен)
- `paired_scene` — парная сцена (та же ситуация, другая перспектива)
- `question` — тип вопроса (swipe/multi_select/scale)

---

## Как добавить новую фичу

1. **Дизайн** — опиши в соответствующем .md файле
2. **База данных** — добавь миграцию в `supabase/migrations/`
3. **Backend** — добавь логику в `src/lib/`
4. **UI** — добавь компонент в `src/components/`
5. **Статус** — обнови `status.md`

---

## Архив

Устаревшие документы в `_archive/`:
- `SCENE_ANALYSIS.md` — старый анализ сцен
- `SCENE_ANALYSIS_DETAILED.md` — детальный анализ (устарел)
