# Архитектура сцен V3 — Карта и план

## Статистика

| Метрика | Старый набор (26.01) | Новый набор |
|---------|----------------------|-------------|
| Composite сцены | 471 | 355 |
| Активных | 293 | 309 |
| Категории | 36 | 33 |
| Онбординг сцены | 122 (hetero+gay+lesbian) | 58 |

## Что потеряли и почему

### 1. Онбординг (122 сцены) — ОЖИДАЕМО
Старые `onboarding-*-hetero-m/f` и `onboarding-*-gay/lesbian` убраны.
**Причина:** Убрали gay/lesbian, упростили структуру.
**Статус:** Нужно СОЗДАТЬ новые онбординг-сцены.

### 2. Give/Receive суффиксы (~80 сцен) — ПЕРЕИМЕНОВАНО
Старые: `spanking-he-spanks-her-give` + `spanking-he-spanks-her-receive`
Новые: `spanking-he-spanks-her` + `spanking-m-to-f-receive`

**Контент сохранён, изменились имена.**

### 3. lgbtq (2 сцены) — НАМЕРЕННО УДАЛЕНО
`men-loving-men`, `women-loving-women` — удалены вместе с поддержкой gay/lesbian.

## Все ключевые действия покрыты ✓

| Действие | Сцен | Статус |
|----------|------|--------|
| blowjob | 3 | ✓ |
| cunnilingus | 2 | ✓ |
| deepthroat | 2 | ✓ |
| spanking | 4 | ✓ |
| choking | 4 | ✓ |
| bondage | 10 | ✓ |
| degradation | 4 | ✓ |
| praise | 7 | ✓ |
| dirty-talk | 2 | ✓ |
| anal | 8+ | ✓ |
| toys | 10+ | ✓ |
| roleplay | 10+ | ✓ |

---

## ПЛАН: Онбординг

### Старые темы онбординга (29 из categories.json)

Это то, что спрашивалось в онбординге раньше:

| # | Тема | Пара | Что гейтит |
|---|------|------|------------|
| 1 | oral-give | oral-receive | cunnilingus, blowjob, rimming, deepthroat |
| 2 | oral-receive | oral-give | blowjob, cunnilingus, facesitting, cock-worship |
| 3 | anal-give | anal-receive | anal-play, pegging, butt-plug |
| 4 | anal-receive | anal-give | pegging, prostate, double-penetration, figging |
| 5 | group | - | threesome, gangbang, orgy, swinging, cuckold |
| 6 | toys | - | vibrator, dildo, cock-ring, nipple-clamps |
| 7 | roleplay | - | boss, teacher, doctor, stranger, pet-play |
| 8 | quickie | - | quickie, kitchen-counter, angry-sex |
| 9 | romantic | - | romantic-sex, emotional, massage, body-worship |
| 10 | power-dom | power-sub | collar, free-use, objectification, sex-tasks |
| 11 | power-sub | power-dom | collar, chastity, feminization, service |
| 12 | rough-give | rough-receive | spanking, choking, hair-pulling, primal |
| 13 | rough-receive | rough-give | spanking, choking, cnc |
| 14 | public | - | public-sex, locations, kitchen-counter |
| 15 | exhibitionism | - | striptease, glory-hole, voyeurism |
| 16 | recording | - | filming, sexting, joi, video-sex |
| 17 | dirty-talk-give | dirty-talk-receive | dirty-talk, degradation |
| 18 | dirty-talk-receive | dirty-talk-give | dirty-talk, degradation |
| 19 | praise-give | praise-receive | praise scenes |
| 20 | praise-receive | praise-give | praise scenes |
| 21 | lingerie | - | lingerie, stockings, heels, harness, latex |
| 22 | foot-give | foot-receive | foot-worship |
| 23 | foot-receive | foot-give | foot-worship |
| 24 | bondage-give | bondage-receive | bondage, rope, shibari |
| 25 | bondage-receive | bondage-give | bondage, rope, mummification |
| 26 | body-fluids-give | body-fluids-receive | cum, squirting, golden-shower, spitting |
| 27 | body-fluids-receive | body-fluids-give | cum, squirting, golden-shower, spitting |
| 28 | sexting | - | sexting, joi |
| 29 | extreme | - | breath-play, knife-play, needle-play, fisting |

