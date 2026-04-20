# V3 Implementation Status

## Дата обновления: 2026-04-20

> **Статус:** 🚧 Миграция с V2 на V3 в процессе. БД и контент уже в V3 формате.
> Runtime постепенно переключается на V3 sequencing.

---

## V3 Архитектура

**Плоская структура сцен без nested follow-ups:**
- `main_question` — основная тема (свайп YES/NO/VERY/IF_PARTNER)
- `clarification` — уточняющая сцена для main_question
- `intro_slide` — runtime-сгенерированный текст между группами

**Типы V3 сцен (scene_type):**
- `main_question` — главный вопрос темы (обычно `is_onboarding = true`)
- `clarification` — уточнение (ссылается на main через `clarification_for[]`)
- `multi_choice_text` — множественный выбор текстовых опций
- `image_selection` — выбор из картинок
- `body_map_activity` — привязка зон тела к активности
- `paired_text` — парные вопросы (give/receive)
- `scale_text` — шкала интенсивности

---

## Готовность компонентов

### UI Components (V3)

| Компонент | Статус | Файл |
|-----------|--------|------|
| `SceneRendererV3` | ✅ | `src/components/discovery/SceneRendererV3.tsx` |
| `SwipeCardsGroupV3` | ✅ | `src/components/discovery/SwipeCardsGroupV3.tsx` |
| `IntroSlideV3` | ✅ | `src/components/discovery/IntroSlideV3.tsx` |
| `MultiChoiceTextV3` | ✅ | `src/components/discovery/MultiChoiceTextV3.tsx` |
| `ImageSelectionV3` | ✅ | `src/components/discovery/ImageSelectionV3.tsx` |
| `BodyMapActivityV3` | ✅ | `src/components/discovery/BodyMapActivityV3.tsx` |
| `PairedTextV3` | ✅ | `src/components/discovery/PairedTextV3.tsx` |
| `ScaleTextV3` | ✅ | `src/components/discovery/ScaleTextV3.tsx` |
| `BodyMapAnswer/` | ✅ | `src/components/discovery/BodyMapAnswer/` |

### Backend Logic

| Модуль | Статус | Файл |
|--------|--------|------|
| `scene-sequencing-v3.ts` | ✅ | `src/lib/scene-sequencing-v3.ts` |
| `tag-preferences.ts` | ✅ V3 | `updateTagPreferencesFromSwipe` + `markTagsAsRejected` |
| `onboarding-gates.ts` | ✅ | Работает через `user_gates` trigger |
| `matching.ts` | ✅ | Tag-based partner matching |
| `scene-progression.ts` | ⚠️ | Содержит legacy V2 функции, будут удалены после переключения /discover |
| `admin-auth.ts` | ✅ | `requireAdmin()` на всех admin API routes |

### Database (35 миграций)

| Миграция | Назначение |
|----------|-----------|
| `028_scene_types_v3.sql` | Добавила scene_type, clarification_for, user_clarification_tracking |
| `030_unified_scene_structure.sql` | is_onboarding, for_gender |
| `033_unified_architecture.sql` | sets_gate + auto-computed gates trigger |
| `035_drop_v2_legacy_columns.sql` | 🚧 DROP elements, follow_up, question (после переключения кода) |

### Content

- **211 активных V3 clarification сцен** (92% контента)
- **58 onboarding сцен** → работают как main_question
- **141 inactive** V2 сцена — архив, не видна юзеру
- **6 сцен** с `scene_type = null` — legacy, требуют ручной миграции или архивации

---

## Discovery Flow (V3)

```
1. User signs up → выбор пола → /discover
2. buildDiscoveryContextV3() собирает контекст (gates, shown clarifications)
3. getNextDiscoveryScenesV3() возвращает { introSlide?, scenes[], triggeredByMain? }
4. Если introSlide → показать IntroSlideV3
5. Если scenes.length > 1 → SwipeCardsGroupV3 (колода)
6. Если scenes.length === 1 → SceneRendererV3 (один сцена)
7. На каждый ответ: updateTagPreferencesFromSwipe + markClarificationShown
8. Gates пересчитываются автоматически через trigger → фильтрация следующих сцен
9. При 0 scenes → фаза 'completed'
```

**Значения свайпов:**
- `0` — NO (rejected, interest_level -1)
- `1` — YES (interested, interest_level 50)
- `2` — VERY (very interested, interest_level 80)
- `3` — IF_PARTNER (conditional, interest_level 30)

---

## Что осталось

### Критично (блокирует полный переход)
- [ ] Переключить `src/app/(app)/discover/page.tsx` с V2 логики на V3 sequencing (в работе)
- [ ] Удалить V2 функции из `scene-progression.ts` (после переключения)
- [ ] Удалить V2 типы из `types.ts` (V2Element, V2FollowUp, V2Question, V2AIContext)
- [ ] Запустить migration 035 на проде (после всего кода)

### Важно (UX кайфовости)
- [ ] Progress indicator "3/20" в main questions
- [ ] Feedback loop каждые 5 сцен ("узнали про тебя X")
- [ ] Profile reveal после 30 сцен
- [ ] Value intro (3 слайда) после регистрации
- [ ] Partner match reveal с подсветкой IF_PARTNER-совпадений

### Nice to have
- [ ] Age gate 18+ при регистрации
- [ ] Tests на scene-sequencing-v3, matching, tag-preferences
- [ ] Streaks и weekly digest для retention
- [ ] Централизованные scoring константы в admin_config таблице (A/B ready)
- [ ] Rate-limiting на admin endpoints и Stripe webhook

---

## Архив

- Старый V2 статус: `docs/_archive/status-v2.md`
- V2 architecture spec: `docs/_archive/architecture-v2.md`
