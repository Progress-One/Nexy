# Как работают сцены — гайд для стажёра

## Что такое сцена?

Сцена — это карточка с утверждением. Пользователь видит картинку и свайпает:
- **Вправо** = Да, мне это нравится
- **Влево** = Нет, не моё
- **Вверх** = Очень хочу, это важно для меня
- **Вниз** = Может быть, если партнёр попросит

## Файл сцены — это JSON

Каждая сцена лежит в отдельном `.json` файле. Вот минимальный пример:

```json
{
  "slug": "spanking-m-to-f",
  "is_active": true,
  "for_gender": "male",
  "title": { "ru": "Шлепки", "en": "Spanking" },
  "user_description": { "ru": "Ты шлёпаешь её.", "en": "You spank her." },
  "image_prompt": "man spanking woman over his knee, bedroom",
  "question": {
    "type": "swipe",
    "text": { "ru": "Шлёпать её", "en": "Spank her" }
  }
}
```

---

## Главные поля

### `slug`
Уникальный ID сцены. Латиница, через дефис. Примеры:
- `spanking-m-to-f` — он шлёпает её
- `spanking-f-to-m` — она шлёпает его
- `praise-words-she-likes` — какие слова похвалы ей нравятся

### `is_active`
- `true` — сцена работает, показывается пользователям
- `false` — сцена отключена (удалять не надо, просто выключи)

### `for_gender`
Кому показывать эту сцену:
- `"male"` — только мужчинам
- `"female"` — только женщинам
- `null` — всем (mutual сцены)

### `title`
Название сцены. Короткое, 1-3 слова.

### `user_description`
Описание для пользователя. **Это важно!** Пишется от второго лица:
- Для мужчины: "Ты шлёпаешь её по попе"
- Для женщины: "Он шлёпает тебя по попе"
- Для mutual: "Шлепки по попе во время секса"

**НЕЛЬЗЯ:**
- ❌ Писать "или" — свайп не поддерживает выбор. Хорошо: две отдельные сцены
- ❌ Писать "тебе нравится..." — это констатация, не описание ситуации
- ❌ Писать "хочешь ли ты..." — это вопрос, не описание

**Плохо:** "Тебе нравится грязно разговаривать во время секса"
**Хорошо:** "Шёпот на ухо. Грубые слова. Описания того, что ты делаешь."

### `image_prompt`
Промпт для генерации картинки. Пиши на английском, описывай сцену визуально.

### `question.text`
Текст для карточки. Короткий, как заголовок.

**Для свайпа — утверждение (без вопроса):** "Шлёпать её" — хорошо.
**Для multi_select — вопрос:** "Какие слова тебе нравятся?" — хорошо.

Плохо: "Хотел бы ты иногда шлёпать свою партнёршу по попе во время секса?" — слишком длинно.

---

## Парные сцены (paired_scene)

Многие действия имеют две стороны: кто делает и кто получает.

### Простой случай: 2 сцены

Одно действие, две перспективы.

**Пример: шлепки (он шлёпает её)**
```
spanking-m-to-f         (М видит: "Ты шлёпаешь её")
spanking-m-to-f-receive (Ж видит: "Он шлёпает тебя")
```

```json
// В spanking-m-to-f.json:
{
  "slug": "spanking-m-to-f",
  "for_gender": "male",
  "paired_scene": "spanking-m-to-f-receive",
  "image_prompt": "man spanking woman..."  // ОДИНАКОВЫЙ!
}

// В spanking-m-to-f-receive.json:
{
  "slug": "spanking-m-to-f-receive",
  "for_gender": "female",
  "paired_scene": "spanking-m-to-f",
  "image_prompt": "man spanking woman..."  // ОДИНАКОВЫЙ!
}
```

### Полный случай: 4 сцены

Когда ЛЮБОЙ может быть в ЛЮБОЙ роли — нужно 4 сцены.

**Пример: босс и подчинённый**

