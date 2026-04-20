// User & Profile Types
export interface Profile {
  id: string;
  gender: 'male' | 'female';
  interested_in: 'male' | 'female' | 'both';
  onboarding_completed: boolean;
  language?: 'en' | 'ru' | null;
  created_at: string;
  updated_at: string;
}

export interface PreferenceProfile {
  id: string;
  user_id: string;
  preferences: Record<string, unknown>;
  updated_at: string;
}

// Scene Types (V2 - cleaned up, no legacy fields)

/** Saved image variant for comparison */
export interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
  qa_score?: number;
  /** True if this is a placeholder slot awaiting image generation */
  is_placeholder?: boolean;
}

/**
 * Base Scene interface for V2 composite scenes.
 *
 * Key field distinctions:
 * - image_prompt: Default prompt from JSON files (reference for reset)
 * - generation_prompt: Current working prompt (editable in admin)
 * - prompt_instructions: AI instructions to auto-modify generation_prompt
 * - ai_description: Technical description for AI matching (machine-readable)
 * - user_description: Human-readable description shown to users
 */
export interface Scene {
  id: string;
  slug?: string;

  // Image fields
  image_url: string | null;
  /** Default image prompt from JSON files. Used as reference for resetting. */
  image_prompt?: string;
  /** Current working prompt for image generation. Editable in admin. */
  generation_prompt?: string;
  /** Saved image variants for comparison before choosing final one */
  image_variants?: ImageVariant[];

  // Content (localized)
  /** Technical description for AI matching (machine-readable) */
  ai_description: LocalizedString;
  /** Human-readable description shown to users */
  user_description?: LocalizedString;

  // Classification
  tags: string[];
  intensity: number;
  category?: string;
  priority?: number;

  created_at: string;

  // Admin workflow fields
  /** Instructions for AI to modify generation_prompt automatically */
  prompt_instructions?: string;
  /** QA validation status: passed/failed */
  qa_status?: 'passed' | 'failed' | null;
  /** Number of QA validation attempts */
  qa_attempts?: number;
  /** Last QA assessment details */
  qa_last_assessment?: Record<string, unknown>;
  /** Manual image approval: true=approved, false=rejected, null=pending */
  accepted?: boolean | null;

  // Activation & visibility
  /** Whether scene is active and should be shown. False for mlm/wlw until content ready */
  is_active?: boolean;

  // Dual descriptions (same image, different perspectives for M/F)
  /** Alternative description for opposite gender perspective */
  user_description_alt?: LocalizedString;
  /** Which gender sees user_description_alt ('male' or 'female'). Null = no alternative */
  alt_for_gender?: 'male' | 'female' | null;

  // Gallery/variants
  /** Index of currently selected variant. 0 = main image_url, 1+ = image_variants[index-1] */
  selected_variant_index?: number;

  // Scene pairing (give/receive perspectives share same images)
  /** Slug of paired scene (same situation, different perspective). */
  paired_scene?: string;
  /** @deprecated Use paired_scene instead. UUID of paired scene. */
  paired_with?: string;

  // Cross-category image sharing (e.g., onboarding/foot ↔ worship-service/foot-worship)
  /** UUID of scene from different category that shares the same images. */
  shared_images_with?: string;

  // Question type (for virtual scenes like body_map)
  /** Type of question/interaction for this scene */
  question_type?: 'scale' | 'multiple_choice' | 'yes_no' | 'trinary' | 'body_map';

  // Virtual scene properties (used for body_map scenes created on-the-fly)
  /** Scene version (1 for legacy, 2 for V2) */
  version?: number;
  /** Localized title for display */
  title?: LocalizedString;
  /** Localized subtitle for display */
  subtitle?: LocalizedString;
  /** Dimensions array for legacy scenes */
  dimensions?: string[];
  /** Question configuration for body_map scenes */
  question_config?: Record<string, unknown>;
  /** AI context for body_map scenes */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ai_context?: any;
}

// Question Types
export type AnswerType = 'scale' | 'multiple_choice' | 'yes_no' | 'trinary' | 'body_map';

export interface QuestionOption {
  id: string;
  text: string;
  dimension: string;
}

export interface GeneratedQuestion {
  question: string;
  answerType: AnswerType;
  scaleLabels?: { min: string; max: string };
  options?: QuestionOption[];
  allowMultiple?: boolean;
  targetDimensions: string[];
}

// Answer Types
export interface ScaleAnswer {
  value: number;
}

export interface MultipleChoiceAnswer {
  selected: string[];
}

