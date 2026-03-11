# Database Schema V2

## Overview

This document describes the complete database schema for Intimate Discovery V2. The schema is created by two migrations:
- `005_scenes_v2_composite.sql` - Base V2 structure (FULL RESET)
- `011_finalize_v2.sql` - Final additions and functions

---

## Core Tables

### profiles

User base information.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'undisclosed')),
  interested_in TEXT CHECK (interested_in IN ('male', 'female', 'both')),
  language TEXT DEFAULT 'ru',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  visual_onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### preference_profiles

Flexible JSONB structure for user preferences.

```sql
CREATE TABLE preference_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### subscriptions

User subscription information.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'yearly', 'lifetime')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### partnerships

User partnerships for couple features.

```sql
CREATE TABLE partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES profiles(id),
  invite_code TEXT UNIQUE,
  nickname TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partner_id)
);
```

---

## Scenes & Responses

### scenes

V2 composite scenes with full metadata.

```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  slug TEXT UNIQUE NOT NULL,
  version INTEGER DEFAULT 2,

  -- Direction (replaces legacy participants/relevant_for)
  role_direction TEXT CHECK (role_direction IN (
    'm_to_f', 'f_to_m', 'mutual', 'solo',
    'group', 'universal',
    'm_daddy_f_little', 'f_mommy_m_little',
    'm_dom_f_pet', 'f_dom_m_pet', 'f_dom_m_sub',
    'm_keyholder_f_locked', 'f_keyholder_m_locked',
    'f_on_m', 'f_experience',
    'cuckold', 'hotwife',
    'mlm', 'wlw'
  )) DEFAULT 'mutual',

  -- Localized content (JSONB)
  title JSONB NOT NULL DEFAULT '{"ru": "", "en": ""}',
  subtitle JSONB DEFAULT '{"ru": "", "en": ""}',
  ai_description JSONB NOT NULL DEFAULT '{"ru": "", "en": ""}',   -- For AI matching
  user_description JSONB DEFAULT '{"ru": "", "en": ""}',          -- For users
  user_description_alt JSONB,                                      -- Alternative for other gender
  alt_for_gender TEXT CHECK (alt_for_gender IN ('male', 'female')), -- Which gender sees alt

  -- Image generation
  image_url TEXT,
  image_prompt TEXT,           -- Default prompt from JSON (reference)
  generation_prompt TEXT,      -- Current working prompt (editable)
  prompt_instructions TEXT,    -- AI instructions to modify prompt

  -- Classification
  intensity INTEGER DEFAULT 3 CHECK (intensity >= 1 AND intensity <= 5),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 50,

  -- V2 structure
  elements JSONB DEFAULT '[]',   -- Scene elements with follow-ups
  question JSONB,                -- Question configuration
  ai_context JSONB NOT NULL DEFAULT '{"tests_primary": [], "tests_secondary": []}',

  -- Gates & pairing
  sets_gate TEXT,                                              -- Gate name set on YES/VERY response
  paired_scene TEXT,                                           -- Slug of paired scene (same image, diff perspective)

  -- Admin workflow
  qa_status TEXT CHECK (qa_status IN ('passed', 'failed')),  -- QA validation
  qa_attempts INTEGER,                                        -- QA attempt count
  qa_last_assessment JSONB,                                   -- Last QA details
  accepted BOOLEAN DEFAULT NULL,                              -- Manual approval
  follow_up JSONB,                                            -- Legacy (still editable)
  is_active BOOLEAN DEFAULT TRUE,                             -- Active flag (false for mlm/wlw)

  -- Image gallery
  image_variants JSONB DEFAULT '[]',                          -- Gallery of image variants
  selected_variant_index INTEGER DEFAULT 0,                   -- Currently selected variant

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Field Purposes

| Field | Purpose |
|-------|---------|
| `image_prompt` | Default prompt from JSON files. Reference for "Reset to default". |
| `generation_prompt` | Current working prompt. Editable in admin panel. |
| `prompt_instructions` | Instructions for AI to auto-modify generation_prompt. |
| `ai_description` | Technical description for AI matching (machine-readable). |
| `user_description` | Human-readable description shown to users. |
| `qa_status` | QA validation result: `passed` / `failed` / `null`. |
| `accepted` | Manual approval: `true` / `false` / `null` (pending). |
| `is_active` | Whether scene is shown to users. `false` for mlm/wlw content. |
| `user_description_alt` | Alternative description shown to other gender. |
| `alt_for_gender` | Which gender sees `user_description_alt` instead of `user_description`. |
| `image_variants` | JSONB array of image variants for gallery. |
| `selected_variant_index` | Index of currently selected variant in gallery. |

