# Discovery 2 - Composite Scenes System

## Overview

Discovery 2 reorganizes 468 granular v4 scenes into **135 composite scenes** with proper role separation for asymmetric activities, plus **interactive activities** for multi-modal preference discovery.

Key improvements:
- **Body Map FIRST** — interactive body zone selection before scenes
- **Multi-modal activities** — audio, image, text, slider inputs
- Proper M→F / F→M separation for asymmetric activities
- Nested follow-up questions for deeper preference capture
- Bilingual support (ru/en) throughout
- Consistent structure across all scenes

## Discovery Flow

```
1. BODY MAP (2-3 scenes)         ← Universal body map with zone-first selection
   - One map for user's own body
   - One map for partner(s) based on preferences
   - Zone-first mode: select zone → choose actions → set preferences
   - See detailed documentation: docs/BODY_MAP_SYSTEM.md

2. INTERACTIVE ACTIVITIES (2+)    ← Non-scene preference capture
   - Sounds (audio_select) — what sounds turn you on
   - Clothing (image_select) — what outfits excite you
   - Future: Naming, Pace, Aftercare, Hard Limits

3. BASELINE SCENES (14 scenes)    ← Foundational preference gates
   - Shown first (priority: 0)
   - Determine which detailed scenes to show/skip
   - Examples: D/s orientation, pain tolerance, anal interest, group interest
   - Gates filter subsequent scenes based on answers

4. COMPOSITE SCENES (121 scenes)  ← Visual scenes with follow-up questions
   - Organized by category
   - Role-separated (M→F / F→M)
   - Filtered by onboarding gates (sets_gate + isSceneAllowed)
```

**📖 Детальная документация Body Map:** См. [`docs/BODY_MAP_SYSTEM.md`](../../docs/BODY_MAP_SYSTEM.md)

## Structure

```
scenes/v2/
├── README.md
├── flow-rules.json        # Adaptive flow: clusters, gates, scoring, runtime AI
├── profile-analysis.json  # Post-discovery: archetypes, compatibility, insights
│
├── body-map/              # STEP 1 - Interactive body zone selection
│   ├── _index.json
│   ├── kissing.json
│   ├── licking.json
│   ├── light-touch.json
│   ├── light-slapping.json
│   ├── biting.json
│   └── spanking.json
│
├── activities/            # STEP 2 - Non-scene interactive activities
│   ├── _index.json
│   ├── sounds.json        # Audio selection (what sounds turn you on)
│   └── clothing.json      # Image selection (what outfits excite you)
│
└── composite/             # STEP 3+4 - Scene-based questions (135 scenes)
    ├── _index.json
    ├── baseline/          # STEP 3 - Foundational gates (14 scenes, priority: 0)
    │   ├── power-dynamic.json      # D/s orientation
    │   ├── intensity.json          # Rough vs gentle
    │   ├── pain-tolerance.json     # Pain interest
    │   ├── openness.json           # Vanilla vs kinky
    │   ├── anal-interest.json      # Anal attitude
    │   ├── oral-preference.json    # Oral giving/receiving
    │   ├── group-interest.json     # Multiple partners
    │   ├── verbal-preference.json  # Talking during sex
    │   ├── roleplay-interest.json  # Roleplay scenarios
    │   ├── toys-interest.json      # Sex toys
    │   ├── watching-showing.json   # Voyeurism/exhibitionism
    │   ├── clothing-preference.json # Clothing in sex
    │   ├── body-fetishes.json      # Body part fetishes
    │   └── fantasy-reality.json    # Fantasy vs reality
    └── {category}/        # STEP 4 - Detailed scenes (121 scenes)
        └── {scene}.json
```

## Scene Schema

