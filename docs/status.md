# V2 Implementation Status

## Дата обновления: 2026-03-11

> **Статус:** ✅ V2 Composite Scenes Flow полностью реализован с AI-траекторией и адаптивным flow

---

## Реализованные компоненты

### UI Components

| Компонент | Статус | Файл | Описание |
|-----------|--------|------|----------|
| `CompositeSceneView` | ✅ | `src/components/discovery/CompositeSceneView.tsx` | Отображение composite scene с изображением, заголовком, описанием |
| `ElementSelector` | ✅ | `src/components/discovery/ElementSelector.tsx` | Multi-select элементов с поддержкой min/max ограничений |
| `FollowUpFlow` | ✅ | `src/components/discovery/FollowUpFlow.tsx` | Управление потоком follow-up вопросов с навигацией |
| `ImageSelectAnswer` | ✅ | `src/components/discovery/ImageSelectAnswer.tsx` | Выбор из изображений |
| `TextInputAnswer` | ✅ | `src/components/discovery/TextInputAnswer.tsx` | Свободный текстовый ввод |
| `TextWithSuggestionsAnswer` | ✅ | `src/components/discovery/TextWithSuggestionsAnswer.tsx` | Выбор из предложений + свой вариант |
| `IntensityAnswer` | ✅ | `src/components/discovery/IntensityAnswer.tsx` | Шкала интенсивности (0-100) с метками |
| `RoleAnswer` | ✅ | `src/components/discovery/RoleAnswer.tsx` | Выбор роли (Give/Receive/Both) |
| `ExperienceAnswer` | ✅ | `src/components/discovery/ExperienceAnswer.tsx` | Уровень опыта (Tried/Want to try/Fantasy only) |

### Backend Logic

| Модуль | Статус | Файл | Описание |
|--------|--------|------|----------|
| `topic-flow.ts` | ✅ | `src/lib/topic-flow.ts` | Topic-based discovery flow с gate scoring |
| `tag-preferences.ts` | ✅ | `src/lib/tag-preferences.ts` | Агрегация предпочтений в `tag_preferences` |
| `profile-signals.ts` | ✅ | `src/lib/profile-signals.ts` | Обновление психологического профиля |
| `scene-progression.ts` | ✅ | `src/lib/scene-progression.ts` | Полный AI-flow: scoring, gates, exploration/exploitation |
| `show-if.ts` | ✅ | `src/lib/show-if.ts` | **NEW** Условное отображение follow-ups (show_if) |

### Database

| Таблица | Статус | Миграция | Описание |
|---------|--------|----------|----------|
| `scene_responses` | ✅ | `005 + 021 + 033` | Единая таблица ответов (legacy + V2 + onboarding) |
| `tag_preferences` | ✅ | `011_finalize_v2.sql` | Агрегированные предпочтения по тегам |

### Integration

| Компонент | Статус | Описание |
|-----------|--------|----------|
| Discovery Flow | ✅ | Полная интеграция в `discover/page.tsx` |
| Body Map Stage | ✅ | Отдельный этап перед сценами |
| Scene Progression | ✅ | Адаптивный flow с dedupe_by_tag и приоритизацией на основе tag_preferences |
| API Routes | ✅ | `/api/ai/question` работает с V2 |

---

## V2 Composite Scenes Flow

### Полный flow реализован:

1. ✅ **Показ composite scene**
   - `CompositeSceneView` отображает сцену с изображением
   - Показываются заголовок, описание, теги, интенсивность

2. ✅ **Выбор элементов**
   - `ElementSelector` позволяет выбрать элементы сцены
   - Поддержка min/max ограничений
   - Визуальная индикация выбранных элементов

3. ✅ **Follow-up вопросы**
   - `FollowUpFlow` управляет потоком follow-up вопросов
   - Поддержка всех типов follow-up
   - Навигация вперед/назад
   - Счетчик прогресса

4. ✅ **Сохранение данных**
   - Сохранение в `scene_responses` (единая таблица):
     - `elements_selected` - массив ID выбранных элементов
     - `element_responses` - JSONB с ответами на follow-up
     - `skipped` - флаг пропуска сцены
   - Обновление `tag_preferences` автоматически

### Обработка всех случаев:

- ✅ Пропуск сцены (кнопка "Не моё") → `skipped: true`
- ✅ Пропуск выбора элементов → `selected_elements: []`, `skipped: true`
- ✅ Выбор элементов без follow-up → сохранение сразу
- ✅ Выбор элементов с follow-up → переход к follow-up фазе
- ✅ Пропуск follow-up → сохранение с пустыми `element_responses`

---

## Tag Preferences Aggregation

### Реализовано в `tag-preferences.ts`:

- ✅ Обновление `interest_level` на основе выбранных элементов (базовый: 50)
- ✅ Извлечение `role_preference` из follow-up типа `role`
- ✅ Извлечение `intensity_preference` из follow-up типа `intensity`/`scale`
- ✅ Извлечение `experience_level` из follow-up типа `experience`
- ✅ Сохранение специфичных предпочтений в `specific_preferences`
- ✅ Отслеживание `source_scenes` (какие сцены внесли вклад)
- ✅ Автоматический вызов при сохранении ответов