**Indexes:**
- `idx_scenes_slug` - Unique slug lookup
- `idx_scenes_version` - Version filtering
- `idx_scenes_category` - Category filtering
- `idx_scenes_intensity` - Intensity filtering
- `idx_scenes_tags` - GIN index for tag search
- `idx_scenes_elements` - GIN index for elements
- `idx_scenes_ai_context` - GIN index for AI context
- `idx_scenes_accepted` - Acceptance status filtering

### scene_responses

Unified table for all scene responses (legacy V1 + V2 composite + onboarding).

```sql
CREATE TABLE scene_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,

  -- Scene identifier (denormalized for quick lookups)
  scene_slug TEXT,

  -- Response data
  liked BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  elements_selected TEXT[] DEFAULT '{}',
  follow_up_answers JSONB DEFAULT '{}',
  element_responses JSONB DEFAULT '{}',

  -- Question context
  question_asked TEXT,
  question_type TEXT,
  answer JSONB,
  profile_updates JSONB,

  -- Status
  skipped BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, scene_id)
);
```

**Indexes:**
- `idx_scene_responses_user` - User responses lookup
- `idx_scene_responses_scene` - Scene responses lookup
- `idx_scene_responses_slug` - Scene slug lookup
- `idx_scene_responses_element_responses` - GIN index for JSONB

> **Note:** `composite_scene_responses` was merged into this table (migration 021) and dropped (migration 033).

### tag_preferences

Aggregated tag preferences from scenes (V2 documentation).

```sql
CREATE TABLE tag_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tag_ref TEXT NOT NULL,  -- Reference to taxonomy tag
  
  interest_level INTEGER,  -- 0-100 aggregated from scenes
  role_preference TEXT CHECK (role_preference IN ('give', 'receive', 'both')),
  intensity_preference INTEGER CHECK (intensity_preference >= 0 AND intensity_preference <= 100),
  specific_preferences JSONB DEFAULT '{}',  -- Tag-specific details
  experience_level TEXT CHECK (experience_level IN ('tried', 'want_to_try', 'not_interested', 'curious')),
  
  source_scenes TEXT[] DEFAULT '{}',  -- Which scenes contributed (scene slugs)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, tag_ref)
);
```

**Indexes:**
- `idx_tag_preferences_user` - User lookup
- `idx_tag_preferences_tag` - Tag lookup
- `idx_tag_preferences_source_scenes` - GIN index for source scenes
- `idx_tag_preferences_specific_preferences` - GIN index for JSONB

---

## Body Map

### body_map_responses

Body map activity responses.

```sql
CREATE TABLE body_map_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  pass TEXT NOT NULL CHECK (pass IN ('give', 'receive')),
  zones_selected TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, activity_id, pass)
);
```

**Indexes:**
- `idx_body_map_user` - User lookup
- `idx_body_map_activity` - Activity lookup

---

## User State & Profiles

### user_flow_state

Discovery flow state tracking.

```sql
CREATE TABLE user_flow_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Computed scores
  tag_scores JSONB DEFAULT '{}',
  preferred_intensity DECIMAL(3,2) DEFAULT 2.0,
  give_receive_balance DECIMAL(3,2) DEFAULT 0.0,
  
  -- Progress
  calibration_complete BOOLEAN DEFAULT FALSE,
  seen_scenes TEXT[] DEFAULT '{}',
  seen_categories TEXT[] DEFAULT '{}',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_user_flow_state_user` - User lookup
- `idx_user_flow_state_tags` - GIN index for tag_scores

### user_discovery_profiles

Generated discovery profiles with archetypes.