```
Ситуация 1: ОН — босс, ОНА — подчинённая
├── boss-m-subordinate-f          (М видит: "Ты — босс")
└── boss-m-subordinate-f-receive  (Ж видит: "Он — босс, ты подчиняешься")

Ситуация 2: ОНА — босс, ОН — подчинённый
├── boss-f-subordinate-m          (Ж видит: "Ты — босс")
└── boss-f-subordinate-m-receive  (М видит: "Она — босс, ты подчиняешься")
```

**Правило:** Если роли могут меняться — создай ВСЕ 4 сцены. Иначе кто-то не увидит нужный вариант.


---

## Связи между сценами: Gates и Clarifications

### Полная схема полей

```json
{
  "slug": "spanking-m-to-f",

  // CLARIFICATION — когда показать (после какой сцены)
  "scene_type": "clarification",
  "clarification_for": ["rough-give", "pain-tolerance"],     // SLUGS сцен (НЕ gate names!)

  // GATES — можно ли показать (в коде, не в JSON)
  // Проверяется в src/lib/onboarding-gates.ts:
  // 'spanking-m-to-f': { gates: ['rough'], operator: 'OR' }

  // PAIRED — связь с receive-версией
  "paired_scene": "spanking-m-to-f-receive",

  // FOR_GENDER — кто видит
  "for_gender": "male"
}
```

### Gates — фильтр видимости

**Gates** — булевые флаги в `user_gates.gates`. Определяют **можно ли вообще показать сцену**.

Если юзеру не интересен анал → gate `anal: false` → все сцены требующие `anal` не показываются.

```
scene_responses (ответ YES/VERY на сцену с sets_gate)
      ↓
[триггер: compute_gates_from_scene_responses]
      ↓
user_gates.gates = { "anal": true, "oral": true, ... }
```

### sets_gate — сцена ОТКРЫВАЕТ gate

Сцена с `sets_gate` **открывает** gate при ответе YES/VERY.

```json
{
  "slug": "onboarding-anal-give-m",
  "sets_gate": "anal"  // ← при YES устанавливает anal: true
}
```

### SCENE_GATES — требования для показа (в коде)

Файл: `src/lib/onboarding-gates.ts`

```typescript
// Сцена butt-plug требует anal ИЛИ toys gate
'butt-plug': { gates: ['anal', 'toys'], operator: 'OR' }

// nipple-clamps требует toys И rough
'nipple-clamps': { gates: ['toys', 'rough'], operator: 'AND' }
```

**Если gate закрыт → сцена НЕ показывается вообще.**

---

### clarification_for — уточняющие сцены

**Clarification** — сцена, которая **по контексту продолжает** конкретную другую сцену.

`clarification_for` содержит **slug-и сцен** (не gate names!), после которых показать уточнение.

#### ⚠️ ВАЖНО: clarification — это НЕ категория!

**Неправильно:** "все сцены из папки `toys/` уточняют какую-то одну сцену"

**Правильно:** clarification определяется по **смысловой связи**:

```
vibrator-play: "Вибратор на ней"
    ↓ clarification (по контексту)
remote-control: "Вибратор с пультом"  — логичное продолжение

anal-play-on-her: "Ласкать её анус"
    ↓ clarification (по контексту)
butt-plug: "Анальная пробка"  — логичное продолжение
anal-hook: "Анальный крюк"    — логичное продолжение
```

**Одна сцена может уточнять несколько РАЗНЫХ родительских сцен!**

#### Пример: butt-plug

```json
{
  "slug": "butt-plug",
  "clarification_for": ["vibrator-play", "anal-play-on-her"]
  // Показать после YES на vibrator-play ИЛИ anal-play-on-her
}
```

#### Пример: deepthroat

```json
{
  "slug": "deepthroat",
  "clarification_for": ["blowjob"]
  // После YES на blowjob — логично спросить про deepthroat
}
```

**Логика:**
1. Юзер отвечает YES на сцену `blowjob`
2. Ответ сохраняется в `scene_responses`
3. Система ищет сцены где `clarification_for.includes("blowjob")`
4. `deepthroat`, `facefuck` и т.п. выпадают как уточнения

