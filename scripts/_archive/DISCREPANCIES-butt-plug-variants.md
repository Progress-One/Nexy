# Расхождения: butt-plug-variants

## Сравниваемые файлы

| Тип | Файл |
|-----|------|
| Реализация | `scripts/create-butt-plug-variants.ts` |
| JSON-спецификация | `scenes/v2/composite/toys/butt-plug.json` |
| Документация | `docs/paired-scenes.md`, `docs/scenes-architecture.md`, `docs/scene-map.md` |

---

## 1. Теги не совпадают

| Источник | Теги |
|----------|------|
| **JSON (butt-plug.json)** | `["toys", "butt_plug", "anal", "fullness"]` |
| **Реализация (ts)** | `["butt_plug", "anal", "toy"]` |

**Расхождения:**
- Отсутствует тег `toys` (категория) — в реализации `toy` (единственное число)
- Отсутствует тег `fullness` из спецификации

---

## 2. Отсутствующие поля в реализации

JSON-спецификация `butt-plug.json` содержит поля, которые **НЕ** создаются в `create-butt-plug-variants.ts`:

| Поле | В спецификации | В реализации |
|------|----------------|--------------|
| `title` | `{ru: "Анальная пробка", en: "Butt Plug"}` | ❌ Отсутствует |
| `subtitle` | `{ru: "Ощущение наполненности", ...}` | ❌ Отсутствует |
| `ai_description` | Есть | ❌ Отсутствует |
| `intensity` | `3` | ❌ Отсутствует |
| `elements` | 4 элемента с follow-ups | ❌ Отсутствует |
| `question` | multi_select | ❌ Отсутствует |
| `ai_context` | tests_primary/secondary | ❌ Отсутствует |
| `image_prompt` | Детальный prompt | ❌ Только `generation_prompt` |

---

## 3. Различие generation_prompt vs image_prompt

| Источник | Поле | Значение |
|----------|------|----------|
| **JSON** | `image_prompt` | `"woman on all fours on bed, man inserting small butt plug, bedroom with dim lighting, focus on lower back"` |
| **Реализация (she-wears)** | `generation_prompt` | `"naked woman on all fours on bed, small butt plug visible, dim bedroom lighting"` |
| **Реализация (he-wears)** | `generation_prompt` | `"intimate couple, man with small butt plug, woman admiring, dim bedroom lighting"` |

**Проблема:** Промпты отличаются по содержанию и не включают действие "inserting" из оригинала.

---

## 4. Элементы (elements) полностью отсутствуют

JSON-спецификация определяет 4 интерактивных элемента:

```
elements:
├── who_wears (single_select: she/he/both)
├── when (multi_select: during_sex/foreplay/public/date/extended)
├── type (multi_select: basic/jeweled/tail/vibrating/inflatable)
└── appeal (multi_select: fullness/taboo/secret/preparation/control)
```

**В реализации:** Эти элементы НЕ создаются. Вместо этого создаются 4 отдельные сцены по принципу who_wears.

---

## 5. Несоответствие role_direction логике документации

### Документация (paired-scenes.md) говорит:
> Для категории toys: "Ты используешь на ней" (M→F) / "Ты используешь на нём" (F→M)

### Реализация создаёт:

| Slug | role_direction | Описание (ru) |
|------|---------------|---------------|
| `butt-plug-she-wears-give` | `m_to_f` | "Ты носишь анальную пробку — он вставил..." |
| `butt-plug-she-wears-receive` | `m_to_f` | "Она носит анальную пробку — ты вставил..." |
| `butt-plug-he-wears-give` | `f_to_m` | "Ты носишь анальную пробку — она вставила..." |
| `butt-plug-he-wears-receive` | `f_to_m` | "Он носит анальную пробку — ты вставила..." |

**Проблема логики:**
- `she-wears-give` имеет `m_to_f`, но description говорит "ты носишь" (женщина-пользователь)
- По документации `m_to_f` = "мужчина делает женщине", но здесь акцент на том, КТО НОСИТ, а не кто вставляет

---

## 6. Схема именования отличается от примеров в документации

### Документация (scenes-architecture.md, paired-scenes.md):
```
give-hetero-m ↔ receive-hetero-f
give-hetero-f ↔ receive-hetero-m
```

### Реализация использует:
```
butt-plug-she-wears-give ↔ butt-plug-she-wears-receive
butt-plug-he-wears-give ↔ butt-plug-he-wears-receive
```

**Примечание:** Схема `{scene}-{variant}-give/receive` соответствует паттерну из `scene-map.md` (например, `degradation-he-degrades-her-give`), но не документации `paired-scenes.md`.

---

## 7. scene-map.md не обновлён

В `docs/scene-map.md` в секции toys:
```
## toys (8 active)
- butt-plug (mutual)
```

**Ожидается после запуска скрипта:**
```
## toys (12 active)
- butt-plug (mutual) [inactive]
- butt-plug-she-wears-give (m_to_f) ↔ butt-plug-she-wears-receive
- butt-plug-she-wears-receive (m_to_f) ↔ butt-plug-she-wears-give
- butt-plug-he-wears-give (f_to_m) ↔ butt-plug-he-wears-receive
- butt-plug-he-wears-receive (f_to_m) ↔ butt-plug-he-wears-give
```

---

## 8. Противоречие: mutual vs give/receive

| Источник | Подход |
|----------|--------|
| **JSON-спецификация** | Одна сцена `role_direction: mutual` с элементом `who_wears` как follow-up |
| **Реализация** | 4 отдельные сцены с фиксированным `role_direction` |

Это **архитектурное расхождение** — два разных подхода к одному контенту:
1. **v2 подход:** Одна composite-сцена + интерактивные элементы
2. **Реализация:** Flat-структура с несколькими сценами

---

## Рекомендации

1. **Синхронизировать теги:** Использовать `["toys", "butt_plug", "anal", "fullness"]`
2. **Добавить недостающие поля:** title, subtitle, intensity, ai_context
3. **Обновить scene-map.md** после запуска скрипта
4. **Уточнить архитектурное решение:**
   - Если нужны 4 сцены → обновить butt-plug.json или удалить его
   - Если нужна 1 composite сцена → использовать elements вместо создания вариантов
5. **Пересмотреть role_direction:** Текущая логика смешивает "кто носит" и "кто активный участник"
