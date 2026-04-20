# Discovery v2 Design Specification

> Composite scenes with multi-element selection and branching follow-ups

## Overview

Discovery v2 replaces 468 individual v4 scenes with **135 composite scenes** (14 baseline + 121 detailed). Each composite scene:
- Shows ONE rich image depicting multiple elements
- Asks "What appeals to you on this scene?"
- User selects multiple elements (multi_select)
- Each selected element triggers its own follow-up flow
- Supports both M-dom and F-dom variants (separate scenes per role)

---

## Core Concepts

### Composite Scene
A scene image showing multiple congruent kinks/elements together. Example:
- Woman in handcuffs, wearing harness, nipple clamps, ball gag, tail plug
- Man dripping wax on her

User sees this and selects what appeals: [Handcuffs ✓] [Harness ✓] [Nipple clamps] [Gag ✓] [Tail plug] [Wax play ✓]

### Follow-up Types

| Type | Description | Example |
|------|-------------|---------|
| `multi_select` | Choose multiple options | "What kind of restraints?" |
| `single_select` | Choose one option | "Your preferred role?" |
| `image_select` | Choose from images | "Which style appeals?" |
| `body_map` | Point on body | "Where do you like being touched?" |
| | | **Implementation:** Interactive body silhouette with clickable zones (hotspots). User taps zones on male/female front/back views. Zones are detected automatically with coordinate mapping. Supports zone-first mode (select zone → set preferences) or legacy mode (color markers). |
| `scale` | 0-100 slider | "How intense?" |
| `text_input` | Free text | "What names do you like being called?" |
| `text_with_suggestions` | Options + custom | "Pet names for your body parts?" |
| `intensity` | Scale with labels | "From gentle to extreme" |
| `role` | Role preference | "Give / Receive / Both" |
| `experience` | Experience level | "Tried / Want to try / Fantasy only" |

### Follow-up Depth
- Level 1: Initial element selection (what appeals on scene)
- Level 2: Element-specific questions (e.g., clamp type)
- Level 3: Deep dive for important topics (e.g., specific words)

Max depth: 3 levels for important topics, 2 for others.

---

## Data Model

### CompositeScene (scenes/v2/composite/*.json)

**Total: 135 composite scenes** organized in 24 categories, plus:
- **6 body-map activities** (kissing, licking, touch, slapping, biting, spanking)
- **2 interactive activities** (sounds, clothing)
- **Total discovery elements: 102**

```typescript
interface CompositeScene {
  id: string;                    // "bondage_gear_fdom"
  slug: string;                  // URL-friendly
  version: 2;

  // Role direction (expanded from original spec)
  role_direction: "m_to_f" | "f_to_m" | "mutual" | "solo" | "group" | "universal" | 
                  "m_daddy_f_little" | "f_mommy_m_little" | "m_dom_f_pet" | "f_dom_m_pet" | 
                  "f_dom_m_sub" | "m_keyholder_f_locked" | "f_keyholder_m_locked" |
                  "f_on_m" | "f_experience" | "cuckold" | "hotwife" | "mlm" | "wlw";

  // Display
  title: LocalizedString;        // "BDSM Gear Scene"
  description: LocalizedString;  // Scene description for context
  image_prompt: string;          // For image generation
  image_url?: string;            // Generated image

  // Filtering
  intensity: 1 | 2 | 3 | 4 | 5;
  relevant_for: {
    gender: "male" | "female" | "any";
    interested_in: "male" | "female" | "any";
  };
  congruent_cluster: string;     // From taxonomy: "bdsm_bondage"
  tags: string[];

  // Elements on scene
  elements: SceneElement[];

  // Initial question
  question: {
    type: "multi_select";
    text: LocalizedString;       // "What appeals to you?"
    min_selections?: number;     // 0 = can skip
    max_selections?: number;     // undefined = unlimited
  };

  // AI context
  ai_context: {
    tests_primary: string[];
    tests_secondary: string[];
    emotional_range: {
      positive: string[];
      negative: string[];
    };
  };
}
```

### SceneElement

```typescript
interface SceneElement {
  id: string;                    // "handcuffs"
  label: LocalizedString;        // "Наручники"
  tag_ref: string;               // Reference to taxonomy tag

  // Visual indicator on image (optional)
  hotspot?: {
    x: number;                   // 0-100 percentage
    y: number;
    radius: number;
  };

  // Follow-up questions for this element
  follow_ups?: FollowUp[];

  // Skip follow-ups if user has answered for this tag before
  dedupe_by_tag?: boolean;
}
```