**Важно:** Одна сцена может быть clarification для нескольких сцен. Покажется после первой, на которую юзер ответил YES.

#### Как определить правильный clarification_for

Задай вопрос: **"После какой КОНКРЕТНОЙ сцены логично показать эту?"**

| Сцена | После чего показать? | clarification_for |
|-------|---------------------|-------------------|
| `deepthroat` | После минета | `["blowjob"]` |
| `butt-plug` | После анальных ласк или вибратора | `["anal-play-on-her", "vibrator-play"]` |
| `collar-he-owns-her` | После бондажа | `["bondage-he-ties-her"]` |
| `cnc-m-takes-f` | После шлепков или бондажа | `["spanking-he-spanks-her", "bondage-he-ties-her"]` |
| `pegging` | После анала на нём или бондажа | `["anal-play-on-him", "bondage-she-ties-him"]` |

**НЕ правильно:**
- ❌ `clarification_for: ["anal"]` — это gate name, не slug сцены!
- ❌ `clarification_for: ["power-dynamic"]` — deprecated baseline slug!
- ❌ Ставить абстрактные понятия вместо конкретных сцен

**Правильно:**
- ✅ `clarification_for: ["blowjob"]` — slug конкретной существующей сцены
- ✅ `clarification_for: ["bondage-he-ties-her", "spanking-he-spanks-her"]` — несколько сцен
- ✅ Смотреть на контекст — после какой сцены это имеет смысл

---

### Gates и clarification_for — ДВЕ НЕЗАВИСИМЫЕ СИСТЕМЫ

**Gates** (фильтр видимости):
- Проверяет МОЖНО ли показать сцену вообще
- Работает через `user_gates.gates`
- Если gate закрыт → сцена не показывается

**clarification_for** (sequencing):
- Определяет КОГДА показать сцену (после какой)
- Содержит slug-и конкретных сцен
- Связь сцена→сцена, не через gates

Эти системы работают параллельно:
1. Gates отфильтровывает недоступные сцены
2. clarification_for определяет порядок показа оставшихся

---

## Типы вопросов (question.type)

### swipe (по умолчанию)
Картинка + свайп в 4 стороны. Текст — утверждение, не вопрос.
```json
{
  "question": {
    "type": "swipe",
    "text": { "ru": "Шлёпать её", "en": "Spank her" }
  }
}
```

### multi_select
Выбор нескольких вариантов. Текст — вопрос. Обязательны `options`.
```json
{
  "question": {
    "type": "multi_select",
    "text": { "ru": "Какие слова тебе нравятся?", "en": "What words do you like?" },
    "options": [
      { "id": "good_girl", "label": { "ru": "Хорошая девочка", "en": "Good girl" } },
      { "id": "clever", "label": { "ru": "Умница", "en": "Clever girl" } }
    ],
    "allow_other": true,
    "min_selections": 0
  }
}
```

### scale
Шкала (например интенсивность).
```json
{
  "question": {
    "type": "scale",
    "text": { "ru": "Насколько грубо?", "en": "How rough?" }
  }
}
```
Без картинки. Пользователь выбирает несколько вариантов.

---

## Onboarding сцены

Первые сцены, которые видит юзер. Определяют базовые предпочтения и открывают гейты.

```json
{
  "slug": "spanking-he-spanks-her",
  "is_onboarding": true,
  "onboarding_order": 5,
  "for_gender": "male",
  "paired_scene": "spanking-m-to-f-receive",
  "sets_gate": "rough"
}
```

**Особенности онбординга:**
| Поле | Описание |
|------|----------|
| `is_onboarding` | `true` — показывается в онбординге |
| `onboarding_order` | Порядок показа (1, 2, 3...) |
| `paired_scene` | Парная онбординг-сцена (М↔Ж) |
| `sets_gate` | Какой gate открывается при YES |

> ⚠️ **Baseline сцены deprecated** — они дублировали онбординг и деактивированы.

---

## Чеклист перед созданием сцены