```json
{
  "id": "scene_id",
  "slug": "scene-slug",
  "version": 2,
  "role_direction": "m_to_f | f_to_m | mutual | ...",

  "title": { "ru": "...", "en": "..." },
  "subtitle": { "ru": "...", "en": "..." },
  "description": { "ru": "...", "en": "..." },
  "image_prompt": "...",

  "intensity": 1-5,
  "category": "category_name",
  "tags": ["tag1", "tag2"],

  "elements": [
    {
      "id": "element_id",
      "label": { "ru": "...", "en": "..." },
      "tag_ref": "tag_reference",
      "follow_ups": [
        {
          "id": "followup_id",
          "type": "multi_select | single_select | scale",
          "question": { "ru": "...", "en": "..." },
          "config": {
            "options": [
              { "id": "opt1", "label": { "ru": "...", "en": "..." } }
            ]
          }
        }
      ]
    }
  ],

  "question": {
    "type": "multi_select",
    "text": { "ru": "...", "en": "..." },
    "min_selections": 0
  },

  "ai_context": {
    "tests_primary": ["tag1", "tag2"],
    "tests_secondary": ["tag3", "tag4"]
  }
}
```

## Activity Schemas

### Audio Select (sounds.json)

```json
{
  "id": "activity_sounds",
  "type": "audio_select",
  "title": { "ru": "Звуки возбуждения", "en": "Arousing Sounds" },

  "passes": [
    { "id": "turn_on", "question": { "ru": "Какие звуки тебя возбуждают?" } },
    { "id": "like_making", "question": { "ru": "Какие звуки ты сам(а) издаёшь?" } }
  ],

  "options": [
    {
      "id": "moaning_female",
      "label": { "ru": "Женские стоны", "en": "Female moaning" },
      "_audio_sample": "samples/moaning_female.mp3",
      "_audio_note": "TODO: Add audio sample"
    }
  ],

  "config": {
    "audio_samples_ready": false,
    "multi_select": true
  }
}
```

### Image Select (clothing.json)

```json
{
  "id": "activity_clothing",
  "type": "image_select",
  "title": { "ru": "Возбуждающая одежда", "en": "Arousing Clothing" },

  "passes": [
    { "id": "on_her", "question": { "ru": "Что возбуждает на ней?" } },
    { "id": "on_him", "question": { "ru": "Что возбуждает на нём?" } },
    { "id": "on_me", "question": { "ru": "В чём ты себя чувствуешь сексуально?" } }
  ],

  "categories": [
    {
      "id": "lingerie",
      "label": { "ru": "Нижнее бельё", "en": "Lingerie" },
      "options": [
        {
          "id": "lace_set",
          "label": { "ru": "Кружевной комплект" },
          "_image": "images/clothing/lace_set.jpg",
          "_image_note": "TODO: Generate image"
        }
      ]
    }
  ],

  "config": {
    "images_ready": false,
    "multi_select": true
  }
}
```

**Note:** Fields prefixed with `_` (like `_audio_sample`, `_image`) are commented out until media assets are ready. Set `config.audio_samples_ready` or `config.images_ready` to `true` when assets are available.

## Role Directions

| Value | Description |
|-------|-------------|
| `m_to_f` | Male does to female |
| `f_to_m` | Female does to male |
| `mutual` | Either direction or symmetric |
| `wlw` | Woman loving woman |
| `mlm` | Man loving man |
| `group` | Group scenario |
| `m_dom_f_pet` | Male dominant, female pet/sub |
| `f_dom_m_pet` | Female dominant, male pet/sub |
| `f_dom_m_sub` | Female dominant, male submissive |
| `cuckold` | Cuckold dynamic |
| `hotwife` | Hotwife/stag-vixen dynamic |

## Categories (24 total, 135 scenes)

