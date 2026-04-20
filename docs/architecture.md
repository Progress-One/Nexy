# Discovery Architecture V3

> Плоская архитектура сцен без nested follow-ups. Юзер свайпает main_question,
> при положительном ответе получает intro slide и группу clarification-сцен.

## Концепция

**V3 отказывается от вложенности V2:**
- V2 было: composite scene → выбор элементов → follow-up → nested follow-up (3 уровня)
- V3 стало: main_question (свайп) → intro slide → clarification group (свайп или single)

**Принципы:**
1. Один вопрос — одна сцена (никакой рекурсии)
2. Clarification привязаны к main через `clarification_for[]`
3. Intro slide генерируется в runtime из title main_question'а
4. Дедупликация: clarification показывается максимум один раз на юзера
5. Gates вычисляются автоматически через DB trigger из `scene_responses`

## Scene Types

| `scene_type` | Назначение | UI компонент |
|--------------|-----------|--------------|
| `main_question` | Главный вопрос темы (обычно onboarding) | `SwipeCardsGroupV3` или `SceneRendererV3` |
| `clarification` | Уточнение внутри темы | `SwipeCardsGroupV3` |
| `multi_choice_text` | Multi-select текстовых опций | `MultiChoiceTextV3` |
| `image_selection` | Выбор одной или нескольких картинок | `ImageSelectionV3` |
| `body_map_activity` | Привязка действия к зонам тела | `BodyMapActivityV3` |
| `paired_text` | Два параллельных вопроса (give/receive) | `PairedTextV3` |
| `scale_text` | Шкала интенсивности | `ScaleTextV3` |

## Swipe Values

```
0 → NO           interest_level = -1 (rejected)
1 → YES          interest_level = 50
2 → VERY         interest_level = 80
3 → IF_PARTNER   interest_level = 30 (conditional — ценен для matching'а)
```

## Runtime Flow

```
┌──────────────────────────────────────────────────────┐
│  buildDiscoveryContextV3(supabase, userId, locale)   │
│  → загружает profile, user_gates, shown clarifications│
└──────────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│  getNextDiscoveryScenesV3(supabase, ctx)             │
│  → возвращает { introSlide?, scenes[], triggeredBy } │
└──────────────────────────────────────────────────────┘
                     ↓
             ┌───────┴────────┐
             ↓                ↓
     [introSlide]       [scenes.length]
     IntroSlideV3       > 1: SwipeCardsGroupV3
                        = 1: SceneRendererV3
                        = 0: phase 'completed'
                     ↓
┌──────────────────────────────────────────────────────┐
│  На каждый ответ:                                    │
│   1. scene_responses.upsert(answer JSONB)            │
│   2. markClarificationShown (для дедупа)             │
│   3. updateTagPreferencesFromSwipe (агрегация)       │
│   4. Trigger compute_gates_from_scene_responses      │
│      автоматически обновит user_gates                │
└──────────────────────────────────────────────────────┘
                     ↓
              loadNextBatch() → повтор
```

## Gates System

**Сцена блокируется если ей нужен gate которого у юзера нет.**

Как gates появляются:
- На каждой сцене может быть `sets_gate = 'oral'` (например)
- Когда юзер отвечает YES/VERY на эту сцену → gate становится `true`
- При VERY добавляется и `oral_very`

**Производные гейты:**
- `power_dynamic OR rough` → `show_bondage`
- `oral` → `show_body_fluids`
- `recording OR exhibitionism` → `show_sexting`
- `rough_very AND bondage` → `show_extreme`

**Gates хранятся в `user_gates` таблице**, пересчитываются триггером
`compute_gates_from_scene_responses` на каждый INSERT/UPDATE в `scene_responses`.

## Clarification Deduplication

Одна clarification может относиться к нескольким main_question'ам
(через массив `clarification_for`). Чтобы юзер не видел её дважды,
используется таблица `user_clarification_tracking`:

```sql
user_id | clarification_slug | triggered_by_main | shown_at
```

При показе: `markClarificationShown(userId, cSlug, mainSlug)` → INSERT с
`ON CONFLICT (user_id, clarification_slug) DO NOTHING`.

При запросе следующей пачки: `getNextDiscoveryScenesV3` фильтрует
clarifications по `NOT IN (SELECT clarification_slug FROM user_clarification_tracking WHERE user_id = $1)`.

## Tag Preferences

Каждая сцена имеет массив `tags[]`. При положительном свайпе
(`updateTagPreferencesFromSwipe`) для каждого тега:
- `interest_level` обновляется до `MAX(existing, new)` — никогда не уменьшается
- `role_preference` выводится из slug (`-give` / `-receive` / `-m-to-f` / `-f-to-m`)
- `experience_level` опционально (never / rarely / often)
- `source_scenes` аккумулирует slugs сцен

При NO — `markTagsAsRejected` ставит `interest_level = -1`,
но только если тег не уже имеет положительный interest (не перезаписывает "нравится").

## Key Files

| Файл | Ответственность |
|------|-----------------|
| `src/lib/scene-sequencing-v3.ts` | Главная V3 логика (build context, get next scenes, dedup) |
| `src/lib/tag-preferences.ts` | Агрегация из свайпов |
| `src/lib/onboarding-gates.ts` | Чтение user_gates, фильтрация по gates |
| `src/lib/matching.ts` | Партнёрский matching на основе tag_preferences |
| `src/components/discovery/SceneRendererV3.tsx` | Роутер рендеринга по scene_type |
| `src/components/discovery/SwipeCardsGroupV3.tsx` | Колода свайп-карточек |
| `src/components/discovery/IntroSlideV3.tsx` | Intro перед clarification группой |

## Миграционные заметки

**Что было удалено в пользу V3:**
- `nested follow-ups` (3 уровня) — концептуально
- `SceneV2.elements[]` с multi-select — теперь это отдельные сцены
- `FollowUpFlow`, `ElementSelector`, `FollowUpQuestion` компоненты
- `V2Element`, `V2FollowUp`, `V2ShowIf`, `V2Question` типы
- `/api/admin/import-scenes-v2` — заменён на `import-scenes-v4`
- `/discover-v3` и `/visual-onboarding` — дубли мёртвые
- Таблицы `composite_scene_responses`, `onboarding_responses` (в миграциях 021, 033)

**Что осталось и требует завершения:**
- `src/lib/scene-progression.ts` — содержит V2 функции (`getAnsweredElementIds`,
  `isSceneBlockedByPrerequisites`), нужны только пока `/discover/page.tsx` не
  переключён на V3 sequencing
- `src/lib/types.ts` — V2 типы помечены deprecated, удалятся после /discover

## Архив

- Старая V2 спецификация: `docs/_archive/architecture-v2.md` (707 строк)
- Старый статус V2: `docs/_archive/status-v2.md`