```sql
CREATE TABLE user_discovery_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Archetypes
  primary_archetype TEXT,
  secondary_archetypes TEXT[] DEFAULT '{}',
  
  -- Tags
  top_tags JSONB DEFAULT '[]',
  bottom_tags JSONB DEFAULT '[]',
  exploration_zones JSONB DEFAULT '[]',
  
  -- Dynamics
  give_receive_balance DECIMAL(3,2) DEFAULT 0.0,
  preferred_intensity DECIMAL(3,2) DEFAULT 2.0,
  
  -- Insights
  matched_insights JSONB DEFAULT '[]',
  
  -- Progress
  completion_percentage INTEGER DEFAULT 0,
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_user_profiles_user` - User lookup
- `idx_user_profiles_archetype` - Archetype lookup

### psychological_profiles

Psychological profile data for signal tracking.

```sql
CREATE TABLE psychological_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Test scores: normalized 0-1 scores for each psychological test
  test_scores JSONB DEFAULT '{}',
  
  -- Profile signals: count/weight of each signal detected
  profile_signals JSONB DEFAULT '{}',
  
  -- Detected correlations between preferences
  correlations_detected JSONB DEFAULT '[]',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_psych_profiles_user` - User lookup
- `idx_psych_profiles_signals` - GIN index for profile_signals

---

## Categories & Exclusions

### categories

Category hierarchy for exclusions.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_categories_slug` - Slug lookup
- `idx_categories_parent` - Parent category lookup

### tag_categories

Tag to category mapping.

```sql
CREATE TABLE tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  relevance INTEGER DEFAULT 100,
  UNIQUE(tag, category_id)
);
```

**Indexes:**
- `idx_tag_categories_tag` - Tag lookup

### excluded_preferences

User exclusion preferences.

```sql
CREATE TABLE excluded_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  excluded_tag TEXT,
  exclusion_level TEXT DEFAULT 'hard' CHECK (exclusion_level IN ('soft', 'hard', 'temporary')),
  reason TEXT,
  excluded_at TIMESTAMPTZ DEFAULT NOW(),
  reconsider_after_days INTEGER,
  
  UNIQUE(user_id, category_id)
);
```

**Indexes:**
- `idx_excluded_user` - User exclusions lookup

---

## Discovery Config

### discovery_config

Configuration for discovery flow.

```sql
CREATE TABLE discovery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL CHECK (config_type IN ('flow_rules', 'profile_analysis', 'body_map', 'tag_taxonomy')),
  version INTEGER NOT NULL DEFAULT 2,
  data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(config_type, version)
);
```

**Indexes:**
- `idx_discovery_config_type` - Config type lookup
- `idx_discovery_config_active` - Active config lookup

---

## Dates & Proposals

### dates

Scheduled dates for partnerships.

```sql
CREATE TABLE dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE,
  initiator_id UUID REFERENCES profiles(id),
  scheduled_for TIMESTAMPTZ,
  mood TEXT CHECK (mood IN ('passionate', 'tender', 'playful', 'intense', 'surprise')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### date_responses

User responses to date proposals.

```sql
CREATE TABLE date_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id UUID REFERENCES dates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id),
  answer TEXT CHECK (answer IN ('yes', 'maybe', 'no')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date_id, user_id, scene_id)
);
```

### proposals

Hidden scene proposals between users.

```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id),
  dimension TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shown', 'answered')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Chat & Messages

### ai_messages

AI chat history.

```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### partner_chat_messages

Partner chat messages.

```sql
CREATE TABLE partner_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_partner_chat_user` - User/partner lookup

---

## Functions

### get_excluded_scene_ids(p_user_id UUID)

Returns array of scene IDs that should be excluded for a user based on their exclusion preferences.

```sql
CREATE OR REPLACE FUNCTION get_excluded_scene_ids(p_user_id UUID)
RETURNS UUID[] AS $$
-- Implementation in 011_finalize_v2.sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### get_next_scene_filtered(p_user_id UUID, p_intensity_max INTEGER)

Returns next scene ID for user with filtering applied (exclusions + seen scenes).

```sql
CREATE OR REPLACE FUNCTION get_next_scene_filtered(
  p_user_id UUID,
  p_intensity_max INTEGER DEFAULT 5
)
RETURNS UUID AS $$
-- Implementation in 011_finalize_v2.sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### validate_scene_slug(scene_slug TEXT)

Validates if a scene slug exists in the scenes table.

```sql
CREATE OR REPLACE FUNCTION validate_scene_slug(scene_slug TEXT)
RETURNS BOOLEAN AS $$
-- Implementation in 011_finalize_v2.sql
$$ LANGUAGE plpgsql IMMUTABLE;
```

### handle_new_user()

Trigger function for new user signup - creates initial records.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
-- Implementation in 005_scenes_v2_composite.sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### handle_new_user_psych()

Trigger function for creating psychological profile on profile creation.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_psych()
RETURNS TRIGGER AS $$
-- Implementation in 011_finalize_v2.sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### update_updated_at_column()

Generic function for updating `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
-- Implementation in 005_scenes_v2_composite.sql
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies. Key policies:

- **profiles**: Users can only access their own profile
- **scenes**: Public read access
- **scene_responses**: Users own their responses
- **composite_scene_responses**: Users own their responses
- **tag_preferences**: Users own their preferences
- **psychological_profiles**: Users own their profile
- **excluded_preferences**: Users own their exclusions
- **partnerships**: Members can view/update
- **dates**: Participants can view
- **proposals**: Recipients can view

See migration files for complete RLS policy definitions.

---

## Visual Onboarding

### onboarding_responses

Visual onboarding swipe responses (20 categories).

```sql
CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Category responses: NO = 0, YES = 1, VERY = 2
  responses JSONB NOT NULL DEFAULT '{}',
  -- Example: { "oral": 1, "anal": 0, "rough": 2, "romantic": 1 }

  -- Progress
  completed BOOLEAN DEFAULT FALSE,
  current_index INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);