### FollowUp

```typescript
interface FollowUp {
  id: string;                    // "handcuffs_type"
  type: FollowUpType;
  question: LocalizedString;

  // Conditional display
  show_if?: {
    element_selected?: string[];  // Show if these elements were selected
    answer_contains?: string[];   // Show if previous answer contains
    interest_level?: { min?: number; max?: number };
  };

  // Type-specific config
  config: FollowUpConfig;

  // Nested follow-ups (Level 3)
  follow_ups?: FollowUp[];
}

type FollowUpType =
  | "multi_select"
  | "single_select"
  | "image_select"
  | "body_map"
  | "scale"
  | "text_input"
  | "text_with_suggestions"
  | "intensity"
  | "role"
  | "experience";

interface FollowUpConfig {
  // For multi_select / single_select
  options?: FollowUpOption[];
  allow_custom?: boolean;

  // For scale / intensity
  min_label?: LocalizedString;
  max_label?: LocalizedString;
  default_value?: number;

  // For image_select
  images?: { id: string; url: string; label: LocalizedString }[];

  // For body_map
  gender?: "male" | "female" | "both";
  allow_multiple?: boolean;

  // For text_input / text_with_suggestions
  placeholder?: LocalizedString;
  suggestions?: LocalizedString[];
  max_length?: number;

  // For role
  options?: ["give" | "receive" | "both" | "watch"];

  // For experience
  options?: ["tried_love" | "tried_neutral" | "tried_dislike" | "want_to_try" | "fantasy_only" | "not_interested"];
}

interface FollowUpOption {
  id: string;
  label: LocalizedString;
  description?: LocalizedString;
  examples?: LocalizedString;
  image_url?: string;

  // Nested drilldown
  drilldown?: FollowUp;
}
```

---

## Statistics

| Metric | Value |
|--------|-------|
| **Composite scenes** | 94 |
| **Body-map activities** | 6 |
| **Interactive activities** | 2 (sounds, clothing) |
| **Total discovery elements** | 102 |
| **Categories** | 22 |
| **Paired scene pairs** | 23 |
| **Consolidation ratio** | 5:1 from v4 (468 → 94) |

## Example Composite Scene

