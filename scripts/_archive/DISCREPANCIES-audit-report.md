# Аудит расхождений: Сцены vs JSON-спецификации

**Дата:** 2025-01-26
**Статус:** Исправлено

---

## Исходная проблема

При сравнении create-скриптов с JSON-спецификациями и логикой gate-системы выявлены системные расхождения.

---

## Проведённый аудит

### Инструменты
- `scripts/audit-scene-tags.ts` — скрипт полного аудита БД vs JSON
- `scripts/fix-json-categories.ts` — исправление категорий в JSON

### Статистика до исправлений
| Метрика | Количество |
|---------|-----------|
| Активных сцен в БД | 296 |
| JSON-спецификаций | 163 |
| Расхождений тегов/категорий | 84 |
| Сцен без JSON-спецификации | 90 |
| Недостающих полей | 37 |

---

## Выявленные проблемы

### 1. Несогласованность именования категорий

**Проблема:** JSON-спецификации использовали underscores (`body_fluids`), а код и БД — hyphens (`body-fluids`).

**Источник правды:** `BASELINE_CATEGORY_GATES` в `src/lib/scene-progression.ts` использует hyphens.

**Исправлено:** 29 JSON-файлов в `scenes/v2/composite/`

| Было | Стало |
|------|-------|
| `age_play` | `age-play` |
| `body_fluids` | `body-fluids` |
| `cnc_rough` | `cnc-rough` |
| `control_power` | `control-power` |
| `impact_pain` | `impact-pain` |
| `intimacy_outside` | `intimacy-outside` |
| `pet_play` | `pet-play` |
| `worship_service` | `worship-service` |
| `solo_mutual` | `solo-mutual` |
| `emotional_context` | `emotional-context` |

---

### 2. Несовпадение тегов в create-скриптах

**Проблема:** Скрипты создавали сцены с тегами, отличающимися от JSON-спецификаций.
Критично для gate-системы, т.к. `tags[0]` — primary tag для фильтрации.

**Исправлены скрипты:**

| Скрипт | Теги до | Теги после |
|--------|---------|------------|
| `create-butt-plug-variants.ts` | `['butt_plug', 'anal', 'toy']` | `['toys', 'butt_plug', 'anal', 'fullness']` |
| `create-finger-sucking.ts` | `['finger_sucking', 'oral', 'sensual']` | `['oral', 'finger_sucking', 'licking', 'sensual', 'teasing']` |
| `create-squirting-self.ts` | `['squirting', 'female_orgasm', 'wet']` | `['squirting', 'squirt', 'female_orgasm', 'gushing', 'wet', 'intense_orgasm']` |
| `create-ice-play-variants.ts` | `['ice_play', 'temperature', 'sensory']` | `['ice', 'temperature', 'sensory', 'cold', 'sensation_play']` |
| `create-moaning-scene.ts` | category: `dirty-talk`, tags без `verbal` | category: `verbal`, tags: `['verbal', 'moaning', 'vocal', 'sounds', 'screaming']` |

---

### 3. Отсутствующие поля в create-скриптах

**Проблема:** Скрипты не заполняли `title`, `subtitle`, `intensity`, `ai_context`.

**Исправлено:** Добавлены во все скрипты:

```typescript
title: { ru: '...', en: '...' },
subtitle: { ru: '...', en: '...' },
intensity: N,
ai_context: {
  tests_primary: [...],
  tests_secondary: [...]
}
```

---

### 4. Отсутствующая JSON-спецификация

**Проблема:** Для `finger-sucking` не было JSON-файла.

**Исправлено:** Создан `scenes/v2/composite/oral/finger-sucking.json`

---

## Выполненные действия

### 1. Обновление JSON-спецификаций
```bash
npx tsx scripts/fix-json-categories.ts
# Fixed: 29 files
```

### 2. Запуск create-скриптов для обновления БД

| Скрипт | Результат |
|--------|-----------|
| `create-butt-plug-variants.ts` | 4 сцены созданы, `butt-plug` деактивирован |
| `create-finger-sucking.ts` | 4 сцены созданы |
| `create-squirting-self.ts` | 2 сцены созданы |
| `create-ice-play-variants.ts` | 4 сцены созданы, `ice-play` деактивирован |
| `create-masturbation-variants.ts` | 4 сцены созданы, `mutual-masturbation` деактивирован |
| `create-moaning-scene.ts` | 1 сцена создана |

**Итого:** 19 сцен обновлено/создано в БД

---

## Остающиеся вопросы (не критичные)

1. **90 сцен без JSON-спецификации** — могут быть legacy-сцены или сцены из других источников
2. **Архитектурное расхождение:** JSON-спецификации описывают composite-сцены с elements, а create-скрипты создают flat-структуру с paired scenes. Это design decision, не баг.

---

## Файлы

### Созданные/модифицированные
- `scripts/audit-scene-tags.ts` — скрипт аудита
- `scripts/fix-json-categories.ts` — скрипт исправления категорий
- `scenes/v2/composite/oral/finger-sucking.json` — новая спецификация
- 29 JSON-файлов с исправленными категориями

### Create-скрипты (исправлены)
- `scripts/create-butt-plug-variants.ts`
- `scripts/create-finger-sucking.ts`
- `scripts/create-squirting-self.ts`
- `scripts/create-ice-play-variants.ts`
- `scripts/create-masturbation-variants.ts`
- `scripts/create-moaning-scene.ts`

---

## Как проверить

```bash
# Полный аудит
npx tsx scripts/audit-scene-tags.ts

# Проверить конкретную категорию в БД
# (через Supabase Dashboard или SQL)
SELECT slug, category, tags[1] as primary_tag
FROM scenes
WHERE is_active = true
ORDER BY category, slug;
```
