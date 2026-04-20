# Scenes System

> Полная документация: [`scenes/v2/README.md`](../scenes/v2/README.md)

## ⚠️ ОБЯЗАТЕЛЬНАЯ ВАЛИДАЦИЯ СЦЕН

При создании или редактировании сцен **ОБЯЗАТЕЛЬНО** проверять консистентность:

### 1. Gender Consistency (role_direction ↔ description)

| Поле | Описание | Пример |
|------|----------|--------|
| `role_direction` | **КОМУ показывается карточка** | `m_to_f` = показывается мужчине |
| `user_description` | Текст от лица читающего | "Она делает X твоему телу" |

**Правила role_direction:**
- `m_to_f` = карточка показывается **МУЖЧИНЕ** (он читает описание)
- `f_to_m` = карточка показывается **ЖЕНЩИНЕ** (она читает описание)
- `mutual` = показывается обоим
- `solo` = один участник

**Правила для описаний:**
- Если `m_to_f`: описание для мужчины → "Ты делаешь ей..." или "Она делает тебе..."
- Если `f_to_m`: описание для женщины → "Ты делаешь ему..." или "Он делает тебе..."

**Правила для give/receive пар:**
- `-give` и `-receive` варианты ДОЛЖНЫ иметь **РАЗНЫЕ** role_direction
- Каждый партнёр видит свою версию описания со своей перспективы

**Примеры:**
```
ice-play-she-on-him-give:
  role_direction: m_to_f (показывается мужчине)
  description: "Она проводит кубиком льда по твоему телу"

ice-play-she-on-him-receive:
  role_direction: f_to_m (показывается женщине)
  description: "Ты проводишь кубиком льда по его телу"
```

**Типичные ошибки:**
```
❌ give и receive с ОДИНАКОВЫМ role_direction
   Оба партнёра видят одно описание — НЕВЕРНО!

✓ give: m_to_f, receive: f_to_m
   Каждый видит описание со своей перспективы
```

### 2. Naming Convention (slug ↔ role_direction)

**Современный формат slug:**
| Паттерн | Описание | role_direction |
|---------|----------|----------------|
| `*-he-on-her-give` | Он делает ей, карточка для него | `m_to_f` |
| `*-he-on-her-receive` | Он делает ей, карточка для неё | `f_to_m` |
| `*-she-on-him-give` | Она делает ему, карточка для него | `m_to_f` |
| `*-she-on-him-receive` | Она делает ему, карточка для неё | `f_to_m` |

**Примеры:**
```
blowjob-give:    f_to_m (женщина читает "Ты берёшь его член...")
blowjob-receive: m_to_f (мужчина читает "Она берёт твой член...")

cunnilingus-give:    m_to_f (мужчина читает "Ты лижешь её...")
cunnilingus-receive: f_to_m (женщина читает "Он лижет тебя...")
```

**Устаревший формат (не используется):**
| Суффикс | Аудитория |
|---------|-----------|
| `-hetero-f` | Гетеро-женщина |
| `-hetero-m` | Гетеро-мужчина |

### 3. Validation Script

Запустить перед деплоем:
```bash
npx tsx scripts/validate-prompts.ts
npx tsx scripts/full-scene-audit.ts
```

### 4. Checklist для новой сцены

- [ ] `role_direction` определяет КОМУ показывается карточка (m_to_f = мужчине, f_to_m = женщине)
- [ ] `user_description.ru` написано от лица читающего (м читает "Она/ты...", ж читает "Он/ты...")
- [ ] `user_description.en` соответствует ru версии
- [ ] Для give/receive пар: role_direction РАЗНЫЕ (одна m_to_f, другая f_to_m)
- [ ] `sets_gate` указан для сцен, которые открывают гейты

---

## Быстрый обзор

**~270 активных V3 сцен:**
- **58 main_question** (onboarding — `is_onboarding=true`): quickie, rough-give, power-sub, recording, anal, oral и т.д.
- **211 clarification** (`scene_type='clarification'` + `clarification_for=[...]`): уточняющие сцены для main_question'ов
- **7 body-map** + **3 activity** сцены

Источник: `scenes/v2/scenes-status.json` → 352 total, 211 active, 141 inactive (архив).

## Baseline System

14 baseline сцен задают "ворота" (gates) для фильтрации контента:

```
power-dynamic  → dominant/submissive → unlock bondage/service scenes
pain-tolerance → no/light/yes       → skip/show pain scenes
anal-interest  → no/curious/yes     → skip/show anal scenes
group-interest → no/maybe/yes       → skip/show group scenes
...
```

## Структура сцены (V3)

```json
{
  "id": "scene_uuid",
  "slug": "scene-slug",
  "scene_type": "clarification",
  "clarification_for": ["oral", "rough"],
  "is_onboarding": false,
  "for_gender": null,
  "category": "oral",
  "intensity": 2,
  "tags": ["oral", "deepthroat"],
  "sets_gate": null,
  "role_direction": "m_to_f",
  "paired_scene": "scene-slug-receive",
  "title": { "ru": "...", "en": "..." },
  "user_description": { "ru": "...", "en": "..." },
  "image_prompt": "...",
  "image_url": "https://..."
}
```

Поля по типу сцены:
- `multi_choice_text`: `text_options`, `allow_other`, `other_placeholder`
- `image_selection`: `image_options`
- `paired_text`: `paired_questions`
- `body_map_activity`: `body_map_activity_config`
- `scale_text`: `scale_min`, `scale_max`, `scale_labels`

## Файловая структура

```
scenes/v2/
├── composite/
│   ├── _index.json         # Реестр сцен
│   ├── baseline/           # foundational main_question сцены
│   │   ├── power-dynamic.json
│   │   ├── intensity.json
│   │   └── ...
│   └── {category}/         # 121 detailed scenes
│       └── {scene}.json
├── body-map/               # 6 body map activities
├── activities/             # sounds, clothing
└── README.md               # ПОЛНАЯ ДОКУМЕНТАЦИЯ
```

---

**→ Детали: [scenes/v2/README.md](../scenes/v2/README.md)**