---

## Body Map Integration

### Реализовано:

- ✅ Body Map показывается как **отдельный этап ПЕРЕД сценами**
- ✅ Проверка статуса Body Map (completed/skipped/pending)
- ✅ Создание виртуальных сцен для Body Map на основе профиля пользователя
- ✅ Кнопка "Пропустить Body Map" для пропуска
- ✅ Сохранение флага пропуска в `user_flow_state.tag_scores.body_map_skipped`
- ✅ Автоматический переход к обычным сценам после Body Map

---

## Scene Progression Algorithm

### Реализовано в `scene-progression.ts`:

- ⚠️ **Dedupe_by_tag логика** (отключена, возвращает false)
  - Инфраструктура готова: `getAnsweredElementIds()`, `getAnsweredTagRefs()`
  - `shouldSkipSceneByDedupe()` — заглушка, всегда возвращает false

- ✅ **Адаптивная приоритизация**
  - Расчет score сцены на основе `tag_preferences`:
    - Interest level boost (0-50 points)
    - Intensity preference matching
    - Role preference matching (FIXED: правильная логика give/receive)
    - Bonus за новые элементы (+5 за каждый)
    - Penalty за высокую интенсивность, если пользователь не показал интерес
    - Breadth-first bonus для категорийного покрытия
  - Функция: `calculateSceneScore()`

- ✅ **Адаптивный ordering**
  - `getAdaptiveScenes()` - получает адаптивно отсортированные сцены
  - Интегрировано в `getFilteredScenesClient()` с опцией `enableAdaptiveFlow`

- ✅ **Onboarding Gates Filtering**
  - Блокировка сцен на основе onboarding ответов через DB trigger
  - Сцены с `sets_gate` устанавливают гейты при YES/VERY ответе
  - Детальный маппинг 150+ сцен → гейты с поддержкой AND/OR и level:'very'
  - Функции: `fetchUserGates()`, `isSceneAllowed()` из `onboarding-gates.ts`

- ✅ **Comfort Signals / Intensity Progression** (NEW)
  - Начало с мягких сцен (intensity 1-2)
  - Постепенное повышение интенсивности на основе:
    - Количества отвеченных сцен
    - Среднего interest level
    - Среднего intensity preference
  - Функция: `getUserComfortLevel()`

- ✅ **Exploration vs Exploitation** (NEW)
  - 70% эксплуатация (лучшие matches по scoring)
  - 30% исследование (случайные из оставшихся)
  - Функция: `applyExplorationExploitation()`

- ✅ **Breadth-First Category Coverage** (NEW)
  - Bonus для не виденных категорий
  - Активен в первые 15 сцен discovery
  - Функция: `calculateBreadthBonus()`

---

## Show-If Conditions (NEW)

### Реализовано в `show-if.ts`:

- ✅ **element_selected** - показать follow-up если выбраны определённые элементы
- ✅ **interest_level** - показать follow-up если interest level в диапазоне {min, max}
- ✅ **answer_contains** - показать follow-up если предыдущие ответы содержат значения

### Функции:
- `shouldShowFollowUp()` - проверка всех условий
- `filterFollowUps()` - фильтрация массива follow-ups
- `getDrilldownsForSelectedOptions()` - получение drilldowns для выбранных опций

---

## Level 3 Drilldown Support (NEW)

### Реализовано в `FollowUpFlow.tsx`:

- ✅ **3 уровня глубины follow-ups**
  - Level 1: Основной вопрос
  - Level 2: Уточнение (follow_ups массив)
  - Level 3: Детали (вложенные follow_ups или option.drilldown)

- ✅ **Визуальная индикация уровня**
  - Badge с текстом "Уточнение" / "Детали"

- ✅ **Динамическое добавление drilldowns**
  - При выборе опции с drilldown → добавление в очередь
  - Поддержка до 3-х уровней вложенности

---

## Что осталось (опционально)

### Не критично, можно добавить позже:

- ⚠️ **Генерация изображений**
  - Генерация изображений для всех composite scenes
  - Можно делать по мере необходимости

- ⚠️ **AI-предсказания**
  - ML-модель для улучшения scoring на основе истории
  - Пока используется rule-based scoring

---

## Тестирование

### Готово к тестированию:

- ✅ Все компоненты интегрированы
- ✅ Нет ошибок линтера
- ✅ Типы TypeScript обновлены
- ✅ База данных поддерживает V2

### Рекомендуется протестировать:

1. Полный flow: сцена → выбор элементов → follow-up → сохранение
2. Пропуск сцены
3. Пропуск элементов
4. Пропуск follow-up
5. Обновление tag_preferences
6. Body Map flow
7. Переходы между фазами

---

## Файлы для справки

- `docs/database.md` - актуальная схема базы данных
- `docs/architecture.md` - архитектура Discovery системы
- `src/app/(app)/discover/page.tsx` - основной discovery flow
- `src/lib/tag-preferences.ts` - агрегация tag preferences
- `src/lib/scene-progression.ts` - адаптивный scoring и selection
- `src/lib/matching.ts` - tag-based partner matching