| Category | Count | Description |
|----------|-------|-------------|
| **baseline** | **14** | **Foundational gates — D/s, intensity, pain, openness, anal, oral, group, verbal, roleplay, toys, voyeurism, clothing, fetishes, fantasy** |
| body-fluids | 6 | Golden shower, spitting, cum, squirting |
| oral | 7 | Blowjob, cunnilingus, deepthroat, facesitting, rimming |
| impact-pain | 12 | Spanking, wax, choking, nipple play, whipping, face slapping, CBT |
| verbal | 5 | Praise, degradation, dirty talk |
| control-power | 11 | Bondage, collar, edging, feminization, free-use, forced/ruined orgasm |
| cnc-rough | 4 | CNC, primal play, somnophilia |
| worship-service | 6 | Foot worship, body worship, armpit, genital worship |
| massage | 2 | Sensual massage |
| pet-play | 2 | Pet play dynamics |
| age-play | 2 | DD/lg, MD/lb |
| chastity | 2 | Male/female chastity |
| group | 6 | Threesome, gangbang, orgy, swinging, double penetration |
| lgbtq | 2 | WLW, MLM |
| exhibitionism | 4 | Exhibitionism, voyeurism, public sex, glory hole |
| anal | 3 | Anal play, pegging |
| cuckold | 2 | Cuckold, hotwife |
| sensory | 4 | Blindfold, ice, feather, electrostim |
| roleplay | 6 | Boss-secretary, stranger, teacher, doctor, service, taboo roleplay |
| toys | 2 | Vibrator, remote control |
| intimacy-outside | 4 | Casual touch, morning teasing, kitchen, sexting |
| symmetric | 2 | Positions, locations |
| clothing | 3 | Lingerie, torn clothes, latex-leather |
| romantic | 3 | Aftercare, romantic sex, quickie |
| extreme | 10 | Needle play, mummification, figging, lactation, fucking machine, fisting, breeding, knife play, breath play, objectification |
| emotional-context | 2 | Emotional sex, cheating fantasy |
| manual | 3 | Handjob, fingering, titfuck |
| filming | 1 | Recording and photography |
| solo-mutual | 2 | JOI, mutual masturbation |

## Paired Scenes

Asymmetric activities have paired variants. See `paired_scenes` in `_index.json`.

```
spanking-m-to-f ↔ spanking-f-to-m
golden-shower-m-to-f ↔ golden-shower-f-to-m
cuckold ↔ hotwife
ddlg ↔ mdlb
```

## Intensity Levels

| Level | Description | Examples |
|-------|-------------|----------|
| 1 | Vanilla | Romantic sex, massage |
| 2 | Light kink | Spanking, blindfold, dirty talk |
| 3 | Moderate kink | Bondage, role play |
| 4 | Advanced kink | CNC, electrostim |
| 5 | Extreme | Needle play, mummification |

---

## Baseline System

Baseline scenes are **foundational questions** shown first (priority: 0) that determine which detailed scenes to show or skip. They establish the user's core preferences before diving into specifics.

### Why Baseline?

Without baseline scenes, the system would ask everyone about everything — including scenes they have zero interest in. Baseline scenes act as **gates** that filter out irrelevant content.

### The 14 Baseline Scenes

| Scene | Tests | Gates |
|-------|-------|-------|
| `power-dynamic` | D/s orientation | dominant → bondage_giving, control_scenes; submissive → bondage_receiving, service_scenes |
| `intensity` | Rough vs gentle | gentle_only → skip rough scenes; rough → impact, CNC scenes |
| `pain-tolerance` | Pain interest | no → skip pain scenes; yes → impact, wax, CBT |
| `openness` | Vanilla vs kinky | vanilla → skip extreme; kinky → unlock advanced |
| `anal-interest` | Anal attitude | no → skip all anal; yes → rimming, pegging, anal play |
| `oral-preference` | Oral giving/receiving | dislike_giving → skip giving oral; love → detailed oral scenes |
| `group-interest` | Multiple partners | no → skip group; yes → threesome, gangbang, swinging, orgy |
| `verbal-preference` | Talking during sex | silent → skip dirty talk; vocal → praise, degradation |
| `roleplay-interest` | Roleplay scenarios | no → skip roleplay; yes → all roleplay scenes |
| `toys-interest` | Sex toys | no → skip toy scenes; yes → vibrator, remote control |
| `watching-showing` | Voyeurism/exhibitionism | no → skip voyeur scenes; yes → exhibitionism, public |
| `clothing-preference` | Clothing in sex | naked → skip clothing; fetish → latex, lingerie scenes |
| `body-fetishes` | Body part fetishes | feet → foot worship; worship → body worship scenes |
| `fantasy-reality` | Fantasy vs reality | strict → fantasy_only scenes; all → encourage trying |