export interface YesNoAnswer {
  value: boolean;
}

export interface TrinaryAnswer {
  value: 'yes' | 'maybe' | 'no';
}

// ============================================
// BODY MAP TYPES
// ============================================

// Actions that can be performed on body zones
export type BodyAction =
  | 'kiss'           // Целовать
  | 'lick_suck'      // Лизать/сосать
  | 'light_slap'     // Легонько шлёпать
  | 'spank'          // Пороть
  | 'bite_scratch'   // Кусать/царапать
  | 'squeeze_twist'; // Сжимать/крутить

// User preference for a body zone
export type ZonePreference = 'love' | 'sometimes' | 'no';

// Body zone identifiers
export type BodyZoneId =
  // Face
  | 'lips'
  | 'cheeks'
  | 'ears'
  | 'hair'
  | 'nape'
  // Neck
  | 'neck'
  // Chest/torso
  | 'nipples'
  | 'chest'
  | 'belly'
  // Arms
  | 'shoulders'
  | 'hands'
  | 'fingers'
  // Back
  | 'upper_back'
  | 'lower_back'
  // Buttocks
  | 'buttocks'
  // Male genitals
  | 'penis'
  | 'testicles'
  // Female genitals
  | 'vulva'
  | 'clitoris'
  // Anus
  | 'anus'
  // Legs
  | 'inner_thighs'
  | 'feet';

// Body view (front or back)
export type BodyView = 'front' | 'back';

// Gender for silhouette display
export type BodyGender = 'male' | 'female';

// Single zone marking
export interface BodyZoneMarking {
  zoneId: BodyZoneId;
  preference: ZonePreference;
  // For marker-based input (AI will interpret position)
  position?: { x: number; y: number };
}

// Raw marker data grouped by preference
export interface RawMarkers {
  love: Array<{ x: number; y: number }>;
  sometimes: Array<{ x: number; y: number }>;
  no: Array<{ x: number; y: number }>;
}

// Zone+Action preference (for zone-first mode)
export interface ZoneActionPreference {
  actionId: string;
  preference: ZonePreference;
}

// All preferences for a single zone
export type ZoneActionPreferences = Record<string, ZonePreference | null>;

// All zone preferences for a complete answer
export type AllZonePreferences = Record<string, ZoneActionPreferences>;

// One pass answer (for one action, one subject)
export interface BodyMapPassAnswer {
  action: BodyAction;
  subject: 'give' | 'receive';
  markings: BodyZoneMarking[];
  // New marker-based fields
  rawMarkers?: RawMarkers;
  view?: BodyView;
  gender?: BodyGender;
  // Zone-first mode: zone+action preferences
  zoneActionPreferences?: AllZonePreferences;
}

// Full body map answer
export interface BodyMapAnswer {
  passes: BodyMapPassAnswer[];
}

// Body map scene configuration
export interface BodyMapSceneConfig {
  action: BodyAction;
  passes: Array<{
    subject: 'give' | 'receive';
    question: LocalizedString;
  }>;
  availableZones?: BodyZoneId[];
}

export type Answer = ScaleAnswer | MultipleChoiceAnswer | YesNoAnswer | TrinaryAnswer | BodyMapAnswer;

// Response Types
export interface SceneResponse {
  id: string;
  user_id: string;
  scene_id: string;
  question_asked: string;
  question_type: AnswerType;
  answer: Answer;
  profile_updates: Record<string, unknown> | null;
  created_at: string;
}

// Partnership Types
export interface Partnership {
  id: string;
  user_id: string;
  partner_id: string;
  inviter_id: string;
  invite_code: string | null;
  nickname: string | null;
  status: 'pending' | 'active' | 'declined';
  created_at: string;
}

// Proposal Types
export interface Proposal {
  id: string;
  from_user_id: string;
  to_user_id: string;
  scene_id: string | null;
  dimension: string | null;
  status: 'pending' | 'shown' | 'answered';
  created_at: string;
}

// Date Types
export type DateMood = 'passionate' | 'tender' | 'playful' | 'intense' | 'surprise';

export interface DateSession {
  id: string;
  partnership_id: string;
  initiator_id: string;
  scheduled_for: string | null;
  mood: DateMood | null;
  status: 'pending' | 'ready' | 'completed' | 'canceled';
  created_at: string;
}

export interface DateResponse {
  id: string;
  date_id: string;
  user_id: string;
  scene_id: string;
  answer: 'yes' | 'maybe' | 'no';
  created_at: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: 'free' | 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string | null;
  created_at: string;
}