1. **Slug уникальный?** Проверь что такого нет
2. **for_gender правильный?** male/female/null
3. **Есть парная сцена?** Если да — создай обе, с одинаковым image_prompt
4. **user_description от 2-го лица?** "Ты делаешь" / "Тебе делают"
5. **Нет "или" в описании?** Если есть выбор — это две разные сцены
6. **question.text короткий?** Максимум 5-7 слов
7. **Для свайпа — утверждение?** Без вопросительного знака!
8. **Для multi_select — вопрос?** Со знаком вопроса
9. **clarification_for указан?** Если это уточнение — укажи slug родительской сцены
10. **is_active: true?** Иначе не покажется

---

## Примеры правильных сцен

### Простая сцена (mutual)
```json
{
  "slug": "blindfold",
  "is_active": true,
  "for_gender": null,
  "scene_type": "clarification",
  "clarification_for": ["sensory-play", "bondage-interest"],  // SLUGS родительских сцен, НЕ gate names!
  "title": { "ru": "Повязка на глаза", "en": "Blindfold" },
  "user_description": { "ru": "Повязка на глаза во время секса.", "en": "Blindfold during sex." },
  "image_prompt": "woman wearing silk blindfold, man touching her face gently, bedroom",
  "question": {
    "type": "swipe",
    "text": { "ru": "Повязка на глаза", "en": "Blindfold" }  // Утверждение, не вопрос!
  }
}
```

### Парные сцены (он делает / она получает)
```json
// choking-m-to-f.json
{
  "slug": "choking-m-to-f",
  "for_gender": "male",
  "paired_scene": "choking-m-to-f-receive",
  "user_description": { "ru": "Ты сжимаешь её горло рукой.", "en": "You wrap your hand around her throat." },
  "image_prompt": "man's hand on woman's throat, she looks up at him, bedroom",
  ...
}

// choking-m-to-f-receive.json
{
  "slug": "choking-m-to-f-receive",
  "for_gender": "female",
  "paired_scene": "choking-m-to-f",
  "user_description": { "ru": "Он сжимает твоё горло рукой.", "en": "He wraps his hand around your throat." },
  "image_prompt": "man's hand on woman's throat, she looks up at him, bedroom",  // ОДИНАКОВЫЙ!
  ...
}
```

### Сцена выбора слов
```json
{
  "slug": "dirty-words-she-likes",
  "for_gender": "female",
  "scene_type": "clarification",
  "clarification_for": ["dirty-talk-interest", "degradation-f-to-m"],  // SLUGS сцен (НЕ gate names!)
  "question": {
    "type": "multi_select",
    "text": { "ru": "Какие слова тебя заводят?", "en": "What words turn you on?" },  // Вопрос OK для multi_select
    "options": [
      { "id": "slut", "label": { "ru": "Шлюха", "en": "Slut" } },
      { "id": "whore", "label": { "ru": "Блядь", "en": "Whore" } },
      { "id": "good_girl", "label": { "ru": "Хорошая девочка", "en": "Good girl" } }
    ],
    "allow_other": true,
    "min_selections": 0
  }
}
```

---

## Частые ошибки

### "или" в описании
**Плохо:** "Тебе нравится доминировать или подчиняться"
**Хорошо:** Две сцены — `power-dynamic-m` и `power-dynamic-f`

### Разный image_prompt в парных сценах
**Плохо:** Разные промпты для m-to-f и m-to-f-receive
**Хорошо:** Один и тот же промпт, одна картинка

### Длинный question.text
**Плохо:** "Хотел бы ты чтобы она иногда..."
**Хорошо:** "Она сверху" (для свайпа — утверждение)

### Вопрос в свайпе
**Плохо:** `"text": "Шлёпать её?"` — вопрос со знаком
**Хорошо:** `"text": "Шлёпать её"` — утверждение

### Забыл clarification_for
**Плохо:** Сцена про шлепки без `clarification_for`
**Хорошо:** `clarification_for: ["rough-give", "pain-tolerance"]` — SLUGS сцен, не gate names!