### Gate Logic

Сцены используют `sets_gate` для установки гейтов при ответе YES/VERY:

```json
{
  "slug": "pain-tolerance",
  "category": "baseline",
  "sets_gate": "rough"
}
```

При YES → триггер `update_gates_from_scene_response()` устанавливает `rough: true` в `user_gates`.

Затем `SCENE_GATES` в коде проверяет, можно ли показать сцену:
```typescript
// src/lib/onboarding-gates.ts
'spanking-m-to-f': { gates: ['rough'], operator: 'AND' }
```

### Baseline Scene Schema

```json
{
  "category": "baseline",
  "priority": 5,
  "sets_gate": "rough"
}
```

---

## Question Types

- `swipe` - Картинка + свайп (влево/вправо/вверх/вниз)
- `multi_select` - Выбор нескольких вариантов
- `scale` - Шкала 1-5

## Usage Example

```typescript
import { fetchUserGates, isSceneAllowed } from '@/lib/onboarding-gates';

// Fetch user's gates
const gates = await fetchUserGates(supabase, userId);
// { rough: true, anal: false, bondage: true }

// Check if scene is allowed
const allowed = isSceneAllowed('spanking-m-to-f', gates);
// true (requires rough, user has rough: true)

// Get paired scene
const scene = await getScene('spanking-m-to-f');
const pairedSlug = scene.paired_scene; // 'spanking-m-to-f-receive'
```

### Gate Flow

```typescript
// 1. User answers scene with sets_gate
await saveSceneResponse(userId, sceneId, { value: 1 }); // YES

// 2. DB trigger reads scene.sets_gate and updates user_gates
// INSERT scene_responses → trigger → UPDATE user_gates SET gates = gates || {rough: true}

// 3. When loading scenes, filter by gates
const scenes = await getFilteredScenes(userId);
// Only returns scenes where isSceneAllowed(slug, userGates) === true
```
```

## Migration from v4

The 468 v4 scenes are consolidated into 135 composite scenes (14 baseline + 121 detailed):
- Granular variants → Follow-up questions
- Role-reversed scenes → Paired scenes with `role_direction`
- Scattered tags → Consistent `ai_context.tests_primary/secondary`

## Statistics

| Metric | Value |
|--------|-------|
| **Body Map activities** | 6 |
| **Interactive activities** | 2 (sounds, clothing) |
| **Future activities** | 4 planned |
| **Baseline scenes** | 14 |
| **Detailed scenes** | 121 |
| **Total scenes** | 135 |
| **Categories** | 24 |
| Paired scene pairs | 25 |
| Scenes with elements | All |
| Avg elements per scene | 3-4 |
| Consolidation ratio | 3.5:1 from v4 |

## Activity Types

| Type | Description | Example |
|------|-------------|---------|
| `body_map` | Tap zones on body silhouette | Kissing, Spanking zones |
| `audio_select` | Listen and select audio samples | Arousing sounds |
| `image_select` | View and select images | Clothing preferences |
| `text_input_select` | Type or select text options | Naming body parts |
| `slider` | Drag slider for value | Pace/intensity |
| `multi_select` | Select multiple checkboxes | Aftercare preferences |
| `checklist` | Yes/No checklist | Hard limits |

## Adaptive Flow System

The adaptive flow system personalizes question ordering and skips irrelevant content based on user responses.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         flow-rules.json                         │
│                    (Offline AI + Manual Rules)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ tag_clusters │  │ intensity_   │  │ bodymap_to_tags      │ │
│  │ (12 groups)  │  │ gates        │  │ (zone → tag mapping) │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Runtime Engine                            │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐│
│  │ OFFLINE MODE (default)  │ OR │ RUNTIME AI (paid, async)    ││
│  │ - Rule-based scoring    │    │ - Background analysis       ││
│  │ - Fast, free            │    │ - Non-blocking calibration  ││
│  │ - Deterministic         │    │ - Smarter predictions       ││
│  └─────────────────────────┘    └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 profile-analysis.json                           │
│                   (Post-Discovery AI)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Archetypes   │  │ Couple       │  │ AI Insight            │ │
│  │ (20 types)   │  │ Compatibility│  │ Generation            │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Three Levels of AI Integration

| Level | When | Cost | Description |
|-------|------|------|-------------|
| **OFFLINE** | Build time | Free | Pre-computed tag clusters, intensity paths, similarity matrix |
| **RUNTIME** | During discovery | Paid | Background AI calibration after each scene (non-blocking) |
| **POST-ANALYSIS** | After completion | Included | Profile generation, archetype matching, couple compatibility |

### Offline Scoring (Default)

```
score = base_score
      + tag_boosts (from bodymap, previous answers)
      + cluster_boosts (related tags in same cluster)
      + similarity_boosts (liked similar scenes)
      - intensity_mismatch_penalty
      - already_seen_category_penalty