// AI Message Types
export interface AIMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Match Result Types
export interface MatchResult {
  dimension: string;
  myValue: number;
  partnerValue: number;
  visibility: 'match' | 'partner_no' | 'hidden';
}

// Scene Source Types
export interface SceneSource {
  type: 'organic' | 'proposal' | 'partner_interest' | 'deepening';
  weight: number;
  scene: Scene;
}

// User Context for AI
export interface UserContext {
  gender: string;
  interestedIn: string;
  knownPreferences: Record<string, unknown>;
  recentResponses: SceneResponse[];
}

// ============================================
// V3 SCENE TYPES - Psychological Profiling
// ============================================

export type Locale = 'en' | 'ru';

export interface LocalizedString {
  en: string;
  ru: string;
}

// What psychological aspects this scene tests
export interface SceneTest {
  primary_kink: string;
  secondary_kinks: string[];
  power_dynamic: string;
  gender_role_aspect: string;
}

// Emotional responses expected from this scene
export interface EmotionalRange {
  positive: string[];
  negative: string[];
  curious: string[];
}

// Signals to track based on user response
export interface ProfileSignals {
  if_positive: string[];
  if_negative: string[];
  if_curious: string[];
}

// Correlation patterns
export interface Correlations {
  positive: string[];
  negative: string[];
}

// Taboo/sensitive topic handling
export interface TabooContext {
  level: 1 | 2 | 3 | 4 | 5;
  common_concerns: string[] | null;
  normalization: string | null;
}

// Full AI context for psychological profiling
export interface AIContext {
  description: string;
  tests: SceneTest;
  question_angles: Record<string, string>;
  emotional_range: EmotionalRange;
  profile_signals: ProfileSignals;
  correlations: Correlations;
  taboo_context: TabooContext;
}

// Follow-up question option
export interface FollowUpOption {
  id: string;
  label: LocalizedString;
  signal: string;
}

// Conditional follow-up question
export interface FollowUp {
  trigger: 'if_positive' | 'if_negative' | 'if_curious';
  detail_type: string;
  question: LocalizedString;
  options: FollowUpOption[];
}

// V3 Scene with full psychological profiling support
export interface SceneV3 {
  id: string;
  slug: string;
  priority: number;
  intensity: number;
  version?: number;
  category?: string;
  tags?: string[];
  title: LocalizedString;
  subtitle?: LocalizedString;
  image_url?: string | null;
  image_variants?: ImageVariant[] | null;
  generation_prompt?: string;
  user_description: LocalizedString;
  ai_description?: LocalizedString;
  ai_context: AIContext;
  question_type?: string;
  follow_up?: FollowUp | null;
  body_map_config?: BodyMapSceneConfig | null;
  created_at: string;
}

// Psychological profile for user
export interface PsychologicalProfile {
  id: string;
  user_id: string;
  test_scores: Record<string, number>;
  profile_signals: Record<string, number>;
  correlations_detected: string[];
  updated_at: string;
}

// Follow-up response record
export interface FollowUpResponse {
  id: string;
  user_id: string;
  scene_id: string;
  parent_response_id: string;
  option_id: string;
  profile_signal: string;
  created_at: string;
}

// ============================================
// V4 SCENE TYPES - Question Config System
// ============================================

// Question config types
export type QuestionConfigType = 'scale' | 'yes_maybe_no' | 'topic_drilldown' | 'what_appeals' | 'body_map';

// Context option for what_appeals type
export interface ContextOption {
  id: string;
  label: LocalizedString;
}

// Base question config
export interface QuestionConfigBase {
  type: QuestionConfigType;
  question: LocalizedString;
  topic_ref?: string;
  show_experience?: boolean;
}

// Scale question (0-100)
export interface ScaleQuestionConfig extends QuestionConfigBase {
  type: 'scale';
}

// Yes/Maybe/No question
export interface YesMaybeNoQuestionConfig extends QuestionConfigBase {
  type: 'yes_maybe_no';
}

// Topic drilldown question (links to preference-topics.json)
export interface TopicDrilldownQuestionConfig extends QuestionConfigBase {
  type: 'topic_drilldown';
  topic_ref: string; // Required for this type
}

// What appeals question (multi-choice with scene-specific options)
export interface WhatAppealsQuestionConfig extends QuestionConfigBase {
  type: 'what_appeals';
  context_options: ContextOption[];
}