```

**Indexes:**
- `idx_onboarding_responses_user` - User lookup

> **Note:** Gates are computed automatically and stored in `user_gates` table. See below.

> **Note on Response Values:**
> - `0` = NO (not interested)
> - `1` = YES (interested)
> - `2` = VERY (very interested)
> - `3` = PARTNER_REQUEST (would do if partner asks)

### orientation_wishlist

Collects user interest in unavailable orientations (gay/bi content).

```sql
CREATE TABLE orientation_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_orientation TEXT NOT NULL CHECK (
    requested_orientation IN ('gay_male', 'gay_female', 'bisexual')
  ),
  email TEXT,                     -- For non-logged users (future use)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, requested_orientation)
);
```

**Indexes:**
- `idx_wishlist_orientation` - Orientation lookup
- `idx_wishlist_created` - Created date lookup

**RLS Policies:**
- Users can insert/read their own entries
- Admin access via service role key (bypasses RLS)

### user_gates (Single Source of Truth)

Unified gates table. Auto-computed via triggers - **client should NOT compute gates**.

```sql
CREATE TABLE user_gates (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Gates from different sources (for debugging/transparency)
  onboarding_gates JSONB NOT NULL DEFAULT '{}',
  body_map_gates JSONB NOT NULL DEFAULT '{}',
  activity_gates JSONB NOT NULL DEFAULT '{}',  -- Reserved for future

  -- Combined gates (use this for queries!)
  gates JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Triggers:**
- `trg_recompute_gates_on_onboarding` - Fires on `onboarding_responses` INSERT/UPDATE
- `trg_recompute_gates_on_body_map` - Fires on `body_map_responses` INSERT/UPDATE/DELETE

**Usage:**
```sql
-- Get user's combined gates
SELECT gates FROM user_gates WHERE user_id = ?;

-- Check if scene is gated
SELECT is_scene_gated_v2(user_id, 'blowjob', ARRAY['oral'], 'AND', 'basic');
```

### Gates Functions

#### compute_gates_from_onboarding(p_responses JSONB)

Computes gate flags from onboarding responses.

```sql
CREATE OR REPLACE FUNCTION compute_gates_from_onboarding(p_responses JSONB)
RETURNS JSONB AS $$
-- Response values: NO=0, YES=1, VERY=2
-- Returns: { "oral": true, "oral_very": false, "show_bondage": true, ... }
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### compute_gates_from_body_map(p_user_id UUID)

Computes gate flags from body map selections.

```sql
CREATE OR REPLACE FUNCTION compute_gates_from_body_map(p_user_id UUID)
RETURNS JSONB AS $$
-- Returns: { "body_map_kiss_give": true, "body_map_lick_receive_genitals": true, ... }
$$ LANGUAGE plpgsql STABLE;
```

#### recompute_user_gates(p_user_id UUID)

Recomputes all gates for a user from all sources. Called automatically by triggers.

```sql
CREATE OR REPLACE FUNCTION recompute_user_gates(p_user_id UUID)
RETURNS VOID AS $$
-- Computes onboarding_gates, body_map_gates, merges them into gates
$$ LANGUAGE plpgsql;
```

#### is_scene_gated_v2(p_user_id, p_scene_slug, p_required_gates[], p_operator, p_level)

Checks if a scene is blocked for user based on their gates.

```sql
CREATE OR REPLACE FUNCTION is_scene_gated_v2(
  p_user_id UUID,
  p_scene_slug TEXT,
  p_required_gates TEXT[],      -- e.g., ARRAY['oral', 'rough']
  p_operator TEXT DEFAULT 'AND', -- 'AND' or 'OR'
  p_level TEXT DEFAULT 'basic'   -- 'basic' or 'very'
)
RETURNS BOOLEAN AS $$
-- Returns: true if scene is BLOCKED, false if ALLOWED
$$ LANGUAGE plpgsql STABLE;
```

---

## Migration Order

1. **005_scenes_v2_composite.sql** - Base V2 structure (FULL RESET)
2. **011_finalize_v2.sql** - Final additions:
   - Scene table updates (constraints, accepted field)
   - V2 composite tables (composite_scene_responses, tag_preferences)
   - Psychological profiles
   - Functions and triggers
3. **012_add_language_to_profiles.sql** - Language preference for profiles
4. **013_fix_excluded_scene_ids.sql** - Fix exclusion function
5. **014_cleanup_legacy_fields.sql** - Remove legacy V1 fields:
   - Drops: participants, dimensions, relevant_for, question_type, question_config, schema_version
   - Adds column comments for clarity
6. **015_visual_onboarding.sql** - Visual onboarding system:
   - onboarding_responses table
   - compute_onboarding_gates function (deprecated)
   - is_scene_gated function (deprecated)
   - visual_onboarding_completed flag on profiles
7. **016_security_fixes.sql** - Security improvements (search_path)
8. **017_onboarding_as_scenes.sql** - Onboarding categories as scenes
9. **018_onboarding_paired_with.sql** - Paired onboarding scenes
10. **019_unified_gates.sql** - Unified gates system:
    - user_gates table (single source of truth)
    - Triggers for auto-computing gates
    - compute_gates_from_onboarding, compute_gates_from_body_map functions
    - recompute_user_gates function
    - is_scene_gated_v2 function
11. **022_is_active_and_wishlist.sql** - Orientation wishlist:
    - `is_active` flag on scenes (for deactivating mlm/wlw content)
    - `orientation_wishlist` table for collecting interest
    - `get_orientation_wishlist_stats()` function
12. **023_dual_descriptions.sql** - Dual descriptions for M/F perspectives:
    - `user_description_alt` JSONB field on scenes
    - `alt_for_gender` field to specify which gender sees alt description
13. **024_extended_variants_and_partner_request.sql** - Gallery and partner request:
    - `selected_variant_index` on scenes for gallery
    - Updated `compute_gates_from_onboarding` to handle value 3 (PARTNER_REQUEST)
    - `get_scene_images()` helper function
14. **025_paired_scenes.sql** - Paired scenes (`paired_with` field)
15. **025_shared_images_with.sql** - Shared images between scenes
16. **026_admin_settings.sql** - Admin settings table
17. **027_openness_level.sql** - Openness level for profiles
18. **028_scene_types_v3.sql** - Scene types V3 (multi-modal scenes)
19. **029_expand_config_types.sql** - Expand discovery config types
20. **030_unified_scene_structure.sql** - Unify onboarding and regular scenes (`is_onboarding`, `for_gender`)
21. **031_image_analysis.sql** - Image analysis metadata
22. **032_drop_gates_scenes.sql** - Drop legacy gate scene references
23. **033_unified_architecture.sql** - Unified scene/response architecture:
    - `sets_gate`, `paired_scene` columns on scenes
    - Drop `composite_scene_responses` (merged into `scene_responses`)
    - Drop `onboarding_categories` table
    - Drop legacy onboarding columns from scenes
24. **034_drop_paired_with.sql** - Remove `paired_with` UUID column, use `paired_scene` slug

---

## Notes

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- JSONB fields are indexed with GIN indexes for fast queries
- Foreign keys use `ON DELETE CASCADE` for data consistency
- Unique constraints prevent duplicate entries
- RLS policies ensure data security at the database level