```

See `flow-rules.json → scoring_algorithm` for weights.

### Runtime AI (Paid Feature)

When enabled, AI analyzes responses **in background** after each scene:

```
User answers Scene #15
       ↓
┌──────────────────────────────────────────┐
│ IMMEDIATELY show Scene #16               │ ← From offline algorithm
│ (no waiting for AI)                      │
└──────────────────────────────────────────┘
       ↓ (async, in background)
┌──────────────────────────────────────────┐
│ AI analyzes 15 responses                 │
│ → Predicts interest for remaining 79     │
│ → Recalibrates order for Scene #17+      │
└──────────────────────────────────────────┘
```

Config in `flow-rules.json`:
```json
"runtime_ai": {
  "enabled": false,
  "is_paid_feature": true,
  "config": {
    "analyze_after_n_scenes": 5,
    "recalibrate_every_n": 10,
    "fallback_to_offline": true
  }
}
```

### Tag Clusters

12 pre-defined clusters group related interests:

| Cluster | Core Tags | Progression Path |
|---------|-----------|------------------|
| impact_play | spanking, slapping | light-slapping → spanking (инструменты как follow_up внутри) |
| primal | biting, scratching, hair_pulling | biting → scratching → primal → cnc |
| bondage_restraint | bondage, rope, shibari | blindfold → light_restraints → full_bondage → shibari |
| power_exchange | dominance, submission, service | light_dominance → collar → pet_play → TPE |
| sensory | blindfold, ice, wax, electrostim | feather → ice → wax → electrostim |
| romantic_sensual | romantic, tender, massage | vanilla → sensual → deeply_romantic |

See `flow-rules.json → tag_clusters` for full list.

### Intensity Gates (flow-rules.json)

Some scenes require prerequisite interests (defined in `flow-rules.json`):

```json
"whipping": {
  "require_any": ["spanking >= 3", "impact_play >= 2"],
  "skip_if": ["pain_pleasure == 0"]
},
"needle_play": {
  "require_all": ["edge_play >= 3", "pain_pleasure >= 3"],
  "require_explicit_consent": true
}
```

### Inter-Scene Gates (scene-progression.ts)

> **Реализовано в:** `src/lib/scene-progression.ts`

Дополнительно к intensity gates, есть **межсценовые гейты** — продвинутые сцены требуют положительного ответа на базовые:

```typescript
const SCENE_REQUIRES_SCENE = {
  'deepthroat': { requires: ['blowjob'], minInterest: 60 },
  'facesitting': { requires: ['cunnilingus'], minInterest: 60 },
  'mummification': { requires: ['bondage'], minInterest: 70 },
  'gangbang': { requires: ['threesome'], minInterest: 70 },
  'orgy': { requires: ['threesome'], minInterest: 70 },
  // ... см. полный список в scene-progression.ts
};
```

**Подробнее:** [`docs/onboarding-integration.md` → §9](../../docs/onboarding-integration.md#9-межсценовые-гейты-inter-scene-gates)

### Body Map → Tag Mapping

Body map selections boost relevant tags:

```json
"spanking": {
  "zones": {
    "buttocks": { "boost": ["spanking", "impact_play", "discipline"] },
    "thighs": { "boost": ["extended_impact", "pain_pleasure"] },
    "many_zones": { "boost": ["heavy_impact", "masochist"] }
  },
  "give_receive": {
    "give_only": { "boost": ["dominant", "sadist"] },
    "receive_only": { "boost": ["submissive", "masochist"] },
    "both": { "boost": ["switch", "versatile"] }
  }
}
```

### Exploration Strategy

```json
"exploration_strategy": {
  "calibration_phase": {
    "scenes_count": 15,
    "strategy": "breadth_first"
  },
  "main_phase": {
    "exploit_ratio": 0.7,
    "explore_ratio": 0.3
  }
}
```

- First 15 scenes: diverse selection to establish baseline
- After: 70% from high-interest clusters, 30% discovery

---

## Post-Discovery Analysis

After completing discovery, AI generates insights. See `profile-analysis.json`.

### Archetypes (20 types)

| Archetype | Description | Key Indicators |
|-----------|-------------|----------------|
| Romantic Lover | Values connection, tenderness | high: romantic, sensual, aftercare |
| Gentle Explorer | Open but prefers soft approach | high: sensual, teasing; low: pain |
| Playful Kinkster | Enjoys experimentation, light BDSM | high: spanking, roleplay, toys |
| Dominant | Prefers control and power | pattern: give >> receive |
| Submissive | Enjoys surrendering control | pattern: receive >> give |
| Switch | Enjoys both roles | pattern: give ≈ receive |
| Primal | Animal passion, intensity | high: biting, scratching, rough |
| Sensualist | Focus on physical sensations | high: blindfold, ice, wax, massage |
| Exhibitionist | Aroused by being watched | high: exhibitionism, public_risk |
| Voyeur | Aroused by watching | high: voyeurism, watching |
| Fetishist | Specific object/material focus | high_any: foot, latex, leather |
| Edge Player | Intense, taboo practices | intensity_preference >= 4 |

Users may match multiple archetypes. Subtypes exist (e.g., Caring Dom, Strict Dom, Sadist).

### Couple Compatibility

Analyzes two profiles across dimensions:

1. **Role Compatibility** — Dom/sub match, switch flexibility
2. **Intensity Alignment** — Same range vs. significant gap
3. **Shared Interests** — Overlap of high-scored tags
4. **Complementary Desires** — A wants to give what B wants to receive
5. **Growth Opportunities** — One's interest in other's exploration zone

Output includes:
- Overall score (0-100%)
- Shared favorites
- Areas to explore together
- Discussion points
- Date night ideas

### AI-Generated Insights

```json
"generate_profile_summary": {
  "system": "Generate insightful, non-judgmental profile summaries.",
  "output": "2-3 paragraphs: core desires, preferred dynamics, exploration areas"
}
```

Pre-written templates for common patterns:
```json
"primal_romantic": {
  "pattern": "primal + romantic",
  "insight": "Two wolves live in you: one craves tenderness, the other primal passion."
}
```

---

## Image Prompt Guidelines

Each scene has an `image_prompt` field for image generation. Follow these rules:

### ✅ MUST DO:

1. **Always specify gender and position**
   - Bad: `couple in bedroom, one person on top`
   - Good: `woman sitting on man's lap facing him, man lying on bed`