// Body map question (interactive body zone selection)
export interface BodyMapQuestionConfig extends Omit<QuestionConfigBase, 'question'> {
  type: 'body_map';
  action: BodyAction;
  passes: Array<{
    subject: 'give' | 'receive';
    question: LocalizedString;
  }>;
}

// Union type for all question configs
export type QuestionConfig =
  | ScaleQuestionConfig
  | YesMaybeNoQuestionConfig
  | TopicDrilldownQuestionConfig
  | WhatAppealsQuestionConfig
  | BodyMapQuestionConfig;

// V4 AI Context (simplified - no question_angles)
export interface AIContextV4 {
  description: string;
  tests: SceneTest;
  emotional_range?: EmotionalRange;
  profile_signals?: ProfileSignals;
  taboo_context?: TabooContext;
}

// V4 Scene with question_config
export interface SceneV4 {
  id: string;
  slug: string;
  priority: number;
  schema_version: 4;
  intensity: number;
  version?: number;
  category?: string;
  tags?: string[];
  title: LocalizedString;
  subtitle?: LocalizedString;
  image_url?: string | null;
  image_variants?: ImageVariant[] | null;
  generation_prompt?: string;
  user_description: LocalizedString;
  ai_description?: LocalizedString;
  question_config: QuestionConfig;
  ai_context: AIContextV4;
  participants: string[];
  follow_up?: FollowUp | null;
  body_map_config?: BodyMapSceneConfig | null;
  created_at: string;
}

// Topic response record
export interface TopicResponse {
  id: string;
  user_id: string;
  topic_ref: string;
  interest_level: number;
  drilldown_responses: Record<string, unknown>;
  experience: {
    tried?: boolean;
    frequency?: string;
    want_to_try?: boolean;
  } | null;
  first_scene_id: string | null;
  created_at: string;
  updated_at: string;
}

// Experience response record
export interface ExperienceResponse {
  id: string;
  user_id: string;
  scene_id: string;
  has_tried: boolean;
  experience_rating: 'loved' | 'liked' | 'neutral' | 'disliked' | null;
  want_to_try: boolean | null;
  created_at: string;
}

// V2 Question response (replaces V3/V4)
export interface V2QuestionResponse {
  question: GeneratedQuestion;
  scene: SceneV2;
  isV2: boolean;
  selectedElements?: string[]; // For element selection
}

// Signal update for psychological profiling (still used for V2)
export interface SignalUpdate {
  signal: string;
  weight: number;
}

// ============================================
// V2 SCENE TYPES - Composite Scenes
// ============================================

// V2 Conditional display for follow-ups
export interface V2ShowIf {
  /** Show if these elements were selected */
  element_selected?: string[];
  /** Show if previous answer contains these values */
  answer_contains?: string[];
  /** Show if interest level is within range (0-100) */
  interest_level?: {
    min?: number;
    max?: number;
  };
}

// V2 Element follow-up
export interface V2FollowUp {
  id: string;
  type: 'multi_select' | 'single_select' | 'scale' | 'text' | 'image_select' | 'text_input' | 'text_with_suggestions' | 'intensity' | 'role' | 'experience' | 'body_map';
  question: LocalizedString;
  /** Conditional display based on previous responses */
  show_if?: V2ShowIf;
  /** Nested follow-ups (Level 3 drilldown) */
  follow_ups?: V2FollowUp[];
  config: {
    // For multi_select, single_select
    options?: Array<{
      id: string;
      label: LocalizedString;
      image_url?: string; // For image_select
      /** Nested drilldown for this option */
      drilldown?: V2FollowUp;
    }>;
    min?: number;
    max?: number;
    // For text_input
    placeholder?: LocalizedString;
    // For text_with_suggestions
    suggestions?: Array<{
      label: LocalizedString;
      examples?: LocalizedString;
    }>;
    // For intensity, scale
    labels?: {
      min?: LocalizedString;
      max?: LocalizedString;
    };
    // For role
    role_options?: Array<{
      id: 'give' | 'receive' | 'both';
      label: LocalizedString;
    }>;
    // For experience
    experience_options?: Array<{
      id: 'tried' | 'want_to_try' | 'fantasy_only' | 'not_interested';
      label: LocalizedString;
    }>;
    /** Allow custom text input in multi_select/single_select */
    allow_custom?: boolean;
  };
}

// V2 Element (selectable aspect of the scene)
export interface V2Element {
  id: string;
  label: LocalizedString;
  tag_ref: string;
  follow_ups?: V2FollowUp[];
}