### question.type: "multi_select" без options
**Плохо:** Указал multi_select но не дал варианты
**Хорошо:** Либо добавь options, либо используй "swipe"

---

## Структура папок

```
scenes/v2/composite/
├── anal/              # Анальные практики
├── oral/              # Оральные практики
├── bondage-types/     # Виды бондажа
├── control-power/     # Власть и контроль
├── cnc-rough/         # Грубый секс, CNC
├── verbal/            # Слова, похвала, унижение
├── toys/              # Игрушки
├── roleplay/          # Ролевые игры
├── exhibitionism/     # Эксгибиционизм
├── body-fluids/       # Жидкости тела
├── impact-pain/       # Удары, боль
├── worship-service/   # Поклонение
├── positions/         # Позы
├── locations/         # Места
├── romantic/          # Романтика
├── group/             # Групповой секс
├── clothing/          # Одежда
├── lingerie-styles/   # Стили белья
├── sensory/           # Сенсорные практики
└── extreme/           # Экстремальные практики
```

---

---

## Онбординг

### Принцип: Конкретные сцены, НЕ абстрактные вопросы

**НЕПРАВИЛЬНО:**
```
"Анал интересно?" → абстрактный вопрос
"Оральный секс?" → абстрактный вопрос
```

**ПРАВИЛЬНО:**
```
"Ласкать её анус пальцем или игрушкой" → конкретная сцена
"Она берёт у тебя в рот" → конкретная сцена
```

### Как выбрать сцены для онбординга

Берём **типичные/стандартные сцены** из каждой категории:

| Gate | Сцены (M видит / F видит) | sets_gate | order |
|------|---------------------------|-----------|-------|
| oral | blowjob-receive / blowjob | oral | 1 |
| oral | cunnilingus / cunnilingus-receive | oral | 2 |
| anal | anal-play-on-her / anal-play-on-her-receive | anal | 3 |
| anal | anal-play-on-him-receive / anal-play-on-him | anal | 4 |
| rough | spanking-he-spanks-her / spanking-m-to-f-receive | rough | 5 |
| rough | spanking-f-to-m-receive / spanking-she-spanks-him | rough | 6 |
| bondage | bondage-he-ties-her / bondage-he-ties-her-receive | bondage | 7 |
| bondage | bondage-she-ties-him-receive / bondage-she-ties-him | bondage | 8 |
| roleplay | stranger-roleplay | roleplay | 9 |
| roleplay | boss-m-secretary-f / boss-m-secretary-f-receive | roleplay | 10 |
| toys | vibrator-play | toys | 11 |
| toys | cock-ring | toys | 12 |
| group | threesome-fmf / threesome-mfm | group | 13-14 |
| dirty_talk | dirty-talk | dirty_talk | 15 |
| praise | praise-he-praises-her / praise-m-to-f-receive | praise | 16 |
| praise | praise-f-to-m-receive / praise-she-praises-him | praise | 17 |
| exhibitionism | public-sex | exhibitionism | 18 |
| recording | filming | recording | 19 |
| lingerie | lingerie-lace | lingerie | 20 |

### Поле is_onboarding

```json
{
  "slug": "blowjob",
  "is_onboarding": true,   // ← показывать в онбординге
  "onboarding_order": 1,   // ← порядок показа
  "sets_gate": "oral",     // ← открывает gate при YES/VERY
  "for_gender": "female",  // ← кто видит
  "paired_scene": "blowjob-receive"  // ← парная сцена
}
```

Онбординг — это обычные сцены с флагом `is_onboarding: true` и `sets_gate` для открытия гейтов.

### ❌ НЕ используем абстрактные вопросы

Папка `baseline/` с вопросами типа "anal-interest", "oral-preference" — **DEPRECATED**.

Вместо "Интересно ли тебе X?" спрашиваем про конкретную ситуацию X.

---

## Если что-то непонятно

1. Открой похожую существующую сцену
2. Скопируй структуру
3. Поменяй содержимое
4. Проверь по чеклисту выше