### Новые baseline сцены (кандидаты для онбординга)

В `composite/baseline/` есть 24 сцены (все `is_active: false`):

```
anal-interest          → gates: anal
body-fetishes          → gates: body_fluids, foot
clothing-preference    → gates: lingerie
dirty-talk-interest    → gates: dirty_talk
exhibitionism          → gates: exhibitionism
fantasy-reality        → gates: roleplay?
group-interest         → gates: group
intensity              → gates: rough
openness               → gates: romantic
oral-preference        → gates: oral
pain-tolerance         → gates: rough, extreme
power-dynamic          → gates: power_dom, power_sub
praise-interest        → gates: praise
roleplay-interest      → gates: roleplay
toys-interest          → gates: toys
verbal-preference      → gates: dirty_talk
voyeurism              → gates: exhibitionism
watching-showing       → gates: exhibitionism
```

### Рекомендация: Объединить

**Базовые вопросы онбординга (10-15 штук):**

1. **oral** → `oral-preference` + парная
2. **anal** → `anal-interest` + парная
3. **rough** → `intensity` + парная (give/receive)
4. **power** → `power-dynamic` + парная (dom/sub)
5. **bondage** → использовать `power-dynamic` как гейт
6. **dirty-talk** → `dirty-talk-interest` + парная
7. **praise** → `praise-interest` + парная
8. **toys** → `toys-interest`
9. **roleplay** → `roleplay-interest`
10. **group** → `group-interest`
11. **exhibitionism** → `exhibitionism` + `voyeurism`
12. **lingerie** → `clothing-preference`
13. **body-fluids** → `body-fetishes`
14. **public** → использовать `exhibitionism` как гейт
15. **extreme** → `intensity` + `pain-tolerance`

---

## ПЛАН: Gates

### Текущая система gates

```typescript
// user_gates.gates — JSONB boolean
{
  "oral": true,
  "anal": true,
  "rough": true,
  "power_dynamic": true,
  "toys": true,
  "group": true,
  "exhibitionism": true,
  // ...
}
```

### Маппинг: Baseline сцена → Gate

| Baseline сцена | Устанавливает gate |
|----------------|-------------------|
| oral-preference | oral |
| anal-interest | anal |
| intensity | rough |
| power-dynamic | power_dynamic |
| power-dynamic-m | power_dynamic |
| power-dynamic-f | power_dynamic |
| toys-interest | toys |
| group-interest | group |
| exhibitionism | exhibitionism |
| voyeurism | voyeurism |
| dirty-talk-interest | dirty_talk |
| praise-interest | praise |
| roleplay-interest | roleplay |
| pain-tolerance | rough, extreme |
| body-fetishes | body_fluids |
| clothing-preference | lingerie |

### Маппинг: Gate → какие сцены показывать

```typescript
const SCENE_GATES: Record<string, { gates: string[], operator: 'AND' | 'OR' }> = {
  // Anal scenes
  'anal-play-on-her': { gates: ['anal'], operator: 'OR' },
  'pegging': { gates: ['anal', 'toys'], operator: 'AND' },
  'figging': { gates: ['anal', 'extreme'], operator: 'AND' },

  // Oral scenes
  'blowjob': { gates: ['oral'], operator: 'OR' },
  'deepthroat': { gates: ['oral'], operator: 'OR' },
  'facesitting-f-on-m': { gates: ['oral', 'power_dynamic'], operator: 'OR' },

  // Rough scenes
  'spanking-he-spanks-her': { gates: ['rough'], operator: 'OR' },
  'choking-he-chokes-her': { gates: ['rough'], operator: 'OR' },
  'cnc-he-takes-her': { gates: ['rough', 'power_dynamic'], operator: 'AND' },

  // Power scenes
  'collar-he-owns-her': { gates: ['power_dynamic'], operator: 'OR' },
  'free-use-f-available': { gates: ['power_dynamic'], operator: 'OR' },

  // Extreme scenes
  'breath-play-m-to-f': { gates: ['rough', 'extreme'], operator: 'AND' },
  'knife-play-m-to-f': { gates: ['extreme', 'power_dynamic'], operator: 'AND' },
  'fisting-m-to-f': { gates: ['anal', 'extreme'], operator: 'AND' },

  // ...
};
```