// V2 Question
export interface V2Question {
  type: 'multi_select' | 'single_select' | 'scale' | 'yes_no';
  text: LocalizedString;
  min_selections?: number;
  max_selections?: number;
}

// V2 AI Context
export interface V2AIContext {
  tests_primary: string[];
  tests_secondary: string[];
}

/**
 * V2 Scene with composite elements structure.
 *
 * This is the primary scene type for the discovery flow.
 * Elements contain tag_ref and follow_ups for detailed preference mapping.
 */
export interface SceneV2 extends Scene {
  slug: string;
  version: 2;

  // Direction (replaces legacy participants/relevant_for)
  role_direction: 'm_to_f' | 'f_to_m' | 'mutual' | 'solo' | 'group' | 'universal';

  // Content (localized)
  title: LocalizedString;
  subtitle?: LocalizedString;

  // Classification
  category: string;

  // V2 structure
  elements: V2Element[];
  question?: V2Question;
  ai_context: V2AIContext & {
    gates?: Record<string, string[]>;
  };

  // Legacy field (still editable in admin)
  follow_up?: V2FollowUp[] | null;

  /** Gate to set when user responds YES/VERY on this scene */
  sets_gate?: string;
}

// ============================================
// SCENE TYPE SYSTEM (NEW ARCHITECTURE)
// ============================================

/**
 * Scene types for special rendering (non-swipe scenes).
 *
 * Regular scenes have scene_type = null and use swipe cards.
 * Special scene types use different UI components.
 */
export type SceneType =
  | 'multi_choice_text'   // Text selection + custom "Other" input (no image)
  | 'image_selection'     // Selection from multiple small images
  | 'body_map_activity'   // Body map for specific activity
  | 'paired_text'         // Paired text questions (no image)
  | 'scale_text';         // Scale question without image

/**
 * Context where scene should be shown
 */
export type SceneContext = 'onboarding' | 'discovery' | 'both';

/**
 * Extended SceneV2 with new scene type fields.
 * This adds scene_type and clarification_for without breaking existing structure.
 */
export interface SceneV2Extended extends SceneV2 {
  /** Type of scene - determines flow behavior. Defaults to 'composite' for existing scenes. */
  scene_type?: SceneType;

  /** For clarification scenes - which main_question(s) this clarifies */
  clarification_for?: string[];  // Array of main_question slugs

  /** Where this scene should be shown */
  context?: SceneContext;

  /** For body_map_activity - activity configuration */
  body_map_activity_config?: {
    activity: string;  // 'spanking', 'kissing', etc.
    question: LocalizedString;
  };

  /** For paired_text - two related questions */
  paired_questions?: {
    give: LocalizedString;
    receive: LocalizedString;
  };

  /** For image_selection - small image options */
  image_options?: Array<{
    id: string;
    image_url: string;
    label?: LocalizedString;
    tag_ref?: string;
  }>;

  /** For multi_choice_text - options with topic refs */
  text_options?: Array<{
    id: string;
    label: LocalizedString;
    topic_ref?: string;
  }>;

  /** Allow custom "Other" input for multi_choice_text */
  allow_other?: boolean;
  other_placeholder?: LocalizedString;
}

/**
 * Intro slide shown before clarification scenes.
 * Generated at runtime, not stored in DB.
 */
export interface IntroSlide {
  main_question_slug: string;
  main_question_title: LocalizedString;
  image_url: string;
  image_variants?: Array<{ url: string }>;  // Additional image variants for carousel
  intro_text: LocalizedString;  // "Тебе нравится X. Давай узнаем больше."
  clarification_count: number;
}

/**
 * Tracks which clarifications have been shown to prevent duplicates.
 */
export interface ClarificationTracking {
  user_id: string;
  clarification_slug: string;
  triggered_by_main: string;  // First main_question that triggered it
  shown_at: string;
}

// ============================================
// ONBOARDING RESPONSE TYPES
// ============================================

/**
 * Onboarding swipe response values:
 * - 0 = NO (swipe left) - Not interested
 * - 1 = YES (swipe right) - Interested
 * - 2 = VERY (swipe up) - Very interested
 * - 3 = PARTNER_REQUEST (swipe down) - Would do if partner asks
 */
export type OnboardingResponseValue = 0 | 1 | 2 | 3;

/** Onboarding responses stored in DB */
export interface OnboardingResponses {
  user_id: string;
  /** Category responses: key is category slug, value is 0-3 */
  responses: Record<string, OnboardingResponseValue>;
  completed: boolean;
  current_index: number;
  created_at: string;
  updated_at: string;
}