2. **Only ONE action per prompt**
   - Bad: `he strokes her hair, then kisses her neck, then spanks her`
   - Good: `man spanking woman's bare bottom with open palm`

3. **Always specify clothing state**
   - Bad: `couple in bedroom`
   - Good: `naked woman, man in unbuttoned shirt`
   - Good: `woman in black lingerie, man fully clothed in suit`

4. **Can mention lighting and setting**
   - Good: `warm bedroom lighting, silk sheets`
   - Good: `dimly lit room, candles on nightstand`

### ⛔ NEVER DO:

1. **Never specify art style** — style is set via `styleVariant`
   - Bad: `photorealistic, cinematic, 4k, masterpiece`

2. **Never use speech bubbles or quality words**
   - Bad: `beautiful, stunning, perfect, high quality`

3. **Avoid vague descriptions**
   - Bad: `intimate moment, passionate scene`
   - Good: `man kissing woman's neck while holding her waist`

### 📝 Prompt Template:

```
[WHO - explicit genders], [CLOTHING STATE], [SPECIFIC ACTION], [SETTING/LIGHTING]
```

**Examples:**
```
naked woman lying face down on bed, man's hands massaging her back with oil, warm bedroom lighting

woman in red lingerie sitting on man's face, man naked lying on back, her hands gripping headboard

man standing behind naked woman bent over desk, his hand raised mid-spank, office setting
```