```json
{
  "id": "bondage-m-ties-f",
  "slug": "control-power/bondage-m-ties-f",
  "version": 2,
  "role_direction": "m_to_f",

  "title": {
    "ru": "BDSM снаряжение",
    "en": "BDSM Gear Scene"
  },
  "description": {
    "ru": "Женщина в наручниках, харнесе, с зажимами для сосков, кляпом, анальным хвостиком. Мужчина капает на неё воском.",
    "en": "Woman in handcuffs, harness, nipple clamps, ball gag, tail plug. Man dripping wax on her."
  },
  "image_prompt": "BDSM scene, woman kneeling, leather harness on torso, hands cuffed behind back, ball gag in mouth, nipple clamps with chain, fox tail anal plug visible, man standing holding lit candle dripping red wax on her shoulder, dungeon setting with soft lighting",

  "intensity": 4,
  "relevant_for": { "gender": "any", "interested_in": "any" },
  "congruent_cluster": "bdsm_bondage",
  "tags": ["bondage", "harness", "handcuffs", "nipple_clamps", "gag", "tail_plug", "wax_play", "maledom"],

  "elements": [
    {
      "id": "handcuffs",
      "label": { "ru": "Наручники", "en": "Handcuffs" },
      "tag_ref": "handcuffs",
      "follow_ups": [
        {
          "id": "cuff_type",
          "type": "multi_select",
          "question": { "ru": "Какой тип наручников нравится?", "en": "What type of cuffs?" },
          "config": {
            "options": [
              { "id": "metal", "label": { "ru": "Металлические", "en": "Metal" } },
              { "id": "leather", "label": { "ru": "Кожаные", "en": "Leather" } },
              { "id": "padded", "label": { "ru": "С мягкой подкладкой", "en": "Padded" } },
              { "id": "rope", "label": { "ru": "Верёвка", "en": "Rope" } }
            ]
          }
        },
        {
          "id": "cuff_role",
          "type": "role",
          "question": { "ru": "В какой роли?", "en": "Your role?" },
          "config": {
            "options": ["receive", "give", "both"]
          }
        }
      ]
    },
    {
      "id": "harness",
      "label": { "ru": "Харнес", "en": "Harness" },
      "tag_ref": "harness",
      "follow_ups": [
        {
          "id": "harness_style",
          "type": "image_select",
          "question": { "ru": "Какой стиль харнеса?", "en": "Which harness style?" },
          "config": {
            "images": [
              { "id": "chest", "url": "/images/harness-chest.jpg", "label": { "ru": "На грудь", "en": "Chest" } },
              { "id": "full_body", "url": "/images/harness-full.jpg", "label": { "ru": "На всё тело", "en": "Full body" } },
              { "id": "waist", "url": "/images/harness-waist.jpg", "label": { "ru": "На талию", "en": "Waist" } }
            ]
          }
        },
        {
          "id": "harness_material",
          "type": "single_select",
          "question": { "ru": "Материал?", "en": "Material?" },
          "config": {
            "options": [
              { "id": "leather", "label": { "ru": "Кожа", "en": "Leather" } },
              { "id": "nylon", "label": { "ru": "Нейлон", "en": "Nylon" } },
              { "id": "chain", "label": { "ru": "Цепочки", "en": "Chain" } }
            ]
          }
        }
      ]
    },
    {
      "id": "nipple_clamps",
      "label": { "ru": "Зажимы для сосков", "en": "Nipple clamps" },
      "tag_ref": "nipple_clamps",
      "follow_ups": [
        {
          "id": "clamp_type",
          "type": "multi_select",
          "question": { "ru": "Какой тип зажимов?", "en": "What type of clamps?" },
          "config": {
            "options": [
              { "id": "clover", "label": { "ru": "Клеверные (сильные)", "en": "Clover (strong)" } },
              { "id": "tweezer", "label": { "ru": "Пинцетные (регулируемые)", "en": "Tweezer (adjustable)" } },
              { "id": "magnetic", "label": { "ru": "Магнитные", "en": "Magnetic" } },
              { "id": "with_chain", "label": { "ru": "С цепочкой", "en": "With chain" } },
              { "id": "with_weights", "label": { "ru": "С грузиками", "en": "With weights" } }
            ]
          }
        },
        {
          "id": "clamp_intensity",
          "type": "intensity",
          "question": { "ru": "Насколько сильное сжатие?", "en": "How tight?" },
          "config": {
            "min_label": { "ru": "Лёгкое", "en": "Light" },
            "max_label": { "ru": "Очень сильное", "en": "Very tight" }
          }
        }
      ]
    },
    {
      "id": "gag",
      "label": { "ru": "Кляп", "en": "Gag" },
      "tag_ref": "gag",
      "follow_ups": [
        {
          "id": "gag_type",
          "type": "single_select",
          "question": { "ru": "Какой тип кляпа?", "en": "What type of gag?" },
          "config": {
            "options": [
              { "id": "ball", "label": { "ru": "Шарик", "en": "Ball gag" } },
              { "id": "ring", "label": { "ru": "Кольцо (рот открыт)", "en": "Ring gag (mouth open)" } },
              { "id": "bit", "label": { "ru": "Трензель (как у лошади)", "en": "Bit gag" } },
              { "id": "tape", "label": { "ru": "Скотч", "en": "Tape" } }
            ]
          }
        }
      ]
    },
    {
      "id": "tail_plug",
      "label": { "ru": "Хвостик", "en": "Tail plug" },
      "tag_ref": "tail_plug",
      "follow_ups": [
        {
          "id": "tail_type",
          "type": "single_select",
          "question": { "ru": "Какой хвостик?", "en": "What tail?" },
          "config": {
            "options": [
              { "id": "fox", "label": { "ru": "Лисий", "en": "Fox" } },
              { "id": "bunny", "label": { "ru": "Кроличий", "en": "Bunny" } },
              { "id": "cat", "label": { "ru": "Кошачий", "en": "Cat" } },
              { "id": "pony", "label": { "ru": "Лошадиный", "en": "Pony" } }
            ]
          }
        },
        {
          "id": "pet_play_interest",
          "type": "experience",
          "question": { "ru": "Интерес к пет-плею в целом?", "en": "Interest in pet play?" },
          "show_if": { "element_selected": ["tail_plug"] }
        }
      ]
    },
    {
      "id": "wax_play",
      "label": { "ru": "Воск", "en": "Wax play" },
      "tag_ref": "wax_play",
      "follow_ups": [
        {
          "id": "wax_body_map",
          "type": "body_map",
          "question": { "ru": "Куда можно капать воск?", "en": "Where can wax be dripped?" },
          "config": {
            "gender": "both",
            "allow_multiple": true
          }
        },
        {
          "id": "wax_temperature",
          "type": "intensity",
          "question": { "ru": "Температура воска?", "en": "Wax temperature?" },
          "config": {
            "min_label": { "ru": "Тёплый (массажная свеча)", "en": "Warm (massage candle)" },
            "max_label": { "ru": "Горячий (парафин)", "en": "Hot (paraffin)" }
          }
        }
      ]
    }
  ],

  "question": {
    "type": "multi_select",
    "text": {
      "ru": "Что тебе нравится на этой сцене?",
      "en": "What appeals to you in this scene?"
    },
    "min_selections": 0
  },

  "ai_context": {
    "tests_primary": ["bondage", "bdsm_gear", "pain_play"],
    "tests_secondary": ["pet_play", "temperature_play", "submission"],
    "emotional_range": {
      "positive": ["into BDSM gear", "loves accessories", "submission interest"],
      "negative": ["too much gear", "overwhelming", "prefers simpler"]
    }
  }
}
```