---

## ПЛАН: clarification_for

### Принцип: Контекстное продолжение

**НЕ по папке!** Сцена A уточняет сцену B, если:
- После YES на B логично спросить про A
- A — это детали/варианты B

### Примеры правильных clarification_for

| Сцена | clarification_for | Почему |
|-------|-------------------|--------|
| butt-plug | ["toys-interest", "anal-interest"] | Игрушка + анал |
| deepthroat | ["blowjob"] | Деталь минета |
| cnc-he-takes-her | ["intensity", "power-dynamic"] | Жёстко + власть |
| spanking-he-spanks-her | ["intensity"] | Деталь жёсткого |
| feminization | ["power-dynamic"] | Деталь подчинения |
| threesome-fmf | ["group-interest"] | Деталь группы |
| shibari | ["bondage-he-ties-her", "power-dynamic"] | Тип бондажа |

### Примеры НЕПРАВИЛЬНЫХ clarification_for

| Сцена | Неправильно | Правильно |
|-------|-------------|-----------|
| spanking | ["rough"] ← gate name | ["intensity"] ← scene slug |
| cnc | ["power_dynamic"] ← underscore | ["power-dynamic"] ← hyphen |
| все в папке toys | ["toys-interest"] | Зависит от контекста! |

---

## Категории composite (33)

```
age-play (4)        → roleplay-interest
anal (10)           → anal-interest
baseline (24)       → ИСТОЧНИК для gates
body-fluids (16)    → body-fetishes
bondage-types (6)   → power-dynamic
chastity (4)        → power-dynamic, toys-interest
clothing (16)       → clothing-preference
cnc-rough (10)      → intensity, power-dynamic
control-power (28)  → power-dynamic
cuckold (4)         → group-interest
emotional-context (5) → openness
exhibitionism (14)  → exhibitionism
extreme (34)        → intensity, pain-tolerance
filming (1)         → exhibitionism
furniture (1)       → toys-interest
group (8)           → group-interest
impact-pain (26)    → intensity
intimacy-outside (7) → exhibitionism, openness
lingerie-styles (5) → clothing-preference
locations (6)       → exhibitionism
manual (6)          → oral-preference
massage (4)         → openness
oral (22)           → oral-preference
pet-play (4)        → roleplay-interest, power-dynamic
positions (8)       → (нет гейта, всем)
roleplay (14)       → roleplay-interest
romantic (3)        → openness
sensory (5)         → intensity
solo-mutual (2)     → exhibitionism
symmetric (2)       → (нет гейта, всем)
toys (11)           → toys-interest
verbal (26)         → dirty-talk-interest, praise-interest
worship-service (14) → body-fetishes, power-dynamic
```

---

## TODO

### Фаза 1: Активировать baseline для онбординга
1. [ ] Выбрать 12-15 baseline сцен для онбординга
2. [ ] Установить `is_active: true`, `is_onboarding: true`
3. [ ] Добавить `onboarding_order`
4. [ ] Создать парные сцены где нужно (give/receive)

### Фаза 2: Настроить gates
1. [ ] Обновить `onboarding-gates.ts` с маппингом baseline → gate
2. [ ] Проверить `SCENE_GATES` для всех composite сцен
3. [ ] Добавить недостающие записи

### Фаза 3: Исправить clarification_for
1. [ ] Пройти по всем 309 активным сценам
2. [ ] Проставить правильные clarification_for по контексту
3. [ ] Валидировать скриптом

### Фаза 4: Тестирование
1. [ ] Пройти онбординг
2. [ ] Проверить что gates работают
3. [ ] Проверить что clarifications показываются в правильном порядке