---

## File Reference

| File | Purpose |
|------|---------|
| `flow-rules.json` | Adaptive ordering: clusters, gates, scoring, runtime AI config |
| `profile-analysis.json` | Post-discovery: 20 archetypes, 26 insights, compatibility rules |
| `image-manifest.json` | 129 images for generation (95 scenes + 34 clothing) |
| `composite/_index.json` | Scene registry with categories |
| `body-map/_index.json` | Body map activity flow |
| `activities/_index.json` | Non-scene activity registry |

---

## TypeScript Implementation

All core logic is implemented in `scripts/`:

| File | Purpose |
|------|---------|
| `flow-engine.ts` | Adaptive flow, scoring, body map processing |
| `profile-generator.ts` | Profile creation, archetype matching |
| `couple-matcher.ts` | Compatibility analysis, date ideas |
| `api.ts` | REST API endpoints |
| `schema.ts` | JSON validation |
| `test-journeys.ts` | 20 test user journeys |
| `localization.ts` | Translation checking |

### Usage

```typescript
import flowEngine, { createFlowState } from './scripts/flow-engine';
import profileGenerator from './scripts/profile-generator';
import coupleMatcher from './scripts/couple-matcher';

// 1. Initialize state
let state = createFlowState();

// 2. Process body map
state = flowEngine.processBodyMapResponses(state, bodyMapAnswers);

// 3. Get next scene
const nextScene = flowEngine.getNextScene(allScenes, state);

// 4. Process response
state = flowEngine.processSceneResponse(state, response, scene);

// 5. Generate profile
const profile = profileGenerator.generateProfile(state, totalScenes, totalBodyMap);

// 6. Match couple
const compatibility = coupleMatcher.analyzeCompatibility(profileA, profileB);
```

### API Endpoints

```
POST /api/discovery/start           # Start session
GET  /api/discovery/session/:id     # Get session state
POST /api/discovery/bodymap         # Submit body map answers
GET  /api/discovery/next-scene      # Get next scene
POST /api/discovery/scene/response  # Submit scene response
GET  /api/discovery/profile         # Get generated profile
POST /api/discovery/compatibility   # Analyze couple compatibility
POST /api/discovery/enable-runtime-ai # Enable paid AI feature
```

### Test Journeys (20 profiles)

Run predefined user journeys to validate flow:

```typescript
import { runAllJourneyTests } from './scripts/test-journeys';

const results = runAllJourneyTests(allScenes);
console.log(`Passed: ${results.passed}/${results.passed + results.failed}`);
```

Journeys cover: romantic_lover, dominant_male, submissive_female, submissive_male, switch, primal, sensualist, exhibitionist, service_sub, dominant_female, experimenter, taboo_lover, voyeur, group_enthusiast, sadist, brat, masochist_heavy, cuckold, roleplay_lover, vanilla_curious

### Validation

```typescript
import { validateScene } from './scripts/schema';
import { checkFile, printReport } from './scripts/localization';

// Schema validation
const result = validateScene(sceneData);

// Localization check
const report = checkFile(sceneData, 'scene.json');
printReport(report);
```
