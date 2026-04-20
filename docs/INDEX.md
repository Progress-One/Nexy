# Nexy — Documentation Index

> Последнее обновление: 2026-04-20

## Quick Links

| Документ | Описание |
|----------|----------|
| [architecture.md](architecture.md) | V3 Discovery архитектура (main_question + clarifications) |
| [database.md](database.md) | Схема базы данных, таблицы, миграции (35 штук) |
| [scenes.md](scenes.md) | Система сцен — V3 формат, scene_type, clarification_for |
| [body-map.md](body-map.md) | Body Map — интерактивный выбор зон тела |
| [admin-panel.md](admin-panel.md) | Админ-панель (требует ADMIN_EMAILS env) |
| [content-guidelines.md](content-guidelines.md) | Правила написания контента |
| [status.md](status.md) | Статус V3 миграции — что готово, что осталось |
| [onboarding-integration.md](onboarding-integration.md) | Онбординг, гейты, Mobile UX |

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
│   └── v2/                     # JSON source (был импортирован в БД,
│       │                       # runtime читает только topics.json)
│       ├── onboarding/         # 58 main_question сцен
│       ├── composite/          # 211 активных clarification-сцен (V3 формат)
│       ├── body-map/           # 7 body map сцен
│       ├── activities/         # 3 activity сцены
│       └── topics.json         # используется в runtime
│
├── supabase/
│   └── migrations/             # SQL миграции
│
└── docs/                       # ЭТА ПАПКА
    └── INDEX.md                # Этот файл
```

---

## Ключевые концепции

### Discovery Flow (V3)

1. **Signup** — email/password + выбор пола (один экран)
2. **Main Questions** — свайп-сцены по темам (NO/YES/VERY/IF_PARTNER)
3. **Intro Slide** — runtime-сгенерированный переход перед уточнениями
4. **Clarifications** — колода или одиночные сцены (разные `scene_type`)
5. **Body Map / Activities** — сцены `body_map_activity` встроены в flow
6. **Matching** — tag-based совпадение с партнёром (включая IF_PARTNER)

### Gates System

Gates вычисляются автоматически из ответов через DB trigger:
- Сцена с `sets_gate = 'oral'` + swipe YES → `user_gates.oral = true`
- Swipe VERY → дополнительно `oral_very = true`
- Производные: `power_dynamic OR rough → show_bondage`; `rough_very AND bondage → show_extreme`

Все gates в `user_gates` таблице, пересчитываются на каждый ответ.

### Scene Structure (V3)

Каждая сцена в БД содержит:
- `scene_type` — main_question / clarification / multi_choice_text / image_selection / body_map_activity / paired_text / scale_text
- `clarification_for[]` — массив slug'ов main_question'ов для которых это clarification
- `sets_gate` — какой gate открывает при YES/VERY
- `paired_scene` — парная сцена (та же ситуация с другой стороны)
- `is_onboarding` — показывать в онбординге (обычно для main_question)
- `for_gender` — фильтрация по полу юзера
- `tags[]` — теги для агрегации в `tag_preferences`

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