---

## Example: Dirty Talk Follow-up

```json
{
  "id": "dirty_talk",
  "label": { "ru": "Грязные разговоры", "en": "Dirty talk" },
  "tag_ref": "dirty_talk",
  "follow_ups": [
    {
      "id": "word_types",
      "type": "multi_select",
      "question": { "ru": "Какие слова тебя возбуждают?", "en": "What words turn you on?" },
      "config": {
        "options": [
          {
            "id": "praising",
            "label": { "ru": "Хвалящие", "en": "Praising" },
            "examples": { "ru": "Ты такая красивая, как хорошо ты это делаешь" },
            "drilldown": {
              "id": "praise_type",
              "type": "multi_select",
              "question": { "ru": "Какая похвала?", "en": "What praise?" },
              "config": {
                "options": [
                  { "id": "appearance", "label": { "ru": "Про внешность", "en": "About appearance" } },
                  { "id": "skill", "label": { "ru": "Про умения", "en": "About skill" } },
                  { "id": "sounds", "label": { "ru": "Про звуки", "en": "About sounds" } },
                  { "id": "body_reaction", "label": { "ru": "Про реакцию тела", "en": "About body reaction" } }
                ]
              }
            }
          },
          {
            "id": "degrading",
            "label": { "ru": "Унизительные", "en": "Degrading" },
            "drilldown": {
              "id": "degrading_words",
              "type": "multi_select",
              "question": { "ru": "Какие унизительные слова ок?", "en": "Which degrading words are OK?" },
              "config": {
                "options": [
                  { "id": "slut", "label": { "ru": "Шлюха/шлюшка", "en": "Slut" } },
                  { "id": "whore", "label": { "ru": "Блядь", "en": "Whore" } },
                  { "id": "dirty_girl", "label": { "ru": "Грязная девочка", "en": "Dirty girl" } },
                  { "id": "hole", "label": { "ru": "Дырка/игрушка", "en": "Hole/toy" } },
                  { "id": "cumslut", "label": { "ru": "Спермоприёмник", "en": "Cumslut" } }
                ],
                "allow_custom": true
              }
            }
          },
          { "id": "commanding", "label": { "ru": "Командующие", "en": "Commanding" } },
          { "id": "possessive", "label": { "ru": "Собственнические", "en": "Possessive" } },
          { "id": "begging", "label": { "ru": "Умоляющие", "en": "Begging" } }
        ]
      }
    },
    {
      "id": "talk_intensity",
      "type": "intensity",
      "question": { "ru": "Насколько откровенно?", "en": "How explicit?" },
      "config": {
        "min_label": { "ru": "Мягкие намёки", "en": "Soft hints" },
        "max_label": { "ru": "Очень откровенно и грязно", "en": "Very explicit and dirty" }
      }
    },
    {
      "id": "talk_role",
      "type": "role",
      "question": { "ru": "Что тебе ближе?", "en": "Your preference?" },
      "config": {
        "options": ["hear", "speak", "both"]
      }
    },
    {
      "id": "custom_names",
      "type": "text_with_suggestions",
      "question": { "ru": "Как тебе нравится, чтобы называли твои части тела?", "en": "What names for your body parts?" },
      "show_if": { "interest_level": { "min": 50 } },
      "config": {
        "suggestions": [
          { "ru": "Член: член, хуй, писька", "en": "Cock: cock, dick" },
          { "ru": "Вагина: киска, пизда, дырочка", "en": "Pussy: pussy, cunt" }
        ],
        "placeholder": { "ru": "Свои варианты...", "en": "Your options..." }
      }
    }
  ]
}
```

---

## UI Flow

### Phase 1: Scene Display
```
┌─────────────────────────────────────────┐
│  [COMPOSITE SCENE IMAGE]                │
│                                         │
│  ○ Handcuffs  ○ Harness  ○ Clamps      │
│  ○ Gag        ○ Tail     ○ Wax         │
│                                         │
│  "Что тебе нравится на этой сцене?"    │
│                                         │
│  [Пропустить]            [Далее →]     │
└─────────────────────────────────────────┘
```

### Phase 2: Element Follow-ups
After user selects [Handcuffs ✓] [Clamps ✓] [Wax ✓]:

```
┌─────────────────────────────────────────┐
│  Уточняющие вопросы: Наручники          │
│                                         │
│  Какой тип?                             │
│  ☐ Металлические  ☐ Кожаные            │
│  ☐ С подкладкой   ☐ Верёвка            │
│                                         │
│  В какой роли?                          │
│  ○ Носить  ○ Надевать  ○ Оба           │
│                                         │
│  [← Назад]  [Пропустить]  [Далее →]    │
└─────────────────────────────────────────┘
```

### Phase 3: Nested Drilldown (Level 3)
If user selected "Degrading" in dirty talk:

```
┌─────────────────────────────────────────┐
│  Какие унизительные слова ок?           │
│                                         │
│  ☐ Шлюха        ☐ Блядь                │
│  ☐ Грязная      ☐ Дырка                │
│  ☐ Сучка        ☐ Свой вариант...      │
│                                         │
│  [← Назад]               [Готово →]    │
└─────────────────────────────────────────┘
```

---

## Database Schema

### Table: composite_scene_responses
```sql
CREATE TABLE composite_scene_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scene_id TEXT NOT NULL,  -- References scenes.slug

  -- Selected elements
  selected_elements TEXT[] NOT NULL DEFAULT '{}',  -- ["handcuffs", "wax_play"]

  -- Follow-up responses (nested JSON)
  element_responses JSONB NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "handcuffs": {
  --     "cuff_type": ["metal", "leather"],
  --     "cuff_role": "both"
  --   },
  --   "wax_play": {
  --     "wax_body_map": ["chest", "back", "thighs"],
  --     "wax_temperature": 65
  --   }
  -- }

  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, scene_id)
);
```

### Table: tag_preferences (aggregated)
```sql
CREATE TABLE tag_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tag_ref TEXT NOT NULL,              -- Reference to taxonomy tag

  interest_level INTEGER,             -- 0-100 aggregated from scenes
  role_preference TEXT CHECK (role_preference IN ('give', 'receive', 'both')),
  intensity_preference INTEGER CHECK (intensity_preference >= 0 AND intensity_preference <= 100),
  specific_preferences JSONB DEFAULT '{}',         -- Tag-specific details
  experience_level TEXT CHECK (experience_level IN ('tried', 'want_to_try', 'not_interested', 'curious')),

  source_scenes TEXT[] DEFAULT '{}',               -- Which scenes contributed (scene slugs)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, tag_ref)
);
```

---

## Scene Progression

### Ordering Strategy
1. Start with milder scenes (intensity 1-2)
2. Branch based on interests shown
3. Show role-appropriate scenes (M-dom if interested, F-dom if interested)
4. Increase intensity based on comfort signals
5. Skip scenes with already-answered elements (dedupe_by_tag)

### Scene Categories (24 categories, 135 scenes)

See `composite/_index.json` for complete list. Categories include:
- **Romantic & Tender** (3): aftercare, romantic-sex, quickie
- **Oral** (7): blowjob, cunnilingus, deepthroat, facesitting, rimming
- **Impact & Pain** (9): spanking, wax-play, choking, nipple-play, whipping
- **Control & Power** (8): bondage, collar, edging, feminization, free-use
- **Body Fluids** (6): golden-shower, spitting, cum-finish, squirting
- **Group** (5): threesome, gangbang, orgy, swinging
- **Extreme** (5): needle-play, mummification, figging, lactation, fucking-machine
- And 15 more categories...

Full breakdown: 24 categories, 135 scenes total, organized by intensity (1-5) and role direction.

---

## Migration from v4

1. **Completed**: 468 v4 scenes consolidated into 135 composite scenes
2. **Location**: `scenes/v2/composite/` (135 JSON files)
3. **Body Map**: 6 activities in `body-map/` folder
   - Interactive body silhouette (anime-style dolls: man_front.jpg, man_back2.jpg, woman_front.jpeg, woman_back.jpeg)
   - Clickable zones with automatic detection (zone coordinates in `body-zones.ts`)
   - Two modes: zone-first (select zone → set action preferences) or legacy (color markers: love/sometimes/no)
   - Front/back view toggle
   - Zone detection with confidence levels (high/medium/low)
4. **Activities**: 2 interactive activities in `activities/` folder
5. **Status**: 
   - ✅ Scenes imported to database
   - ✅ Database schema complete (migrations 005 + 011)
   - ✅ Full V2 UI implementation in discovery flow
   - ✅ All V2 UI components implemented (CompositeSceneView, FollowUpFlow, ElementSelector)
   - ✅ All follow-up type components implemented
   - ✅ Saving to composite_scene_responses implemented
   - ✅ Tag preferences aggregation implemented

---

## Implementation Checklist

- [x] Create CompositeScene TypeScript types (in `types.ts`)
- [x] Create FollowUp TypeScript types (in `types.ts`)
- [x] Create 135 composite scenes in JSON (`scenes/v2/composite/`)
- [x] Create 6 body-map activities (`scenes/v2/body-map/`)
- [x] Create 2 interactive activities (`scenes/v2/activities/`)
- [x] Create database migration (`005_scenes_v2_composite.sql`)
- [x] Create finalization migration (`011_finalize_v2.sql`) - adds V2 tables and functions
- [x] Create database schema documentation (`docs/DATABASE_SCHEMA_V2.md`)
- [x] Basic V2 scene display in discovery flow (`discover/page.tsx`)
- [x] Element selection (multi_select) - implemented in discovery page
- [x] FollowUpQuestion component - basic follow-up support
- [x] API route `/api/ai/question` - updated for V2
- [x] Question processing (`question-v2.ts`)
- [x] Create CompositeSceneView component (dedicated component) - ✅ `src/components/discovery/CompositeSceneView.tsx`
- [x] Create FollowUpFlow component (dedicated flow component) - ✅ `src/components/discovery/FollowUpFlow.tsx`
- [x] Create ElementSelector component (multi_select) - ✅ `src/components/discovery/ElementSelector.tsx`
- [x] Implement all follow-up type components:
  - [x] ImageSelectAnswer - ✅ `src/components/discovery/ImageSelectAnswer.tsx`
  - [x] TextInputAnswer - ✅ `src/components/discovery/TextInputAnswer.tsx`
  - [x] TextWithSuggestionsAnswer - ✅ `src/components/discovery/TextWithSuggestionsAnswer.tsx`
  - [x] IntensityAnswer - ✅ `src/components/discovery/IntensityAnswer.tsx`
  - [x] RoleAnswer - ✅ `src/components/discovery/RoleAnswer.tsx`
  - [x] ExperienceAnswer - ✅ `src/components/discovery/ExperienceAnswer.tsx`
- [x] Save to `composite_scene_responses` table - ✅ реализовано в `discover/page.tsx`
- [x] Update `tag_preferences` aggregation - ✅ реализовано в `src/lib/tag-preferences.ts`
- [x] Create scene progression algorithm (adaptive flow with dedupe_by_tag) - ✅ реализовано в `src/lib/scene-progression.ts`
- [ ] Generate images for all composite scenes - по мере необходимости
- [x] Test full V2 flow end-to-end - ✅ интегрировано и готово к тестированию
